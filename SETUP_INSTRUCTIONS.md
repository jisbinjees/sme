SME Dashboard — Setup Instructions
=================================

Prerequisites
-------------
- Node.js (v16+ recommended) and npm
- Python 3.10+ and virtualenv (for PDF extraction)
- Git (optional)

Quick start (backend + frontend)
--------------------------------
1. Open a terminal and change to the `sme` directory:

```powershell
cd C:\Users\91954\Desktop\Jis\sme
```

2. Install Node dependencies:

```powershell
npm install
```

3. Start the Node server (serves the frontend and API on port 3001):

```powershell
node server.js
# Server prints: SME dashboard running on http://localhost:3001
```

4. Open the dashboard in a browser:

http://localhost:3001

PDF extraction (optional)
-------------------------
If you need to regenerate `data/companies_extracted.json` from the PDF, follow these steps.

1. Create and activate a Python virtual environment (Windows PowerShell example):

```powershell
python -m venv venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
& .\venv\Scripts\Activate.ps1
```

2. Install Python dependencies:

```powershell
pip install -r requirements.txt
```

3. Run the extractor (replace `<pdf-file>` and output path as needed):

```powershell
python pdf_to_json.py info-list-of-sme-companies.pdf data/companies_extracted.json
```

Notes & troubleshooting
-----------------------
- If PowerShell's script execution policy prevents `npm` or virtualenv activation, either run the `node` command directly as shown above or temporarily allow script execution (the commands above set policy for the current session).
- The API endpoints:
  - `GET /api/filters` — returns filter lists and numeric ranges
  - `GET /api/companies?industry=...&country=...&income=min-max...` — queries companies; at least one filter must be supplied
- The numeric range options (income, revenue, employees) are generated from the extracted JSON; if few records contain numeric values, ranges may be sparse.
- To change server port, set environment variable `PORT` before starting: `PORT=4000 node server.js` (PowerShell: `$env:PORT=4000; node server.js`).

Contact
-------
If you need me to package this into a Docker container or create a simple `start.bat` that starts both extractor (optional) and server, tell me which OS and I'll add it.
