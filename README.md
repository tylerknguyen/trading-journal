# Trading Journal

A local-first trading journal and portfolio tracker inspired by the workflow of professional trading dashboards. It supports Webull option-order CSV imports, Webull API sync, daily P&L analytics, calendar/day views, per-trade journaling, rule tracking, and trade detail pages.

The app runs on your own computer. Trades and journal entries are stored in your browser local storage, and Webull API keys stay on the local Python server instead of being exposed to frontend code.

## Features

- Dashboard metrics: net P&L, trade win rate, profit factor, day win rate, average win/loss.
- Charts for cumulative P&L, daily net P&L, account balance, drawdown, trade time performance, and duration performance.
- Calendar with day-level P&L, trade counts, win rates, and clickable daily trade detail modal.
- Daily AI-style insights generated from your local trade data.
- Recent trades and open positions tables.
- Journal page with saved notes, strategy, setup, emotion, mistake, and lesson fields.
- Trade detail page with executions, stats, notes, running P&L, and TradingView chart embed.
- CSV import for Webull option order exports.
- Webull API sync through a local Python backend.
- Double-click Windows launcher.

## Quick Start On Windows

1. Download or clone the repo.
2. Double-click `Launch Trading Journal.bat`.
3. Open `http://127.0.0.1:5173/` if the browser does not open automatically.

The launcher creates a local `.venv`, installs dependencies, starts the server, and opens the app. Leave the launcher window open while using the app. Press `Ctrl+C` in that window to stop it.

## Firebase Hosting

The frontend can be hosted on Firebase Hosting as a static app. Static hosting supports CSV upload, charts, calendar views, journaling, and local browser storage.

Webull API sync is not available from Firebase Hosting alone because broker API keys require a secure backend. For hosted Webull sync, add Firebase Functions or another backend service later.

To deploy the static frontend:

1. Install the Firebase CLI:

```powershell
npm install -g firebase-tools
```

2. Log in:

```powershell
firebase login
```

3. Create a Firebase project in the Firebase console.

4. Copy `.firebaserc.example` to `.firebaserc` and replace `your-firebase-project-id` with your project ID.

```powershell
copy .firebaserc.example .firebaserc
```

5. Deploy:

```powershell
firebase deploy --only hosting
```

The included `firebase.json` deploys only the static frontend files and excludes `.env`, logs, local SDK token cache, virtualenv files, and the Python Webull backend.

## Manual Setup

Python 3.10 or 3.11 is recommended.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe server.py
```

Then open:

```text
http://127.0.0.1:5173/
```

## Webull API Sync

Webull sync is handled by `server.py` so API keys stay on your computer and never go into `app.js`, `index.html`, or browser storage.

1. Copy `.env.example` to `.env`.

```powershell
copy .env.example .env
```

2. Open `.env` and add your own credentials:

```env
WEBULL_APP_KEY=your_app_key_here
WEBULL_APP_SECRET=your_app_secret_here
WEBULL_REGION=us
WEBULL_API_ENDPOINT=api.webull.com
WEBULL_ACCOUNT_ID=
PORT=5173
```

3. Start the app:

```powershell
.\.venv\Scripts\python.exe server.py
```

4. Click `Sync Webull` in the dashboard.

If Webull returns `Pending Verification`, approve the verification prompt in the Webull app or SMS, then click `Sync Webull` again.

Notes:

- Keep `WEBULL_API_ENDPOINT=api.webull.com`; do not include `https://`.
- `WEBULL_ACCOUNT_ID` is optional. If omitted, the sync server tries to use the first account returned by the SDK.
- Webull order-history windows can be limited, so CSV import is still useful for backfilling older trades.
- Do not commit `.env`, `conf/`, logs, or local token files. They are ignored by `.gitignore`.

## CSV Import

Use `Upload CSV` in the dashboard. The importer supports Webull option-order exports and common trade-history headers, including:

- `Close Date`, `Date`, `Trade Date`, `Filled Time`
- `Symbol`, `Ticker`, `Underlying`, `Instrument`
- `Side`, `Action`, `Direction`
- `Quantity`, `Qty`, `Shares`, `Filled Qty`
- `Net P&L`, `P&L`, `Realized P&L`, `Profit/Loss`
- `Close Time`, `Duration Minutes`, `Entry Price`, `Exit Price`

For Webull option-order CSVs, the app reconstructs closed trades from filled buy/sell executions and converts broker timestamps into local session times.

## Data Storage

- Trades are stored in browser local storage.
- Journal entries are stored in browser local storage.
- Webull auth/token cache is stored locally by the SDK under `conf/`.
- API keys live only in `.env`.

This is a local-first project. It does not upload your trades to a hosted database.

## Project Structure

```text
index.html                    App shell
styles.css                    UI styling
app.js                        Frontend state, charts, import, journal, and views
server.py                     Local static server and API routes
webull_sync.py                Webull SDK integration and trade normalization
requirements.txt              Python dependencies
.env.example                  Template for user Webull API keys
Launch Trading Journal.bat    Windows double-click launcher
sample-trades.csv             Tiny sample CSV
```

## Troubleshooting

### `Sync Webull` says keys are missing

Create `.env` from `.env.example`, fill in `WEBULL_APP_KEY` and `WEBULL_APP_SECRET`, then restart `server.py`.

### Browser opens but sync does not work

Make sure you launched with `server.py` or `Launch Trading Journal.bat`. Opening `index.html` directly or using a plain static file server will not expose `/api/webull/sync`.

### Webull returns a signature error

Use:

```env
WEBULL_API_ENDPOINT=api.webull.com
```

Do not use `https://api.webull.com`.

### Uploaded CSV data looks duplicated

Click `Sync Webull` again after updating. Webull sync replaces overlapping synced dates instead of stacking duplicate trades.

## Security

Never commit these files:

- `.env`
- `conf/`
- `*.log`
- local screenshots containing account info

The included `.gitignore` already excludes them.

## License

MIT
