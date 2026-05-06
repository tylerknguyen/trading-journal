from __future__ import annotations

import importlib.util
import os
import re
import sys
import logging
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
OPTION_SYMBOL_RE = re.compile(r"^([A-Z]{1,6})(\d{2})(\d{2})(\d{2})([CP])(\d{8})$")
WEBULL_ACCOUNT_CACHE = ROOT / "conf" / "account_id.txt"


class WebullSyncError(RuntimeError):
    pass


@dataclass
class WebullConfig:
    app_key: str
    app_secret: str
    region: str
    api_endpoint: str
    account_id: str
    page_size: int
    sync_chunk_days: int
    sync_request_delay_seconds: float
    sync_start_date: str
    sync_end_date: str
    token_verify_timeout_seconds: int
    token_verify_interval_seconds: int

    @classmethod
    def load(cls) -> "WebullConfig":
        load_dotenv(ROOT / ".env")
        return cls(
            app_key=os.environ.get("WEBULL_APP_KEY", "").strip(),
            app_secret=os.environ.get("WEBULL_APP_SECRET", "").strip(),
            region=os.environ.get("WEBULL_REGION", "us").strip() or "us",
            api_endpoint=normalize_api_endpoint(os.environ.get("WEBULL_API_ENDPOINT", "api.webull.com")),
            account_id=os.environ.get("WEBULL_ACCOUNT_ID", "").strip(),
            page_size=int(os.environ.get("WEBULL_ORDER_PAGE_SIZE", "25") or "25"),
            sync_chunk_days=int(os.environ.get("WEBULL_SYNC_CHUNK_DAYS", "31") or "31"),
            sync_request_delay_seconds=float(os.environ.get("WEBULL_SYNC_REQUEST_DELAY_SECONDS", "1.5") or "1.5"),
            sync_start_date=os.environ.get("WEBULL_SYNC_START_DATE", "").strip() or default_sync_start_date(),
            sync_end_date=os.environ.get("WEBULL_SYNC_END_DATE", "").strip() or datetime.now().strftime("%Y-%m-%d"),
            token_verify_timeout_seconds=int(os.environ.get("WEBULL_TOKEN_VERIFY_TIMEOUT_SECONDS", "25") or "25"),
            token_verify_interval_seconds=int(os.environ.get("WEBULL_TOKEN_VERIFY_INTERVAL_SECONDS", "5") or "5"),
        )

    @property
    def configured(self) -> bool:
        return bool(self.app_key and self.app_secret)


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def normalize_api_endpoint(value: str | None) -> str:
    raw = (value or "api.webull.com").strip()
    if not raw:
        return "api.webull.com"
    parsed = urlparse(raw if "://" in raw else f"//{raw}")
    host = parsed.netloc or parsed.path
    return host.strip().strip("/")


def get_webull_status() -> dict[str, Any]:
    config = WebullConfig.load()
    sdk_available = importlib.util.find_spec("webull") is not None
    python_supported = (3, 8) <= sys.version_info[:2] <= (3, 11)
    cached_account_id = load_cached_account_id()
    return {
        "configured": config.configured,
        "sdkAvailable": sdk_available,
        "pythonVersion": sys.version.split()[0],
        "pythonSupportedBySdk": python_supported,
        "region": config.region,
        "apiEndpoint": config.api_endpoint,
        "accountIdConfigured": bool(config.account_id),
        "accountIdCached": bool(cached_account_id),
        "tokenVerifyTimeoutSeconds": config.token_verify_timeout_seconds,
        "pageSize": config.page_size,
        "syncChunkDays": config.sync_chunk_days,
        "syncRequestDelaySeconds": config.sync_request_delay_seconds,
        "notes": [
            "Webull's official SDK documentation lists Python 3.8 through 3.11.",
            "Order history supports start_date and end_date; this app defaults to year-to-date sync.",
            "Set WEBULL_ACCOUNT_ID in .env to avoid an extra account-list API request on each fresh setup.",
            "First API sync may require approving Webull's token verification prompt in the Webull app/SMS.",
        ],
    }


def default_sync_start_date() -> str:
    now = datetime.now()
    return datetime(now.year, 1, 1).strftime("%Y-%m-%d")


