# SME Dashboard

A minimal Node.js backend + static frontend to explore SME companies by industry, country/state, income, revenue and employee count.

Quick start (PowerShell):

```powershell
cd sme
npm install
npm start
# Then open http://localhost:3000
```

Python PDF extractor (optional):

```powershell
cd sme
python -m pip install -r requirements.txt
python pdf_to_json.py C:\path\to\info-list-of-sme-companies.pdf data/companies_extracted.json
```

Files created:
- `server.js` - Node/Express server and API
- `data/companies.json` - sample dataset
- `frontend/` - static UI files (`index.html`, `app.js`)
- `pdf_to_json.py` - helper script to extract tables/text from a PDF to JSON
