# Trading Journal

A local-first trading journal and portfolio tracker inspired by the workflow of professional trading dashboards. It supports Webull option-order CSV imports, Webull API sync, daily P&L analytics, calendar/day views, per-trade journaling with chart screenshots, custom playbooks, day-event tagging, custom rules, and a comprehensive Reports page.

The app runs on your own computer. Trades, journal entries, screenshots, playbooks, and event tags are stored in your browser's local storage. Webull API keys can either live in the local Python server's `.env` file or be entered through the Settings page (which keeps them in browser local storage and only sends them to the local backend on this machine).

## Features

- Dashboard metrics: net P&L, trade win rate, profit factor, day win rate, average win/loss, plus a "Rules to follow" widget that summarizes today's discipline.
- Charts for cumulative P&L, daily net P&L, account balance, drawdown, trade time performance, and duration performance.
- Calendar with day-level P&L, trade counts, win rates, red-dot indicator for tagged events, and a clickable day-detail modal.
- Day events: tag any day with arbitrary events (Red Folder News, NVDA earnings, FOMC, etc.) and they show up across the calendar and journal.
- Recent trades and open positions tables.
- Day-grouped journal page with per-trade strategy / emotion tags, full notes inline, embedded chart screenshots (paste with `Ctrl+V` / `Cmd+V`), and a "X/Y journaled" status pill per day.
- Reports page: comprehensive overview stats with date range presets (All time, YTD, This month, Last 30 / 90 / 365 days, Q1/Q2/Q3/Q4 of any year, Custom). Day-of-week and Monthly breakdown table + bar chart.
- Playbook page: document each strategy with name, description, entry / exit rules, risk sizing, and notes. Trades tagged with the playbook's name auto-link, and each playbook surfaces win-rate, expectancy, and recent trades.
- Trade detail page with executions, stats, notes, running P&L, saved chart screenshot, and TradingView chart embed.
- Progress tracker with built-in rules ("Start my day by", "Stop trading by", max-loss-per-trade, max-loss-per-day, etc.) and user-defined custom rules.
- Settings page with theme picker, default date range, configurable starting-balance fallback, Webull credentials override, JSON backup / restore, storage usage, and one-click trade-data reset.
- Light + dark mode (toggle in the topbar; respects `prefers-color-scheme` on first load).
- Webull API sync through a local Python backend with rate-limit cooldown, partial-result preservation, and OAUTH gateway error handling.
- Optional CSV import for manual Webull option order exports.
- Double-click launcher for both Windows (`.bat`) and macOS (`.command`).

## Quick Start On Windows

1. Download or clone the repo.
2. Double-click `Launch Trading Journal.bat`.
3. Open `http://127.0.0.1:5173/` if the browser does not open automatically.

The launcher creates a local `.venv`, installs dependencies, starts the server, and opens the app. Leave the launcher window open while using the app. Press `Ctrl+C` in that window to stop it.

To put a shortcut on your Desktop with a custom icon, right-click `Create Desktop Shortcut.ps1` and choose **Run with PowerShell**. Drop an `app-icon.ico` file in the project folder beforehand and the shortcut will pick it up automatically.

## Quick Start On macOS

