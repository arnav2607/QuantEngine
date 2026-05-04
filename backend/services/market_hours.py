"""
=============================================================================
Market Hours Utility  —  services/market_hours.py
=============================================================================
Tracks NSE (National Stock Exchange, India) trading hours and decides
whether cached stock data is still "fresh" or needs a refresh from yfinance.

NSE trading hours: Monday – Friday, 09:15 – 15:30 IST (UTC+05:30)
Weekends and public holidays: market is closed (no new daily bars).

Freshness policy
----------------
We use a `price_metadata` MongoDB collection to track the last time each
symbol's daily bar was fetched. The policy is:

  ┌─────────────────┬──────────────────────────────────────────────────────┐
  │ State           │ Freshness rule                                       │
  ├─────────────────┼──────────────────────────────────────────────────────┤
  │ Weekend         │ Fresh if any data exists (no new bars expected)      │
  │ Market OPEN     │ Stale if last_fetch_hour ≠ current hour (hourly)    │
  │ Market CLOSED   │ Fresh once closing bar has been fetched today        │
  └─────────────────┴──────────────────────────────────────────────────────┘

Using an hourly granularity during market hours gives us intraday price
updates without hammering the yfinance API on every API request.

price_metadata document schema
-------------------------------
{
  "symbol":          "RELIANCE.NS",  // NSE ticker
  "last_fetch_date": "2026-03-24",   // date of last successful fetch
  "last_fetch_hour": 14              // hour (IST, 0-23) of last fetch
}
"""

from datetime import datetime, time

import pytz
import logging

from database.collections import price_metadata

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# IST timezone + NSE market hours constants
# ---------------------------------------------------------------------------

IST = pytz.timezone("Asia/Kolkata")

NSE_OPEN  = time(9, 15)    # 09:15 IST — pre-open session ends, main market opens
NSE_CLOSE = time(15, 30)   # 15:30 IST — market closes

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _now_ist() -> datetime:
    """Return the current datetime in IST (UTC+05:30)."""
    return datetime.now(IST)


def _today_str() -> str:
    """Return today's date as 'YYYY-MM-DD' in IST."""
    return _now_ist().strftime("%Y-%m-%d")


def _now_hour_ist() -> int:
    """Return the current hour (0–23) in IST."""
    return _now_ist().hour


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def is_market_open() -> bool:
    """
    Return True if NSE is currently open (Mon–Fri, 09:15–15:30 IST).

    Note: This does NOT account for NSE public holidays (Diwali Muhurat
    trading, etc.). For a production system, inject a holiday calendar.
    """
    now = _now_ist()
    if now.weekday() >= 5:   # Saturday=5, Sunday=6
        return False
    current_time = now.time().replace(second=0, microsecond=0)
    return NSE_OPEN <= current_time <= NSE_CLOSE


def is_today_data_fresh(symbol: str) -> bool:
    """
    Return True if the cached data for `symbol` is still fresh given the
    current market state (see module docstring for the full policy).

    Called by needs_refresh() for every symbol before a screener / startup run.
    """
    now = _now_ist()

    # Weekend: no new bars are published — any existing data is fine
    if now.weekday() >= 5:
        return price_metadata.find_one({"symbol": symbol}) is not None

    today = _today_str()
    doc   = price_metadata.find_one({"symbol": symbol})

    # No record at all → never fetched → stale
    if not doc:
        return False

    # Fetched on a previous calendar day → stale (we need today's bar)
    if doc.get("last_fetch_date") != today:
        return False

    if is_market_open():
        # During market hours: allow one re-fetch per clock hour so we pick
        # up intraday price changes without hammering yfinance on each request.
        last_hour = doc.get("last_fetch_hour", -1)
        return last_hour == _now_hour_ist()

    # Post-market (after 15:30):
    # We need to make sure we've fetched AT LEAST ONCE after the market close (15:30).
    # To be safe, we check if the last fetch was at or after 15:45 IST.
    last_hour = doc.get("last_fetch_hour", -1)
    last_min  = doc.get("last_fetch_min", 0)
    
    # If the current time is after 15:30, check if we have the closing bar.
    if now.time() > NSE_CLOSE:
        if last_hour < 15:
            return False
        if last_hour == 15 and last_min < 45:
            return False
            
    return True


def mark_symbol_fetched(symbol: str) -> None:
    """
    Upsert a price_metadata record for `symbol`, recording the current date,
    hour, and minute (IST). Called immediately after a successful yfinance download.
    """
    now = _now_ist()
    price_metadata.update_one(
        {"symbol": symbol},
        {"$set": {
            "symbol":          symbol,
            "last_fetch_date": _today_str(),
            "last_fetch_hour": now.hour,
            "last_fetch_min":  now.minute,
        }},
        upsert=True,
    )


def needs_refresh(symbol: str) -> bool:
    """
    Return True when we should call yfinance for fresh data.
    This is simply the logical inverse of is_today_data_fresh().

    True when:
      - No data has ever been fetched for this symbol, OR
      - Market is open and the last fetch was more than 1 hour ago, OR
      - Market has closed today but we haven't fetched the closing bar yet.
    """
    return not is_today_data_fresh(symbol)


def mark_all_stale(symbols: list) -> None:
    """
    Force-mark a list of symbols as stale by removing their price_metadata
    records. The next call to needs_refresh() will return True for all of
    them, triggering a fresh yfinance download.
    """
    try:
        from database.collections import price_metadata
        ns_symbols = [s if s.endswith(".NS") else s + ".NS" for s in symbols]
        price_metadata.delete_many({"symbol": {"$in": ns_symbols}})
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"mark_all_stale failed: {e}")
