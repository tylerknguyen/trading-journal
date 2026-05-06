from __future__ import annotations

import json
import mimetypes
import os
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from webull_sync import WebullSyncError, get_webull_status, load_dotenv, sync_webull_orders


ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
PORT = int(os.environ.get("PORT", "5173"))
WEBULL_RATE_LIMIT_UNTIL = 0.0
WEBULL_RATE_LIMIT_SECONDS = int(os.environ.get("WEBULL_RATE_LIMIT_SECONDS", "180") or "180")
WEBULL_RATE_LIMIT_CACHE = ROOT / "conf" / "webull_rate_limit_until.txt"


class TradingJournalHandler(SimpleHTTPRequestHandler):
    server_version = "TradingJournal/0.2"

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.send_json({"ok": True, "service": "trading-journal"})
            return
        if parsed.path == "/api/webull/status":
            self.send_json({"ok": True, **get_webull_status()})
            return
        self.serve_static(parsed.path)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/api/webull/sync":
            self.send_json({"ok": False, "error": "Unknown API route"}, status=404)
            return

        try:
            retry_after = current_webull_retry_after()
            if retry_after > 0:
                self.send_json(
                    {
                        "ok": False,
                        "error": f"Webull rate limit cooldown active. Try again in {retry_after} seconds.",
                        "retryAfterSeconds": retry_after,
                        "status": get_webull_status(),
                    },
                    status=429,
                )
                return
            payload = self.read_json()
            result = sync_webull_orders(payload)
            if result.get("rateLimited"):
                cooldown = arm_webull_rate_limit_cooldown()
                result = {**result, "retryAfterSeconds": cooldown}
            self.send_json({"ok": True, **result})
        except WebullSyncError as error:
            retry_after = remember_webull_rate_limit(error)
            self.send_json(
                {
                    "ok": False,
                    "error": str(error),
                    "retryAfterSeconds": retry_after if retry_after else None,
                    "status": get_webull_status(),
                },
                status=429 if retry_after else 400,
            )
        except Exception as error:  # Keep API failures visible in the UI.
            self.send_json({"ok": False, "error": f"Unexpected Webull sync error: {error}"}, status=500)

    def serve_static(self, request_path: str) -> None:
        relative = unquote(request_path).lstrip("/") or "index.html"
        target = (ROOT / relative).resolve()
        if not str(target).lower().startswith(str(ROOT).lower()) or not target.exists() or target.is_dir():
            target = ROOT / "index.html"

        content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if not length:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw or "{}")

    def send_json(self, payload: dict, status: int = 200) -> None:
        data = json.dumps(payload, indent=2, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt: str, *args) -> None:
        print(f"[server] {self.address_string()} - {fmt % args}")


def main() -> None:
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), TradingJournalHandler)
    print(f"Trading Journal running at http://127.0.0.1:{PORT}/")
    print("Use .env for Webull credentials. See .env.example.")
    server.serve_forever()


def current_webull_retry_after() -> int:
    global WEBULL_RATE_LIMIT_UNTIL
    WEBULL_RATE_LIMIT_UNTIL = max(WEBULL_RATE_LIMIT_UNTIL, load_webull_rate_limit_until())
    return max(0, int(WEBULL_RATE_LIMIT_UNTIL - time.time()))


def remember_webull_rate_limit(error: Exception) -> int:
    if "rate-limit" not in str(error).lower() and "rate limited" not in str(error).lower():
        return 0
    return arm_webull_rate_limit_cooldown()


def arm_webull_rate_limit_cooldown() -> int:
    global WEBULL_RATE_LIMIT_UNTIL
    WEBULL_RATE_LIMIT_UNTIL = time.time() + WEBULL_RATE_LIMIT_SECONDS
    save_webull_rate_limit_until(WEBULL_RATE_LIMIT_UNTIL)
    return WEBULL_RATE_LIMIT_SECONDS


def load_webull_rate_limit_until() -> float:
    try:
        if not WEBULL_RATE_LIMIT_CACHE.exists():
            return 0.0
        return float(WEBULL_RATE_LIMIT_CACHE.read_text(encoding="utf-8").strip() or "0")
    except (OSError, ValueError):
        return 0.0


def save_webull_rate_limit_until(value: float) -> None:
    try:
        WEBULL_RATE_LIMIT_CACHE.parent.mkdir(exist_ok=True)
        WEBULL_RATE_LIMIT_CACHE.write_text(str(float(value)), encoding="utf-8")
    except OSError:
        pass


if __name__ == "__main__":
    main()
