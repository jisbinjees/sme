const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const EXTRACTED = path.join(DATA_DIR, 'companies_extracted.json');
const FALLBACK = path.join(DATA_DIR, 'companies.json');

function tryReadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

function asNumber(s) {
  if (s === undefined || s === null) return null;
  if (typeof s === 'number') return s;
  const t = String(s).trim();
  if (!t || t === '--' || t === '—') return null;
  const cleaned = t.replace(/[^0-9.\-]/g, '');
  const n = Number(cleaned);
  if (Number.isNaN(n)) return null;
  return n;
}

function loadRaw() {
  let raw = tryReadJson(EXTRACTED) || tryReadJson(FALLBACK) || [];
  return raw;
}

function normalize(record) {
  const r = {};
  // name
  r.name = record['Company Name'] || record['company name'] || record.name || null;
  // basic fields
  r.industry = record['Industry'] || record.industry || null;
  r.country = record['HQ Country'] || record['HQ'] || record.country || null;
  r.state = record['State'] || record.state || null;
  // income/revenue in millions -> convert to Number (million units)
  r.income = asNumber(record['Income ($\nmillion)'] || record['Income ($million)'] || record['Income'] || record.income);
  r.revenue = asNumber(record['Revenue ($\nmillion)'] || record['Revenue ($million)'] || record['Revenue'] || record.revenue);
  r.employees = asNumber(record['Total\nEmployees'] || record['Total Employees'] || record['employees'] || record.employees);
  // preserve raw for debug
  r._raw = record;
  return r;
}

function loadCompanies() {
  const raw = loadRaw();
  return raw.map(normalize);
}

function uniqueSorted(arr) {
  return [...new Set(arr.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
}

// Return available filters derived from data
app.get('/api/filters', (req, res) => {
  const companies = loadCompanies();
  const industries = uniqueSorted(companies.map(c=>c.industry));
  const countries = uniqueSorted(companies.map(c=>c.country));
  const states = uniqueSorted(companies.map(c=>c.state));
  // build numeric ranges for income, revenue, employees based on data quantiles
  function makeBuckets(values, buckets=5, isEmployees=false) {
    const nums = values.filter(v=>typeof v==='number' && !Number.isNaN(v)).sort((a,b)=>a-b);
    if (!nums.length) return [];
    const edges = [];
    for (let i=0;i<=buckets;i++) {
      const idx = Math.floor(i * (nums.length-1) / buckets);
      edges.push(nums[idx]);
    }
    const ranges = [];
    for (let i=0;i<edges.length-1;i++){
      const a = edges[i];
      const b = edges[i+1];
      // normalize numbers
      const min = Number.isFinite(a) ? Math.round(a*10)/10 : a;
      const max = Number.isFinite(b) ? Math.round(b*10)/10 : b;
      if (Number.isNaN(min) || Number.isNaN(max)) continue;
      // skip duplicates
      const value = `${min}-${max}`;
      if (ranges.find(r=>r.value===value)) continue;
      const fmt = (n) => {
        if (n === null || n === undefined) return '-';
        if (isEmployees) return String(Math.round(n));
        // for income/revenue show with suffix M and one decimal if needed
        const abs = Math.abs(n);
        if (abs >= 1000) return (Math.round(n)).toLocaleString();
        return (Math.round(n*10)/10).toString() + 'M';
      };
      ranges.push({ value, label: `${fmt(min)} — ${fmt(max)}` , min, max });
    }
    return ranges;
  }

  const incomes = companies.map(c=>c.income).filter(v=>v!==null);
  const revenues = companies.map(c=>c.revenue).filter(v=>v!==null);
  const employees = companies.map(c=>c.employees).filter(v=>v!==null);

  const incomeRanges = makeBuckets(incomes, 5, false);
  const revenueRanges = makeBuckets(revenues, 5, false);
  const employeeRanges = makeBuckets(employees, 5, true);

  res.json({ industries, countries, states, incomeRanges, revenueRanges, employeeRanges });
});

// Query companies - requires at least one filter; otherwise return empty results
app.get('/api/companies', (req, res) => {
  const q = req.query;
  // allowed filters
  const { industry, country, state } = q;
  // support new single-range filters like income=low-high
  const parseRange = s => {
    if (!s) return [null,null];
    const str = String(s).trim();
    // match two numbers like "-5731--22.5" or "8-20" or single number "10"
    const two = str.match(/^\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (two) return [Number(two[1]), Number(two[2])];
    const one = str.match(/^-?\d+(?:\.\d+)?$/);
    if (one) return [Number(str), Number(str)];
    return [null, null];
  };
  const [min_income, max_income] = parseRange(q.income);
  const [min_revenue, max_revenue] = parseRange(q.revenue);
  const [min_employees, max_employees] = parseRange(q.employees);

  const supplied = Object.keys(q).length > 0;
  if (!supplied) return res.json({ count: 0, results: [] });

  let results = loadCompanies().filter(c => {
    if (industry && industry !== 'All' && String(c.industry) !== String(industry)) return false;
    if (country && country !== 'All' && String(c.country) !== String(country)) return false;
    if (state && state !== 'All' && String(c.state) !== String(state)) return false;

    if (min_income !== null && (c.income === null || c.income < min_income)) return false;
    if (max_income !== null && (c.income === null || c.income > max_income)) return false;

    if (min_revenue !== null && (c.revenue === null || c.revenue < min_revenue)) return false;
    if (max_revenue !== null && (c.revenue === null || c.revenue > max_revenue)) return false;

    if (min_employees !== null && (c.employees === null || c.employees < min_employees)) return false;
    if (max_employees !== null && (c.employees === null || c.employees > max_employees)) return false;

    return true;
  });

  res.json({ count: results.length, results });
});

// static frontend
app.use('/', express.static(path.join(__dirname, 'frontend')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, ()=> console.log(`SME dashboard running on http://localhost:${PORT}`));
