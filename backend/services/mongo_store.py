"""
=============================================================================
MongoDB Store for Daily Stock Prices  —  services/mongo_store.py
=============================================================================
Provides read/write helpers so the rest of the application can interact
with the `daily_prices` MongoDB collection without dealing with raw pymongo.

Collection: daily_prices
Index:      (symbol, date) — unique compound index created on module import.

Document schema
---------------
{
  "symbol":  "RELIANCE.NS",              // NSE ticker (Yahoo Finance format)
  "date":    ISODate("2026-03-24T00:00") // UTC midnight (tz-naive stored)
  "open":    1430.5,
  "high":    1445.0,
  "low":     1422.0,
  "close":   1438.0,
  "volume":  4_123_456
}

Why lowercase field names?
  MongoDB convention is snake_case. The public DataFrame API uses Title-case
  (Date, Open, …) to match pandas and yfinance conventions. The rename
  happens inside load_daily_prices / load_daily_prices_range.
"""

import logging
from datetime import datetime

import pandas as pd
from pymongo import UpdateOne

from database.collections import daily_prices

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Ensure the (symbol, date) unique index exists.
# `create_index` is idempotent — safe to call on every module import.
# ---------------------------------------------------------------------------
try:
    daily_prices.create_index([("symbol", 1), ("date", 1)], unique=True)
except Exception:
    pass   # index already exists or MongoDB is unavailable at import time


# ---------------------------------------------------------------------------
# WRITE
# ---------------------------------------------------------------------------

def upsert_daily_prices(symbol: str, df: pd.DataFrame) -> int:
    """
    Bulk-upsert daily OHLCV rows from `df` into the `daily_prices` collection.

    Uses MongoDB's bulk_write with upsert=True so existing rows are updated
    (e.g. when today's intraday bar gets a final close) rather than duplicated.

    Args:
        symbol: NSE ticker string, e.g. 'RELIANCE.NS'
        df:     DataFrame with columns [Date, Open, High, Low, Close, Volume]

    Returns:
        Number of operations submitted (inserted + updated).
    """
    if df is None or df.empty:
        return 0

    df = df.copy()

    # Accept both 'Date' and 'Datetime' as the date column (yfinance returns
    # 'Datetime' for intraday and 'Date' for daily intervals).
    date_col = "Date" if "Date" in df.columns else "Datetime"
    df["date"] = pd.to_datetime(df[date_col]).dt.tz_localize(None)   # store as tz-naive UTC

    ops = []
    for _, row in df.iterrows():
        try:
            doc = {
                "symbol": symbol,
                "date":   row["date"].to_pydatetime(),
                "open":   float(row["Open"])   if pd.notnull(row["Open"])   else None,
                "high":   float(row["High"])   if pd.notnull(row["High"])   else None,
                "low":    float(row["Low"])    if pd.notnull(row["Low"])    else None,
                "close":  float(row["Close"])  if pd.notnull(row["Close"])  else None,
                "volume": int(row["Volume"])   if pd.notnull(row["Volume"]) else 0,
            }
            ops.append(UpdateOne(
                filter={"symbol": symbol, "date": doc["date"]},  # match key
                update={"$set": doc},
                upsert=True,
            ))
        except Exception as e:
            logger.warning(f"[mongo_store] Skipped row for {symbol}: {e}")

    if not ops:
        return 0

    result = daily_prices.bulk_write(ops, ordered=False)
    logger.info(
        f"[mongo_store] {symbol}: "
        f"{result.upserted_count} inserted, {result.modified_count} updated"
    )
    return len(ops)


# ---------------------------------------------------------------------------
# READ — full history
# ---------------------------------------------------------------------------

def load_daily_prices(symbol: str) -> pd.DataFrame:
    """
    Load all daily OHLCV rows for `symbol` from MongoDB, sorted ascending by date.

    Returns:
        DataFrame with columns [Date, Open, High, Low, Close, Volume].
        Empty DataFrame if no data exists for this symbol.
    """
    docs = list(daily_prices.find({"symbol": symbol}, {"_id": 0}).sort("date", 1))
    if not docs:
        return pd.DataFrame()

    df = pd.DataFrame(docs)
    df.rename(
        columns={"date": "Date", "open": "Open", "high": "High",
                 "low": "Low", "close": "Close", "volume": "Volume"},
        inplace=True,
    )
    df["Date"] = pd.to_datetime(df["Date"])
    return df[["Date", "Open", "High", "Low", "Close", "Volume"]].reset_index(drop=True)


# ---------------------------------------------------------------------------
# READ — date range (used by chart and backtest endpoints)
# ---------------------------------------------------------------------------

def load_daily_prices_range(
    symbol: str,
    start_date,
    end_date,
) -> pd.DataFrame:
    """
    Load daily OHLCV for `symbol` between start_date and end_date (inclusive).

    Args:
        symbol:     NSE ticker string.
        start_date: 'YYYY-MM-DD' string or datetime-like object.
        end_date:   'YYYY-MM-DD' string or datetime-like object.

    Returns:
        DataFrame with columns [Date, Open, High, Low, Close, Volume],
        sorted ascending by date. Empty DataFrame if no matching rows.
    """
    start = pd.to_datetime(start_date)
    end   = pd.to_datetime(end_date)

    docs = list(
        daily_prices.find(
            {
                "symbol": symbol,
                "date":   {"$gte": start.to_pydatetime(), "$lte": end.to_pydatetime()},
            },
            {"_id": 0},
        ).sort("date", 1)
    )

    if not docs:
        return pd.DataFrame()

    df = pd.DataFrame(docs)
    df.rename(
        columns={"date": "Date", "open": "Open", "high": "High",
                 "low": "Low", "close": "Close", "volume": "Volume"},
        inplace=True,
    )
    df["Date"] = pd.to_datetime(df["Date"])
    return df[["Date", "Open", "High", "Low", "Close", "Volume"]].reset_index(drop=True)


# ---------------------------------------------------------------------------
# READ — existence checks (used by fetch_bulk_stock_data)
# ---------------------------------------------------------------------------

def symbol_has_data(symbol: str) -> bool:
    """
    Return True if at least one daily bar exists for `symbol` in MongoDB.
    Used to decide between full-history vs incremental yfinance downloads.
    """
    return daily_prices.find_one({"symbol": symbol}, {"_id": 1}) is not None


def get_last_stored_date(symbol: str):
    """
    Return the most recent date stored in MongoDB for `symbol`,
    or None if no data exists.

    Used to set the `start` date for incremental yfinance downloads so we
    only fetch the bars that are missing (typically today's bar).
    """
    doc = daily_prices.find_one(
        {"symbol": symbol},
        {"date": 1, "_id": 0},
        sort=[("date", -1)],    # descending → first result is the latest date
    )
    return doc["date"] if doc else None
