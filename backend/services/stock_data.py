"""
=============================================================================
StockDataService
=============================================================================
Central service for fetching and caching Indian stock (NSE) OHLCV data.

Architecture overview
---------------------
                ┌─────────────────────────────────────────────┐
                │             API Request (FastAPI)            │
                └──────────────────┬──────────────────────────┘
                                   │
                     ┌─────────────▼─────────────┐
                     │      StockDataService       │
                     └──────┬──────────────┬───────┘
                            │              │
              ┌─────────────▼──┐    ┌──────▼──────────────┐
              │  bulk_cache    │    │      MongoDB          │
              │ (in-memory,    │    │  daily_prices coll.  │
              │  per request)  │    │  (persists across     │
              └────────────────┘    │   restarts)           │
                                    └──────────┬────────────┘
                                               │  only when stale
                                    ┌──────────▼────────────┐
                                    │    Yahoo Finance API   │
                                    │       (yfinance)       │
                                    └───────────────────────┘

Data flow
---------
1. On startup, all symbols are loaded from MongoDB into bulk_cache.
2. Symbols whose data is stale (needs_refresh=True) are re-fetched from
   yfinance — incrementally (today only) if history exists, or in full
   (period='max') for brand-new symbols.
3. Subsequent screener / backtest / chart API calls read from bulk_cache
   or MongoDB — yfinance is skipped entirely unless the data is stale.

Staleness rules (defined in market_hours.py)
--------------------------------------------
- Market OPEN  (09:15–15:30 IST, Mon–Fri): stale if last fetch > 1 hour ago
- Market CLOSED (post-15:30): stale until today's closing bar is fetched once
- Weekend: never stale (no new bars expected)

Intraday timeframes (1m, 5m, 15m, 30m, 1h)
-------------------------------------------
These are NOT stored in MongoDB. They are always fetched live from yfinance
because the data is too granular, rate-limited, and short-lived to cache.
"""

import datetime
import logging
from typing import List, Dict, Any

import pandas as pd
import yfinance as yf
import numpy as np

from data.nifty_stocks import get_all_stocks, NIFTY50
from services.mongo_store import (
    upsert_daily_prices,
    load_daily_prices,
    load_daily_prices_range,
    symbol_has_data,
    get_last_stored_date,
)
from services.market_hours import needs_refresh, mark_symbol_fetched
from database.collections import daily_prices

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# These intervals are always fetched live from yfinance; NOT stored in MongoDB.
INTRADAY_INTERVALS = {"1m", "2m", "3m", "5m", "15m", "30m", "1h"}

# Max symbols per yfinance batch download (avoids rate-limit / timeout issues)
DOWNLOAD_BATCH_SIZE = 50

# Number of recent bars to keep per-symbol in memory (enough for 252-day filters)
BULK_CACHE_LIMIT = 400


# =============================================================================
# StockDataService
# =============================================================================