1. Download or clone the repo.
2. Make sure Python 3 is installed. `python3 --version` should print 3.10 or 3.11 (the Webull SDK officially supports 3.8 - 3.11). Install via [python.org](https://www.python.org/downloads/macos/) or `brew install python@3.11` if needed.
3. Open Terminal in the repo folder and run once:

```bash
chmod +x "Launch Trading Journal.command"
```

4. Double-click `Launch Trading Journal.command` from Finder.

The launcher creates a local `.venv`, installs dependencies, waits for the server to bind, and opens the app at `http://127.0.0.1:5173/`. The Terminal window stays open while the server runs — press `Ctrl+C` to stop.

To pin it to the Dock: drag `Launch Trading Journal.command` from Finder onto the right side of the Dock (next to the Trash). To replace the default Terminal icon, right-click the launcher in Finder, choose **Get Info**, then drag a custom `.icns` or image file onto the small icon in the top-left of the info window.

If macOS warns "cannot be opened because the developer cannot be verified", right-click the file in Finder, choose **Open**, then **Open** in the dialog. macOS only asks once.

## Manual Setup

Python 3.10 or 3.11 is recommended.

### Windows

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe server.py
```

### macOS / Linux

```bash
python3 -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
./.venv/bin/python server.py
```

Then open:

```text
http://127.0.0.1:5173/
```

## Webull API Sync

Webull sync is handled by `server.py` so API keys stay on your computer and never go into a hosted/static deployment.

You have **two ways** to provide the keys:

### Option A: Settings page (recommended, no file editing)

1. Start the server (double-click the launcher).
2. Open the app, click **Settings** in the sidebar.
3. Under **Webull credentials**, paste your App Key and App Secret (from the Webull Developer Portal &rarr; API Keys Management). Optionally pre-fill the Account ID; otherwise it auto-detects on first sync.
4. Click **Save**. Click **Sync Webull** on the dashboard.

Credentials saved this way live in your browser's local storage on this device. They get sent to the local Python backend with each sync request and are never uploaded anywhere else. Click **Clear from browser** in Settings to wipe them.

### Option B: `.env` file (the original way)

1. Copy `.env.example` to `.env`.
2. Open `.env` and add your credentials:

```env
WEBULL_APP_KEY=your_app_key_here
WEBULL_APP_SECRET=your_app_secret_here
WEBULL_REGION=us
WEBULL_API_ENDPOINT=api.webull.com
WEBULL_ACCOUNT_ID=
WEBULL_ORDER_PAGE_SIZE=100
WEBULL_SYNC_CHUNK_DAYS=7
WEBULL_SYNC_REQUEST_DELAY_SECONDS=10
WEBULL_TOKEN_VERIFY_TIMEOUT_SECONDS=120
PORT=5173
```

3. Restart the server. Click **Sync Webull** in the dashboard.

If you fill in any field via Settings, that value overrides `.env` for that field. Empty Settings fields fall back to `.env`.

If Webull returns `Pending Verification`, approve the verification prompt in the Webull mobile app or via SMS, then click **Sync Webull** again.

Notes:

- Keep `WEBULL_API_ENDPOINT=api.webull.com`; do not include `https://`.
- `WEBULL_ACCOUNT_ID` is optional. If omitted, the sync server resolves the first account from the SDK and caches it locally under `conf/`.
- Webull's API requires your current public IP to be on the allowlist in API Keys Management. ISP-rotated IPs will silently start failing with `OAUTH_OPENAPI_SYSTEM_ERROR`; re-add the new IP if that happens.
- The sync server requests order history in weekly chunks with a 10-second delay between requests to stay under Webull's rate limits.
- Do not commit `.env`, `conf/`, logs, or local token files. They are excluded by `.gitignore`.

## Optional CSV Import

Use **Upload CSV** in the dashboard for a manual import. Webull API sync is preferred because it replaces the synced date window with broker data automatically. The CSV importer supports Webull option-order exports and common trade-history headers, including:

- `Close Date`, `Date`, `Trade Date`, `Filled Time`
- `Symbol`, `Ticker`, `Underlying`, `Instrument`
- `Side`, `Action`, `Direction`
- `Quantity`, `Qty`, `Shares`, `Filled Qty`
- `Net P&L`, `P&L`, `Realized P&L`, `Profit/Loss`
- `Close Time`, `Duration Minutes`, `Entry Price`, `Exit Price`

For Webull option-order CSVs, the app reconstructs closed trades from filled buy/sell executions, including the inverted-side fix for sells-to-close on positions opened before the sync window.

## Hosting The Frontend

The static frontend can be served from any static host (GitHub Pages, Cloudflare Pages, Netlify, etc.). The Webull sync feature requires the local Python backend, so the hosted version is for browsing / CSV import / journaling and uses the same `localStorage` per-browser-per-device model.

This repo is currently published via GitHub Pages from the `main` branch root, so any push to `main` redeploys the static site automatically.

## Data Storage

- Trades, journals, playbooks, day events, custom rules, and chart screenshots are stored in your browser's local storage.
- Webull auth/token cache is stored locally by the SDK under `conf/`.
- Webull account-id and rate-limit cooldown cache live under `conf/`.
- Webull API keys live in `.env` and/or in browser local storage on this device (never on a remote server).

This is a local-first project. It does not upload your trades or credentials to any hosted database.

## Project Structure

```text
index.html                      App shell
styles.css                      UI styling (light + dark themes)
app.js                          Frontend state, charts, import, journal, playbook, settings
server.py                       Local static server and API routes
webull_sync.py                  Webull SDK integration and trade normalization
requirements.txt                Python dependencies
.env.example                    Template for user Webull API keys
.gitattributes                  Ensures shell scripts keep LF line endings cross-platform
Launch Trading Journal.bat      Windows double-click launcher
Launch Trading Journal.command  macOS double-click launcher
Create Desktop Shortcut.ps1     Optional Windows desktop-shortcut installer
sample-trades.csv               Tiny sample CSV
```

## Troubleshooting

### `Sync Webull` says keys are missing

Either fill in **App Key** and **App Secret** in **Settings &rarr; Webull credentials**, or set `WEBULL_APP_KEY` and `WEBULL_APP_SECRET` in `.env` and restart `server.py`.

### Browser opens but sync does not work

Make sure you launched the server (`Launch Trading Journal.bat` on Windows or `Launch Trading Journal.command` on macOS, or `python server.py` manually). Opening `index.html` directly will not expose `/api/webull/sync` and the sync button will fail.

### Webull returns a signature error

Use exactly:

```env
WEBULL_API_ENDPOINT=api.webull.com
```

Do not use `https://api.webull.com`.

### `OAUTH_OPENAPI_SYSTEM_ERROR` on sync

Usually one of:

- Cached SDK token went stale: delete `conf/token.txt` and `conf/token.*.bak`, then re-sync (you'll be prompted for fresh 2FA approval).
- Your current public IP isn't on the Webull API Keys Management allowlist (check what's listed in Webull's Developer Portal vs your current IP from `curl ifconfig.me` / `(Invoke-RestMethod https://api.ipify.org)`).
- Webull's gateway is having a transient issue; wait a few minutes.

### macOS says "cannot be opened because the developer cannot be verified"

Right-click `Launch Trading Journal.command` in Finder, choose **Open**, and confirm in the dialog. macOS only asks the first time.

### Uploaded CSV data looks duplicated

Click **Sync Webull** again. The Webull sync replaces overlapping synced dates instead of stacking duplicate trades.

## Security

Never commit these files:

- `.env`
- `conf/`
- `*.log`
- local screenshots containing account info

The included `.gitignore` already excludes them. Webull credentials saved through the Settings page live only in this device's browser local storage; they are never written to disk or pushed to git.

## License

MIT