def sync_webull_orders(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    config = WebullConfig.load()
    if not config.configured:
        raise WebullSyncError("Missing WEBULL_APP_KEY and WEBULL_APP_SECRET in .env")
    if importlib.util.find_spec("webull") is None:
        raise WebullSyncError("Missing official Webull SDK. Install webull-openapi-python-sdk in a Python 3.8-3.11 environment")

    trade_client = create_trade_client(config)
    account_id = config.account_id or load_cached_account_id() or resolve_account_id(trade_client)
    cache_account_id(account_id)
    raw_orders = fetch_order_history(
        trade_client,
        account_id,
        config.page_size,
        config.sync_start_date,
        config.sync_end_date,
        config.sync_chunk_days,
        config.sync_request_delay_seconds,
    )
    rows = normalize_orders_to_csv_rows(raw_orders)
    trades = build_closed_trades_from_rows(rows)
    return {
        "source": "Webull API",
        "accountId": account_id,
        "rawOrderCount": len(raw_orders),
        "startDate": config.sync_start_date,
        "endDate": config.sync_end_date,
        "rowCount": len(rows),
        "tradeCount": len(trades),
        "netPnl": round(sum(float(trade["netPnl"]) for trade in trades), 2),
        "rows": rows,
        "trades": trades,
        "syncedAt": datetime.now(timezone.utc).isoformat(),
    }


def create_trade_client(config: WebullConfig) -> Any:
    try:
        from webull.core.client import ApiClient
        from webull.trade.trade_client import TradeClient
    except Exception as error:
        raise WebullSyncError(f"Unable to import Webull SDK: {error}") from error

    logging.getLogger("webull").setLevel(logging.WARNING)
    api_client = ApiClient(
        config.app_key,
        config.app_secret,
        config.region,
        token_check_duration_seconds=max(5, config.token_verify_timeout_seconds),
        token_check_interval_seconds=max(1, config.token_verify_interval_seconds),
    )
    api_client._stream_logger_set = True
    api_client._file_logger_set = True
    if config.api_endpoint:
        api_client.add_endpoint(config.region, config.api_endpoint)
    try:
        return TradeClient(api_client)
    except Exception as error:
        raise WebullSyncError(describe_webull_exception(error)) from error


def resolve_account_id(trade_client: Any) -> str:
    account_client = getattr(trade_client, "account_v2", None) or getattr(trade_client, "account", None)
    if not account_client or not hasattr(account_client, "get_account_list"):
        raise WebullSyncError("WEBULL_ACCOUNT_ID is required because account list method was not found in the SDK")
    response = account_client.get_account_list()
    payload = response_json(response)
    accounts = extract_list(payload)
    if not accounts:
        raise WebullSyncError("Webull account list returned no accounts")
    account = accounts[0]
    account_id = pick_deep(account, "account_id", "accountId", "id", "account_number", "accountNo")
    if not account_id:
        raise WebullSyncError("Unable to find account id in Webull account list response")
    return str(account_id)


def load_cached_account_id() -> str:
    try:
        if not WEBULL_ACCOUNT_CACHE.exists():
            return ""
        return WEBULL_ACCOUNT_CACHE.read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def cache_account_id(account_id: str) -> None:
    if not account_id:
        return
    try:
        WEBULL_ACCOUNT_CACHE.parent.mkdir(exist_ok=True)
        WEBULL_ACCOUNT_CACHE.write_text(str(account_id).strip(), encoding="utf-8")
    except OSError:
        pass


def fetch_order_history(
    trade_client: Any,
    account_id: str,
    page_size: int,
    start_date: str | None = None,
    end_date: str | None = None,
    chunk_days: int = 31,
    request_delay_seconds: float = 1.5,
) -> list[dict[str, Any]]:
    candidates = []
    for client_name in ("order_v2", "order_v3", "order"):
        client = getattr(trade_client, client_name, None)
        if not client:
            continue
        for method_name in (
            "get_order_history",
            "get_order_history_request",
        ):
            method = getattr(client, method_name, None)
            if callable(method):
                candidates.append((client_name, method_name, method))

    if not candidates:
        available = {
            name: [item for item in dir(getattr(trade_client, name, None)) if "history" in item.lower() or "order" in item.lower()]
            for name in ("order_v3", "order_v2", "order")
            if getattr(trade_client, name, None)
        }
        raise WebullSyncError(f"No SDK order-history method found. Available order methods: {available}")

    errors: list[str] = []
    for client_name, method_name, method in candidates:
        try:
            return fetch_order_history_with_method(
                method,
                account_id,
                page_size,
                start_date,
                end_date,
                chunk_days,
                request_delay_seconds,
            )
        except TypeError as error:
            errors.append(f"{client_name}.{method_name}: {error}")
        except WebullSyncError as error:
            errors.append(f"{client_name}.{method_name}: {error}")
        except Exception as error:
            raise WebullSyncError(describe_webull_exception(error)) from error

    raise WebullSyncError("Could not call Webull order-history method. " + " | ".join(errors[:5]))


def describe_webull_exception(error: Exception) -> str:
    code = getattr(error, "error_code", "")
    status = getattr(error, "http_status", "")
    request_id = getattr(error, "request_id", "")
    message = str(error)
    if code == "SIGNATURE_ALGORITHM_NOT_SUPPORTED":
        return (
            "Webull rejected the request signing algorithm. "
            "Use WEBULL_API_ENDPOINT=api.webull.com without https:// in .env, then restart python server.py. "
            f"Webull details: {message}"
        )
    if code == "IP_NOT_ALLOWED":
        return (
            "Webull rejected this machine's IP address. Add your current public IP as a /32 segment "
            "in Webull API Keys Management, then retry sync."
        )
    if code == "UNAUTHORIZED":
        return (
            "Webull rejected the App Key or App Secret. Check the keys in .env and make sure the app is active."
        )
    if code == "TOO_MANY_REQUESTS" or status == 429:
        return "Webull rate-limited the sync request. Wait a minute, then click Sync Webull again."
    if code == "ERROR_INIT_TOKEN" or "status:PENDING" in message:
        return (
            "Webull created an access token, but it is still pending verification. "
            "Approve the Webull API verification prompt in the Webull app/SMS, then click Sync Webull again."
        )
    if code:
        details = f"HTTP {status}, Webull code {code}"
        if request_id:
            details += f", request id {request_id}"
        return f"{details}: {getattr(error, 'error_msg', '') or message}"
    return message


def fetch_order_history_with_method(
    method: Any,
    account_id: str,
    page_size: int,
    start_date: str | None = None,
    end_date: str | None = None,
    chunk_days: int = 31,
    request_delay_seconds: float = 1.5,
) -> list[dict[str, Any]]:
    if start_date and end_date and chunk_days > 0:
        orders: list[dict[str, Any]] = []
        for index, (chunk_start, chunk_end) in enumerate(iter_date_chunks(start_date, end_date, chunk_days)):
            if index:
                time.sleep(max(0, request_delay_seconds))
            orders.extend(fetch_order_history_window(method, account_id, page_size, chunk_start, chunk_end, request_delay_seconds))
        return dedupe_orders(orders)
    return fetch_order_history_window(method, account_id, page_size, start_date, end_date, request_delay_seconds)


def fetch_order_history_window(
    method: Any,
    account_id: str,
    page_size: int,
    start_date: str | None = None,
    end_date: str | None = None,
    request_delay_seconds: float = 1.5,
) -> list[dict[str, Any]]:
    orders: list[dict[str, Any]] = []
    last_client_order_id = None
    last_order_id = None
    seen_cursors: set[tuple[str | None, str | None]] = set()

    for _page in range(1, 8):
        response = call_history_method(
            method,
            account_id,
            page_size,
            last_client_order_id,
            last_order_id,
            start_date,
            end_date,
        )
        payload = response_json(response)
        page_orders = extract_list(payload)
        if not page_orders:
            break
        orders.extend(page_orders)
        if len(page_orders) < page_size:
            break
        time.sleep(max(0, request_delay_seconds))
        last_order = page_orders[-1]
        last_client_order_id = pick_deep(last_order, "client_order_id", "clientOrderId")
        last_order_id = pick_deep(last_order, "order_id", "orderId")
        cursor = (str(last_client_order_id) if last_client_order_id else None, str(last_order_id) if last_order_id else None)
        if not any(cursor) or cursor in seen_cursors:
            break
        seen_cursors.add(cursor)
    return orders


def iter_date_chunks(start_date: str, end_date: str, chunk_days: int) -> Iterable[tuple[str, str]]:
    current = parse_date_key(start_date)
    final = parse_date_key(end_date)
    if final < current:
        current, final = final, current
    while current <= final:
        chunk_end = min(final, current + timedelta(days=max(1, chunk_days) - 1))
        yield current.strftime("%Y-%m-%d"), chunk_end.strftime("%Y-%m-%d")
        current = chunk_end + timedelta(days=1)


def parse_date_key(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def dedupe_orders(orders: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for order in orders:
        key = str(pick_deep(order, "order_id", "orderId", "client_order_id", "clientOrderId") or id(order))
        if key in seen:
            continue
        seen.add(key)
        unique.append(order)
    return unique


def call_history_method(
    method: Any,
    account_id: str,
    page_size: int,
    last_client_order_id: Any = None,
    last_order_id: Any = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> Any:
    attempts = (
        lambda: method(account_id, page_size=page_size, start_date=start_date, end_date=end_date, last_client_order_id=last_client_order_id, last_order_id=last_order_id),
        lambda: method(account_id, page_size=page_size, start_date=start_date, end_date=end_date, last_client_order_id=last_client_order_id),
        lambda: method(account_id, page_size=page_size, start_date=start_date, end_date=end_date),
        lambda: method(account_id, page_size=page_size, last_client_order_id=last_client_order_id, last_order_id=last_order_id),
        lambda: method(account_id, page_size=page_size, last_client_order_id=last_client_order_id),
        lambda: method(account_id, page_size=page_size),
        lambda: method(account_id),
    )
    last_type_error: TypeError | None = None
    for attempt in attempts:
        try:
            return attempt()
        except TypeError as error:
            last_type_error = error
    if last_type_error:
        raise last_type_error
    raise WebullSyncError("Unable to call SDK history method")


def response_json(response: Any) -> Any:
    status_code = getattr(response, "status_code", 200)
    if status_code and int(status_code) >= 400:
        text = getattr(response, "text", "")
        raise WebullSyncError(f"Webull API returned HTTP {status_code}: {text}")
    if hasattr(response, "json"):
        return response.json()
    return response


def extract_list(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if not isinstance(payload, dict):
        return []
    for key in ("data", "orders", "order_list", "orderList", "items", "records", "results", "list"):
        value = payload.get(key)
        found = extract_list(value)
        if found:
            return found
    return [payload] if looks_like_order(payload) else []


def looks_like_order(item: dict[str, Any]) -> bool:
    keys = {str(key).lower() for key in item}
    return bool({"side", "symbol", "status", "quantity", "orderstatus", "legs"} & keys)


def normalize_orders_to_csv_rows(raw_orders: list[dict[str, Any]]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for order in iter_normalizable_orders(raw_orders):
        legs = first_list(order, "legs", "order_legs", "orderLegs", "items") or [order]
        for leg in legs:
            row = normalize_order_leg(order, leg)
            if row["Status"] == "Filled" and row["Symbol"] and row["Filled"] and row["Avg Price"] and row["Filled Time"]:
                rows.append(row)
    return rows


def iter_normalizable_orders(raw_orders: list[dict[str, Any]]) -> Iterable[dict[str, Any]]:
    for order in raw_orders:
        child_orders = first_list(order, "orders", "order_list", "orderList")
        if child_orders:
            for child in child_orders:
                merged = {**order, **child}
                yield merged
        else:
            yield order


def normalize_order_leg(order: dict[str, Any], leg: dict[str, Any]) -> dict[str, str]:
    side = str(pick_deep(leg, "side", "action") or pick_deep(order, "side", "action") or "").upper()
    status = str(pick_deep(order, "status", "order_status", "orderStatus") or "Filled")
    quantity = pick_deep(leg, "filled_quantity", "filledQty", "filled", "quantity", "qty") or pick_deep(order, "filled_quantity", "filledQty", "filled", "quantity", "qty")
    avg_price = pick_deep(leg, "avg_filled_price", "avgFilledPrice", "avg_price", "avgPrice", "filled_price", "price", "limit_price") or pick_deep(order, "avg_filled_price", "avgFilledPrice", "avg_price", "avgPrice", "filled_price", "price", "limit_price")
    filled_time = pick_deep(order, "filled_time_at", "filledTimeAt", "last_filled_time", "lastFilledTime", "filled_time", "filledTime", "update_time_at", "updateTimeAt", "update_time", "updateTime", "placed_time_at", "placedTimeAt", "place_time_at", "placeTimeAt", "placed_time", "placedTime", "place_time", "placeTime", "create_time", "createTime", "createdAt")
    symbol = resolve_symbol(order, leg)
    return {
        "Name": symbol,
        "Symbol": symbol,
        "Side": "Sell" if "SELL" in side else "Buy",
        "Status": "Filled" if "FILL" in status.upper() else status.title(),
        "Filled": clean_number(quantity),
        "Total Qty": clean_number(quantity),
        "Price": clean_number(avg_price),
        "Avg Price": clean_number(avg_price),
        "Time-in-Force": str(pick_deep(order, "time_in_force", "timeInForce") or "DAY"),
        "Placed Time": format_broker_time(pick_deep(order, "placed_time_at", "placedTimeAt", "place_time_at", "placeTimeAt", "placed_time", "placedTime", "place_time", "placeTime", "create_time", "createTime", "createdAt") or filled_time),
        "Filled Time": format_broker_time(filled_time),
        "Order ID": str(pick_deep(order, "order_id", "orderId", "combo_order_id", "comboOrderId") or pick_deep(leg, "id") or ""),
        "Position Intent": str(pick_deep(order, "position_intent", "positionIntent") or ""),
    }


def resolve_symbol(order: dict[str, Any], leg: dict[str, Any]) -> str:
    direct = pick_deep(leg, "option_symbol", "optionSymbol", "instrument_symbol", "instrumentSymbol", "symbol", "ticker") or pick_deep(order, "option_symbol", "optionSymbol", "instrument_symbol", "instrumentSymbol", "symbol", "ticker")
    if direct and OPTION_SYMBOL_RE.match(str(direct).upper()):
        return str(direct).upper()
    underlying = pick_deep(leg, "underlying_symbol", "underlyingSymbol", "symbol", "ticker") or pick_deep(order, "underlying_symbol", "underlyingSymbol", "symbol", "ticker")
    expiry = pick_deep(leg, "option_expire_date", "optionExpireDate", "init_exp_date", "initExpDate", "expire_date", "expiry", "expiration")
    option_type = pick_deep(leg, "option_type", "optionType", "put_call", "putCall")
    strike = pick_deep(leg, "strike_price", "strikePrice", "strike")
    built = build_option_symbol(underlying, expiry, option_type, strike)
    return built or str(direct or underlying or "").upper()


def build_option_symbol(underlying: Any, expiry: Any, option_type: Any, strike: Any) -> str:
    if not (underlying and expiry and option_type and strike):
        return ""
    parsed = parse_any_datetime(expiry)
    if not parsed:
        return ""
    cp = "C" if str(option_type).upper().startswith("C") else "P"
    strike_int = int(round(float(str(strike).replace(",", "")) * 1000))
    return f"{str(underlying).upper()}{parsed:%y%m%d}{cp}{strike_int:08d}"


def build_closed_trades_from_rows(rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    fills = []
    for index, row in enumerate(rows):
        filled_at = parse_any_datetime(row.get("Filled Time"))
        symbol = str(row.get("Symbol", "")).upper()
        if not filled_at or not symbol:
            continue
        fills.append({
            "index": index,
            "contract": symbol,
            "side": "Buy" if str(row.get("Side", "")).lower().startswith("buy") else "Sell",
            "quantity": float(row.get("Filled") or row.get("Total Qty") or 0),
            "price": float(row.get("Avg Price") or row.get("Price") or 0),
            "filled_at": filled_at,
            "order_id": row.get("Order ID") or f"fill-{index}",
            "position_intent": row.get("Position Intent") or "",
            "option": parse_option_contract(symbol),
            "multiplier": 100 if parse_option_contract(symbol) else 1,
        })

    positions: dict[str, dict[str, Any]] = {}
    trades: list[dict[str, Any]] = []
    for fill in sorted(fills, key=lambda item: (item["filled_at"], item["index"])):
        signed = fill["quantity"] if fill["side"] == "Buy" else -fill["quantity"]
        while abs(signed) > 0.000001:
            position = positions.get(fill["contract"])
            if not position or abs(position["quantity"]) < 0.000001:
                positions[fill["contract"]] = open_position(fill, signed)
                signed = 0
                continue
            if sign(position["quantity"]) == sign(signed):
                position["entry_notional"] += abs(signed) * fill["price"]
                position["quantity"] += signed
                position["entry_executions"].append(make_execution(fill, abs(signed), "Entry"))
                signed = 0
                continue
            closing_qty = min(abs(signed), abs(position["quantity"]))
            avg_entry = position["entry_notional"] / abs(position["quantity"])
            direction = sign(position["quantity"])
            pnl = ((fill["price"] - avg_entry) if direction > 0 else (avg_entry - fill["price"])) * closing_qty * position["multiplier"]
            position["realized_pnl"] += pnl
            position["closed_quantity"] += closing_qty
            position["entry_closed_notional"] += avg_entry * closing_qty
            position["exit_notional"] += fill["price"] * closing_qty
            position["entry_notional"] -= avg_entry * closing_qty
            position["exit_executions"].append(make_execution(fill, closing_qty, "Exit", pnl))
            position["quantity"] += sign(signed) * closing_qty
            signed -= sign(signed) * closing_qty
            if abs(position["quantity"]) < 0.000001:
                trades.append(close_position_to_trade(position, fill, len(trades)))
                positions.pop(fill["contract"], None)
    return trades


def open_position(fill: dict[str, Any], signed: float) -> dict[str, Any]:
    option = fill["option"] or {}
    return {
        "contract": fill["contract"],
        "symbol": option.get("underlying") or fill["contract"],
        "underlying": option.get("underlying") or fill["contract"],
        "optionType": option.get("type", ""),
        "expiry": option.get("expiry", ""),
        "strike": option.get("strike", ""),
        "side": "Long" if signed > 0 else "Short",
        "quantity": signed,
        "opened_at": fill["filled_at"],
        "entry_notional": abs(signed) * fill["price"],
        "entry_executions": [make_execution(fill, abs(signed), "Entry")],
        "exit_executions": [],
        "realized_pnl": 0.0,
        "closed_quantity": 0.0,
        "entry_closed_notional": 0.0,
        "exit_notional": 0.0,
        "multiplier": fill["multiplier"],
    }


def close_position_to_trade(position: dict[str, Any], fill: dict[str, Any], index: int) -> dict[str, Any]:
    close_date = fill["filled_at"].strftime("%Y-%m-%d")
    close_time = fill["filled_at"].strftime("%H:%M")
    quantity = position["closed_quantity"] or 1
    return {
        "id": f"webull-api-{position['contract']}-{int(position['opened_at'].timestamp())}-{int(fill['filled_at'].timestamp())}-{index}",
        "openDate": position["opened_at"].strftime("%Y-%m-%d"),
        "openTime": position["opened_at"].strftime("%H:%M"),
        "closeDate": close_date,
        "closeTime": close_time,
        "exitTime": close_time,
        "symbol": position["symbol"],
        "contract": position["contract"],
        "underlying": position["underlying"],
        "optionType": position["optionType"],
        "expiry": position["expiry"],
        "strike": position["strike"],
        "side": position["side"],
        "quantity": quantity,
        "entryPrice": round(position["entry_closed_notional"] / quantity, 4),
        "exitPrice": round(position["exit_notional"] / quantity, 4),
        "grossPnl": round(position["realized_pnl"], 2),
        "commissions": 0,
        "adjustedCost": round(position["entry_closed_notional"] * position["multiplier"], 2),
        "netPnl": round(position["realized_pnl"], 2),
        "durationMinutes": max(1, round((fill["filled_at"] - position["opened_at"]).total_seconds() / 60)),
        "executions": position["entry_executions"] + position["exit_executions"],
        "status": "Closed",
    }


def make_execution(fill: dict[str, Any], quantity: float, role: str, pnl: float | None = None) -> dict[str, Any]:
    return {
        "id": str(fill.get("order_id") or f"{fill['contract']}-{fill['index']}-{role}"),
        "role": role,
        "time": fill["filled_at"].strftime("%H:%M:%S"),
        "date": fill["filled_at"].strftime("%Y-%m-%d"),
        "side": fill["side"],
        "quantity": quantity,
        "price": round(float(fill["price"]), 4),
        "pnl": round(pnl, 2) if pnl is not None else None,
        "positionIntent": fill.get("position_intent", ""),
    }


def pick_deep(data: Any, *names: str) -> Any:
    normalized = {normalize(name) for name in names}
    if isinstance(data, dict):
        for key, value in data.items():
            if normalize(str(key)) in normalized and value not in (None, ""):
                return value
        for value in data.values():
            found = pick_deep(value, *names)
            if found not in (None, ""):
                return found
    elif isinstance(data, list):
        for item in data:
            found = pick_deep(item, *names)
            if found not in (None, ""):
                return found
    return None


def first_list(data: dict[str, Any], *names: str) -> list[dict[str, Any]] | None:
    for name in names:
        value = data.get(name)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
    return None


def parse_option_contract(symbol: str) -> dict[str, Any] | None:
    match = OPTION_SYMBOL_RE.match(symbol)
    if not match:
        return None
    underlying, yy, mm, dd, cp, strike = match.groups()
    return {
        "underlying": underlying,
        "expiry": f"20{yy}-{mm}-{dd}",
        "type": "Call" if cp == "C" else "Put",
        "strike": int(strike) / 1000,
    }


def parse_any_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        if value.tzinfo:
            return utc_to_journal_time(value.astimezone(timezone.utc).replace(tzinfo=None))
        return value
    text = str(value or "").strip().replace(" EDT", "").replace(" EST", "").replace(" PDT", "").replace(" PST", "")
    if not text:
        return None
    if re.fullmatch(r"\d{10,13}", text):
        timestamp = int(text)
        if len(text) >= 13:
            timestamp = timestamp / 1000
        return utc_to_journal_time(datetime.fromtimestamp(timestamp, timezone.utc).replace(tzinfo=None))
    if "T" in text:
        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
            if parsed.tzinfo:
                return utc_to_journal_time(parsed.astimezone(timezone.utc).replace(tzinfo=None))
            return parsed
        except ValueError:
            pass
    for fmt in ("%m/%d/%Y %H:%M:%S", "%m/%d/%Y %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%Y%m%d"):
        try:
            return datetime.strptime(text[: len(datetime.now().strftime(fmt))], fmt)
        except ValueError:
            pass
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        if parsed.tzinfo:
            return utc_to_journal_time(parsed.astimezone(timezone.utc).replace(tzinfo=None))
        return parsed
    except ValueError:
        return None


def utc_to_journal_time(utc_dt: datetime) -> datetime:
    offset = -7 if is_us_pacific_dst(utc_dt) else -8
    return utc_dt + timedelta(hours=offset)


def is_us_pacific_dst(utc_dt: datetime) -> bool:
    year = utc_dt.year
    dst_start_utc = nth_weekday(year, 3, 6, 2).replace(hour=10)
    dst_end_utc = nth_weekday(year, 11, 6, 1).replace(hour=9)
    return dst_start_utc <= utc_dt < dst_end_utc


def nth_weekday(year: int, month: int, weekday: int, occurrence: int) -> datetime:
    cursor = datetime(year, month, 1)
    days_until_weekday = (weekday - cursor.weekday()) % 7
    return cursor + timedelta(days=days_until_weekday + 7 * (occurrence - 1))


def format_broker_time(value: Any) -> str:
    parsed = parse_any_datetime(value)
    return parsed.strftime("%m/%d/%Y %H:%M:%S PDT") if parsed else ""


def clean_number(value: Any) -> str:
    if value is None or value == "":
        return ""
    return str(value).replace(",", "").strip()


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def sign(value: float) -> int:
    return 1 if value > 0 else -1 if value < 0 else 0