class StockDataService:
    """
    Singleton-style service (all static methods) for fetching and caching
    Indian NSE stock OHLCV data.

    Public surface used by API routes
    ----------------------------------
    - fetch_bulk_stock_data(symbols)   → populate bulk_cache for screener
    - fetch_stock_data_chart(...)      → OHLCV for chart page
    - fetch_stock_data_backtest(...)   → OHLCV for backtesting engine
    - get_latest_price(symbol)         → latest close/volume/change dict
    - get_popular_stocks()             → Nifty 50 list
    - get_all_stocks()                 → full stock universe
    - get_stocks_by_index(index)       → stocks filtered by index
    - get_stocks_by_sector(sector)     → stocks filtered by sector
    - get_all_sectors()                → sorted list of all sectors
    - search_stocks(query)             → fuzzy symbol/name search
    """

    # Shared in-memory cache used by the screener. Populated on startup and
    # when data becomes stale. This avoids MongoDB round-trips on every screener call.
    bulk_cache: Dict[str, pd.DataFrame] = {}

    # Per-symbol pre-computed indicators (RSI, MACD, ADX, ATR, Bollinger).
    # Keyed by symbol; each value is a dict with last_close_date fingerprint +
    # indicator Series. Invalidated automatically when a new bar arrives.
    # Avoids re-computing ~5 indicators × 750 symbols on every screener call.
    indicator_cache: Dict[str, Dict[str, Any]] = {}

    # Supported index tickers (used by get_indices endpoint)
    INDICES = {
        "^NSEI":    "Nifty 50",
        "^BSESN":   "Sensex",
        "^NSEBANK": "Nifty Bank",
    }

    # Maps frontend timeframe string → yfinance interval string
    supported_timeframes = {
        "1m": "1m", "2m": "2m", "5m": "5m", "15m": "15m", "30m": "30m", 
        "1h": "1h", "1d": "1d", "1wk": "1wk", "1mo": "1mo",
    }

    # =========================================================================
    # PUBLIC: One-shot bulk load from MongoDB (used at startup)
    # =========================================================================

    @staticmethod
    def bulk_load_from_mongo(symbols: list) -> int:
        """
        Aggregation query that pulls recent bars for `symbols` in batches.
        Uses batches to avoid MongoDB's 32MB in-memory sort limit on Atlas free tier.
        """
        if not symbols:
            return 0

        # Ensure index exists for fast sorting and to prevent memory limit errors
        try:
            daily_prices.create_index([("symbol", 1), ("date", -1)])
        except:
            pass

        loaded = 0
        batch_size = 100
        
        for i in range(0, len(symbols), batch_size):
            batch = symbols[i : i + batch_size]
            try:
                pipeline = [
                    {"$match": {"symbol": {"$in": batch}}},
                    {"$sort":  {"symbol": 1, "date": -1}},
                    {"$group": {
                        "_id":  "$symbol",
                        "rows": {"$push": {
                            "Date":   "$date",
                            "Open":   "$open",
                            "High":   "$high",
                            "Low":    "$low",
                            "Close":  "$close",
                            "Volume": "$volume",
                        }},
                    }},
                    {"$project": {
                        "_id":  1,
                        "rows": {"$slice": ["$rows", BULK_CACHE_LIMIT]},
                    }},
                ]

                for doc in daily_prices.aggregate(pipeline, allowDiskUse=True):
                    symbol = doc["_id"]
                    rows = doc["rows"]
                    if not rows:
                        continue
                    df = pd.DataFrame(rows)
                    df = df.iloc[::-1].reset_index(drop=True)
                    df["Date"] = pd.to_datetime(df["Date"])
                    StockDataService.bulk_cache[symbol] = df
                    loaded += 1
            except Exception as e:
                logger.error(f"[StockDataService] Batch load failed for {len(batch)} symbols: {e}")

        logger.info(f"[StockDataService] bulk_load_from_mongo: loaded {loaded}/{len(symbols)} symbols")
        return loaded

    # =========================================================================
    # PUBLIC: Indicator cache (used by the screener)
    # =========================================================================

    @staticmethod
    def get_cached_indicators(symbol: str):
        """
        Return pre-computed RSI / MACD / ADX / ATR / Bollinger for `symbol`.

        Computes on first access, then re-uses across every screener filter
        call. Invalidates when the last bar in bulk_cache changes (i.e. a new
        daily bar has arrived).
        """
        df = StockDataService.bulk_cache.get(symbol)
        if df is None or df.empty:
            return None

        # Fingerprint = last bar's date — cheap, monotonic
        try:
            fp = df["Date"].iloc[-1]
        except Exception:
            fp = len(df)

        cached = StockDataService.indicator_cache.get(symbol)
        if cached and cached.get("fp") == fp:
            return cached["indicators"]

        # Lazy import to avoid circular dependency
        from services.indicators import IndicatorService
        ind = IndicatorService()
        indicators = {
            "rsi":       ind.calculate_rsi(df),
            "macd":      ind.calculate_macd(df),
            "adx":       ind.calculate_adx(df),
            "atr":       ind.calculate_atr(df),
            "bollinger": ind.calculate_bollinger(df),
        }
        StockDataService.indicator_cache[symbol] = {"fp": fp, "indicators": indicators}
        return indicators

    # =========================================================================
    # PUBLIC: Bulk cache population (used by screener + startup loader)
    # =========================================================================

    @staticmethod
    def has_stale_symbols(symbols: list) -> bool:
        """
        Cheap fast-path check: returns True if at least one symbol in `symbols`
        either has no MongoDB record or is past its staleness window.
        Lets the screener skip spawning a refresh thread on every request.
        """
        for s in symbols:
            if s not in StockDataService.bulk_cache:
                return True
            if needs_refresh(s):
                return True
        return False

    # =========================================================================
    # PUBLIC: Bulk cache population (used by screener + startup loader)
    # =========================================================================

    @staticmethod
    def fetch_bulk_stock_data(symbols: list) -> None:
        """
        Fill bulk_cache for a list of symbols using a MongoDB-first strategy.

        Steps:
          1. If the symbol set changed, clear stale cache.
          2. Load all symbols already in MongoDB into bulk_cache.
          3. Identify which symbols are stale (needs_refresh=True) or entirely
             missing from MongoDB.
          4. Download stale symbols from yfinance in batches of DOWNLOAD_BATCH_SIZE,
             persist to MongoDB, and refresh bulk_cache.

        This is called:
          - On startup (background thread, all ~750 symbols)
          - On each screener / indices API call (typically only re-downloads
            symbols that have gone stale since the last call)
        """
        try:
            # Step 1 — Bulk-load any symbols missing from in-memory cache
            # using a SINGLE aggregation query (was 750 separate find() calls).
            missing_from_cache = [s for s in symbols if s not in StockDataService.bulk_cache]
            if missing_from_cache:
                StockDataService.bulk_load_from_mongo(missing_from_cache)

            # Step 2 — Identify symbols that need a fresh yfinance call
            to_download = [
                s for s in symbols if needs_refresh(s)
            ]

            if not to_download:
                logger.info(
                    f"[StockDataService] All {len(symbols)} symbols fresh "
                    f"in MongoDB — skipping yfinance"
                )
                return

            logger.info(
                f"[StockDataService] {len(to_download)} symbols need refresh "
                f"— downloading from yfinance…"
            )

            # Step 3 — Download in safe batches to respect rate limits
            for start in range(0, len(to_download), DOWNLOAD_BATCH_SIZE):
                batch = to_download[start: start + DOWNLOAD_BATCH_SIZE]
                StockDataService._download_batch(batch)

            logger.info(
                f"[StockDataService] bulk_cache populated for "
                f"{len(StockDataService.bulk_cache)} stocks"
            )

        except Exception as e:
            logger.error(f"[StockDataService] fetch_bulk_stock_data failed: {e}")

    # =========================================================================
    # PRIVATE: Download helpers
    # =========================================================================

    @staticmethod
    def _download_batch(batch: list) -> None:
        """
        Smart incremental download for a single batch of symbols.

        - New symbols  (no MongoDB history): download full history (period='max')
          This is a one-time cost; subsequent calls will be incremental.
        - Existing symbols (history in MongoDB): download only from the last
          stored date so we get just the missing bars (usually 1 bar = today).
          This is very fast — typically < 5 seconds for 50 symbols.
        """
        new_symbols      = [s for s in batch if not symbol_has_data(s)]
        existing_symbols = [s for s in batch if symbol_has_data(s)]

        # Full history download for brand-new symbols (one-time cost)
        if new_symbols:
            logger.info(
                f"[StockDataService] Full-history download for "
                f"{len(new_symbols)} new symbols"
            )
            StockDataService._run_yf_download(new_symbols, period="max")

        # Incremental download for symbols that already have history
        if existing_symbols:
            dates = [
                d for s in existing_symbols
                if (d := get_last_stored_date(s)) is not None
            ]

            if dates:
                # Use the earliest last-stored-date so no symbol misses a bar.
                # E.g. if RELIANCE was last stored 2026-03-21 and TCS 2026-03-24,
                # we start from 2026-03-21 — a single API call covers both.
                start_str = min(dates).strftime("%Y-%m-%d")
                logger.info(
                    f"[StockDataService] Incremental update for "
                    f"{len(existing_symbols)} symbols from {start_str} (fast)"
                )
                StockDataService._run_yf_download(existing_symbols, start=start_str)
            else:
                # Fallback: last dates not retrievable — full download
                StockDataService._run_yf_download(existing_symbols, period="max")

    @staticmethod
    def _run_yf_download(
        symbols: list,
        period: str = None,
        start: str = None,
    ) -> None:
        """
        Execute a single yfinance bulk download call, then persist each
        symbol's OHLCV data to MongoDB and refresh bulk_cache.

        Args:
            symbols: List of Yahoo Finance ticker strings (e.g. 'RELIANCE.NS')
            period:  yfinance period string (e.g. 'max', '5d'). Used when
                     start is not given (full history download).
            start:   ISO date string 'YYYY-MM-DD'. When provided, download
                     from this date up to tomorrow (incremental mode).
        """
        try:
            kwargs = dict(
                tickers=symbols,
                interval="1d",
                group_by="ticker",
                auto_adjust=True,   # adjusts for splits / dividends
                threads=True,
                progress=False,
            )

            if start:
                # Incremental mode: fetch from start up to tomorrow so today's
                # intraday bar is included even before market close.
                tomorrow = (datetime.date.today() + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
                kwargs["start"] = start
                kwargs["end"]   = tomorrow
            else:
                kwargs["period"] = period or "max"

            data = yf.download(**kwargs)

            if data is None or data.empty:
                logger.warning("[StockDataService] yfinance returned empty data")
                return

            is_multi = len(symbols) > 1

            for symbol in symbols:
                try:
                    df = StockDataService._extract_symbol_df(data, symbol, is_multi)
                    if df.empty:
                        logger.error(f"[StockDataService] DOWNLOAD FAILED: No usable data for {symbol} (check ticker or yfinance status)")
                        continue

                    # Persist new/updated bars to MongoDB
                    upsert_daily_prices(symbol, df)

                    # Stamp this symbol as freshly fetched (resets staleness timer)
                    mark_symbol_fetched(symbol)

                    # Update in-memory cache directly with the freshly fetched
                    # DataFrame — previously we did another Mongo round-trip
                    # here via load_daily_prices(), which was redundant and
                    # slow on Atlas free tier.
                    existing = StockDataService.bulk_cache.get(symbol)
                    if existing is not None and not existing.empty:
                        # Append new bars, drop dups on Date, keep tail
                        merged = pd.concat([existing, df], ignore_index=True)
                        merged.drop_duplicates(subset=["Date"], keep="last", inplace=True)
                        merged.sort_values("Date", inplace=True)
                        StockDataService.bulk_cache[symbol] = (
                            merged.tail(BULK_CACHE_LIMIT).reset_index(drop=True)
                        )
                    else:
                        StockDataService.bulk_cache[symbol] = (
                            df.tail(BULK_CACHE_LIMIT).reset_index(drop=True)
                        )

                    # Invalidate cached indicators — they'll be recomputed lazily
                    StockDataService.indicator_cache.pop(symbol, None)

                except Exception as e:
                    logger.error(f"[StockDataService] Error processing {symbol}: {str(e)}")

        except Exception as e:
            logger.error(f"[StockDataService] yfinance bulk download failed for batch: {str(e)}")

    @staticmethod
    def _extract_symbol_df(data, symbol: str, is_multi: bool) -> pd.DataFrame:
        """
        Extract a clean OHLCV DataFrame for one symbol from a yfinance result.

        yfinance response formats (varies by version):
          - Multi-ticker (is_multi=True, new yfinance ≥0.2.x):
              MultiIndex columns — (ticker, field) where ticker=level0, field=level1
              e.g. ('RELIANCE.NS', 'Close'), ('RELIANCE.NS', 'Open'), ...
              → use data.xs(symbol, axis=1, level=0)
          - Multi-ticker (is_multi=True, old yfinance):
              data[symbol] returns a sub-DataFrame with flat columns
          - Single-ticker (is_multi=False):
              data is already the stock's flat DataFrame

        Returns a DataFrame with columns [Date, Open, High, Low, Close, Volume],
        or an empty DataFrame if extraction fails.
        """
        try:
            # ── Extract the per-symbol slice ──────────────────────────────────
            if is_multi:
                if isinstance(data.columns, pd.MultiIndex):
                    # New yfinance: MultiIndex (ticker, field) — ticker at level 0
                    tickers_available = data.columns.get_level_values(0).unique().tolist()
                    if symbol not in tickers_available:
                        logger.warning(f"[StockDataService] {symbol} missing from MultiIndex")
                        return pd.DataFrame()
                    df = data.xs(symbol, axis=1, level=0).copy()
                else:
                    # Old yfinance: dict-style access
                    if symbol not in data:
                        return pd.DataFrame()
                    df = data[symbol].copy()
            else:
                df = data.copy()

            if df is None or df.empty:
                return pd.DataFrame()

            df.reset_index(inplace=True)

            # ── Normalise the date column name ────────────────────────────────
            # yfinance uses 'Date' for daily and 'Datetime' for intraday.
            date_col = next(
                (c for c in df.columns if str(c).lower() in ("date", "datetime")),
                None,
            )
            if date_col is None:
                logger.warning(f"[StockDataService] {symbol}: no Date column found")
                return pd.DataFrame()
            if date_col != "Date":
                df.rename(columns={date_col: "Date"}, inplace=True)

            # ── Normalise OHLCV column names (case-insensitive) ───────────────
            # Needed because some yfinance versions return lowercase column names.
            canonical = {"open": "Open", "high": "High", "low": "Low",
                         "close": "Close", "volume": "Volume"}
            col_map = {
                col: canonical[str(col).strip().lower()]
                for col in df.columns
                if str(col).strip().lower() in canonical
            }
            df.rename(columns=col_map, inplace=True)

            # ── Select only the 6 standard columns ───────────────────────────
            needed = ["Date", "Open", "High", "Low", "Close", "Volume"]
            missing = [c for c in needed if c not in df.columns]
            if missing:
                logger.warning(f"[StockDataService] {symbol} missing columns: {missing}")
                return pd.DataFrame()

            df = df[needed].copy()
            df.dropna(subset=["Close"], inplace=True)   # drop rows with no closing price
            return df.reset_index(drop=True)

        except Exception as e:
            logger.warning(f"[StockDataService] _extract_symbol_df error for {symbol}: {e}")
            return pd.DataFrame()

    # =========================================================================
    # PUBLIC: Single-symbol helpers (used by chart + backtest routes)
    # =========================================================================

    @staticmethod
    def fetch_stock_data_chart(
        symbol: str,
        start_date: str,
        end_date: str,
        timeframe: str = "1d",
        ) -> pd.DataFrame:

        try:
            ticker = yf.Ticker(symbol)

            df = ticker.history(
                period="max",
                interval=timeframe,
                auto_adjust=True,
            )

            if df.empty:
                return pd.DataFrame()

            df.reset_index(inplace=True)

            if "Datetime" in df.columns:
                df.rename(columns={"Datetime": "Date"}, inplace=True)

            df = df[["Date", "Open", "High", "Low", "Close", "Volume"]]
            df["Date"] = pd.to_datetime(df["Date"])

            # 🔥 FIX for weekly timeframe crash
            import numpy as np
            # df = df.replace([np.inf, -np.inf], None)

            # drop invalid candles
            df = df.dropna(subset=["Close"])

            # optional: forward fill for smooth chart
            df["Close"] = df["Close"].ffill()

            return df.reset_index(drop=True)

        except Exception as e:
            logger.error(f"[StockDataService] Chart fetch error {symbol}: {e}")
        
        
        return pd.DataFrame()

    @staticmethod
    
    def fetch_stock_data_backtest(
        symbol: str,
        start_date: str,
        end_date: str,
        timeframe: str = "1d",
    ) -> pd.DataFrame:
        """
        Return OHLCV data for the backtesting engine directly from yfinance.
        """
        try:
            interval = StockDataService.TIMEFRAME_MAP.get(timeframe, "1d")

            ticker = yf.Ticker(symbol)
            df = ticker.history(
                start=start_date, end=end_date,
                interval=interval, auto_adjust=True,
            )
            if df.empty:
                return pd.DataFrame()

            df.reset_index(inplace=True)
            if "Datetime" in df.columns:
                df.rename(columns={"Datetime": "Date"}, inplace=True)
            df = df[["Date", "Open", "High", "Low", "Close", "Volume"]]
            df["Date"] = pd.to_datetime(df["Date"])
            # Do NOT replace NaN with None here. The backtest engine needs
            # real floats (NaN is a float) for arithmetic. If we use None,
            # we get TypeError: unsupported operand type(s) for -: 'NoneType' and 'float'.
            # df = df.replace([np.nan, np.inf, -np.inf], None)
            
            # Instead, handle inf if needed, but keep it numeric
            df = df.replace([np.inf, -np.inf], np.nan)
            return df.reset_index(drop=True)

        except Exception as e:
            logger.error(f"[StockDataService] Backtest fetch error {symbol}: {e}")
            return pd.DataFrame()

    @staticmethod
    def get_latest_price(symbol: str) -> Dict[str, Any]:
        """
        Return the latest close price, volume, and 1-day change for a symbol.
        Reads from bulk_cache first, then falls back to MongoDB.
        Never calls yfinance — for the most current quote use the chart endpoint.
        """
        try:
            df = StockDataService.bulk_cache.get(symbol)
            if df is None or df.empty:
                df = load_daily_prices(symbol)   # MongoDB fallback
            if df is None or df.empty:
                return None

            latest = df.iloc[-1]
            prev   = df.iloc[-2] if len(df) > 1 else latest
            change = ((latest["Close"] - prev["Close"]) / prev["Close"]) * 100

            return {
                "symbol":     symbol,
                "name":       symbol.replace(".NS", ""),
                "price":      latest["Close"],
                "volume":     latest["Volume"],
                "market_cap": 0,          # not stored; use fundamental analysis page
                "sector":     "Unknown",  # not stored here; see nifty_stocks.py
                "pe_ratio":   0,
                "change":     round(change, 2),
            }
        except Exception as e:
            logger.error(f"[StockDataService] get_latest_price error {symbol}: {e}")
            return None

    # =========================================================================
    # PUBLIC: Metadata lookups (read from nifty_stocks.py, no DB needed)
    # =========================================================================

    @staticmethod
    def search_stocks(query: str) -> List[Dict[str, str]]:
        """Return stocks whose symbol or name contains the query (case-insensitive)."""
        q = query.lower()
        return [
            s for s in get_all_stocks()
            if q in s["symbol"].lower() or q in s["name"].lower()
        ]

    @staticmethod
    def get_popular_stocks() -> list:
        """Return the Nifty 50 list (hardcoded in nifty_stocks.py)."""
        return NIFTY50

    @staticmethod
    def get_all_stocks() -> list:
        """Return the full stock universe (~750 stocks)."""
        return get_all_stocks()

    @staticmethod
    def get_stocks_by_index(index_name: str) -> list:
        """Return all stocks belonging to the given index (e.g. 'NIFTY50')."""
        return [s for s in get_all_stocks() if s.get("index") == index_name]

    @staticmethod
    def get_stocks_by_sector(sector: str) -> list:
        """Return all stocks belonging to the given sector index (e.g. 'NIFTY_IT')."""
        return [s for s in get_all_stocks() if s.get("sector_index") == sector]

    @staticmethod
    def get_indices() -> list:
        """Return the list of broad market index tickers."""
        return [{"symbol": sym, "name": name} for sym, name in StockDataService.INDICES.items()]

    @staticmethod
    def get_all_sectors() -> list:
        """Return a sorted list of all unique sector names."""
        return sorted({s["sector"] for s in get_all_stocks()})
