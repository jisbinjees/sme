#!/usr/bin/env python3
"""Extract tables or structured lines from a PDF into JSON.

Usage: python pdf_to_json.py input.pdf output.json

This script uses pdfplumber to look for tables on each page. If tables are
found, it uses the first table as header+rows. If no tables are found, it
falls back to extracting text lines and attempting a naive parse.
"""
import sys
import json
from pathlib import Path

try:
    import pdfplumber
except Exception as e:
    print('Missing pdfplumber; install with: pip install -r requirements.txt')
    raise


def tables_to_dicts(table):
    if not table:
        return []
    header = [h.strip() if h else f'col{i}' for i, h in enumerate(table[0])]
    rows = []
    for r in table[1:]:
        obj = {}
        for i, cell in enumerate(r):
            key = header[i] if i < len(header) else f'col{i}'
            obj[key] = cell.strip() if isinstance(cell, str) else cell
        rows.append(obj)
    return rows


def extract(input_pdf: Path):
    results = []
    with pdfplumber.open(str(input_pdf)) as pdf:
        for page in pdf.pages:
            # try tables
            try:
                tables = page.extract_tables()
            except Exception:
                tables = []
            if tables:
                for t in tables:
                    dicts = tables_to_dicts(t)
                    if dicts:
                        results.extend(dicts)
                continue

            # fallback to lines
            text = page.extract_text() or ''
            for line in (text.splitlines()):
                line = line.strip()
                if not line:
                    continue
                # naive split: if line contains commas, split; else keep as raw
                if ',' in line:
                    parts = [p.strip() for p in line.split(',') if p.strip()]
                    # heuristics: common fields -- try to map to name, industry, country
                    if len(parts) >= 4:
                        obj = {
                            'name': parts[0],
                            'industry': parts[1],
                            'country': parts[2],
                            'state': parts[3]
                        }
                        # optional numeric fields
                        if len(parts) > 4:
                            try:
                                obj['revenue'] = int(parts[4].replace('$','').replace(',', ''))
                            except Exception:
                                obj['extra'] = parts[4:]
                        results.append(obj)
                    else:
                        results.append({'raw': line})
                else:
                    results.append({'raw': line})
    return results


def main():
    if len(sys.argv) < 3:
        print('Usage: python pdf_to_json.py input.pdf output.json')
        sys.exit(1)
    inp = Path(sys.argv[1])
    out = Path(sys.argv[2])
    if not inp.exists():
        print('Input PDF not found:', inp)
        sys.exit(1)

    extracted = extract(inp)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open('w', encoding='utf8') as f:
        json.dump(extracted, f, ensure_ascii=False, indent=2)
    print(f'Wrote {len(extracted)} records to {out}')


if __name__ == '__main__':
    main()
