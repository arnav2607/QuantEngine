"""
=============================================================================
QuantEdge API Server  —  backend/server.py
=============================================================================
FastAPI application serving the QuantEdge trading platform backend.

API groups (all prefixed with /api)
------------------------------------
  Strategies    GET/POST/DELETE  /strategies
  Backtest      POST             /backtest/run
                GET              /backtest/results/{id}
  Screener      GET              /screener/filters
                POST             /screener
  Indices       GET              /indices?universe_type=...
  Stocks        GET              /stocks/all
                GET              /stocks/popular
                GET              /stocks/search
                GET              /stocks/{symbol}/price
                GET              /stocks/{symbol}/chart
  Indicators    GET              /indicators/info
  Fundamental   GET              /fundamental/{symbol}

Database connections
---------------------
  Motor (async) → `db`  → used for strategies and backtest_results
  PyMongo (sync) → `database/mongo.py:db` → used by StockDataService, mongo_store

  Both connect to the same MongoDB instance and the same database,
  controlled by the MONGO_URL and DB_NAME env vars in backend/.env.

Startup
-------
  On application startup, a background thread downloads and caches daily
  OHLCV data for all stocks in the universe into bulk_cache (in-memory) and
  MongoDB (persisted). Subsequent API calls serve from cache.
  See: StockDataService.fetch_bulk_stock_data, services/stock_data.py
"""

import threading
from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import yfinance as yf
import logging
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime, timezone
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.append('/app/backend')

from models import (
    Strategy, StrategyCreate, BacktestResult, ScreenerRequest, 
    ScreenerResult, StockData, IndicatorCondition
)
from services.stock_data import StockDataService
from services.indicators import IndicatorService
from services.backtest import BacktestEngine
from services.advanced_screener import AdvancedScreener
from data.strategy_templates import get_all_templates, get_template_by_id
from data.nifty_stocks import get_all_stocks as get_all_stocks_list

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="QuantEdge API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def process_symbol(symbol, request, screener):

    try:

        df = StockDataService.bulk_cache.get(symbol)

        if df is None or df.empty:
            return None

        latest = df.iloc[-1]

        stock_info = {
            "symbol": symbol,
            "name": symbol,
            "price": latest["Close"],
            "volume": latest["Volume"]
        }

        matched_filters = []

        for filter_item in request.filters:

            filter_type = filter_item.filter_type
            params = filter_item.params or {}
            matched = False

            if filter_type in screener.PRICE_ACTION:
                matched = screener.screen_price_action(df, filter_type, params)

            elif filter_type in screener.VOLUME:
                matched = screener.screen_volume(df, filter_type, params)

            elif filter_type in screener.MOMENTUM:
                matched = screener.screen_momentum(df, filter_type, params)

            elif filter_type in screener.VOLATILITY:
                matched = screener.screen_volatility(df, filter_type, params)

            elif filter_type in screener.PATTERNS:
                matched = screener.screen_pattern(df, filter_type, params)

            elif filter_type in screener.PERFORMANCE:
                matched = screener.screen_performance(df, filter_type, params)

            # IMPORTANT: fail immediately if a filter fails
            if not matched:
                return None

        matched_filters.append(filter_type)

        current_price = df["Close"].iloc[-1]
        prev_price = df["Close"].iloc[-2]

        change_percent = ((current_price - prev_price) / prev_price) * 100

        indicator_values = {
            "%Change": round(change_percent, 2),
            "52w_high": round(df["High"].tail(252).max(), 2),
            "52w_low": round(df["Low"].tail(252).min(), 2),
            "Avg_Vol_20d": f"{round(df['Volume'].tail(20).mean() / 1000, 2)}K",
        }

        return ScreenerResult(
            symbol=symbol.replace(".NS", ""),
            name=stock_info["name"],
            price=stock_info["price"],
            volume=stock_info["volume"],
            matched_filters=matched_filters,
            indicator_values=indicator_values
        )

    except Exception as e:
        logger.error(f"Screener error for {symbol}: {str(e)}")
        return None

@api_router.get("/")
async def root():
    return {"message": "QuantEdge API - Strategy Backtester & Stock Screener"}


@api_router.get("/stocks/popular")
async def get_popular_stocks():
    """Get list of popular Indian stocks (Nifty 50)"""
    
    return StockDataService.get_popular_stocks()


@api_router.get("/stocks/all")
async def get_all_stocks():
    """Get complete stock database (100+ stocks)"""
    return StockDataService.get_all_stocks()



@api_router.get("/stocks/index/{index_name}")
async def get_stocks_by_index(index_name: str):
    """Get stocks filtered by index (Nifty 50, Nifty Bank, etc.)"""
    return StockDataService.get_stocks_by_index(index_name)


@api_router.get("/stocks/sector/{sector}")
async def get_stocks_by_sector(sector: str):
    """Get stocks filtered by sector"""
    return StockDataService.get_stocks_by_sector(sector)


@api_router.get("/stocks/sectors")
async def get_all_sectors():
    """Get list of all available sectors"""
    return StockDataService.get_all_sectors()


@api_router.get("/stocks/indices")
async def get_indices():
    """Get list of Indian stock indices"""
    return StockDataService.get_indices()


@api_router.get("/stocks/search")
async def search_stocks(query: str):
    """Search for stocks by symbol or name"""
    return StockDataService.search_stocks(query)


@api_router.get("/stocks/{symbol}/price")
async def get_stock_price(symbol: str):
    """Get latest price and info for a stock"""
    result = StockDataService.get_latest_price(symbol)
    if not result:
        raise HTTPException(status_code=404, detail="Stock not found")
    return result


@api_router.get("/stocks/{symbol}/data")
async def get_stock_data(symbol: str, start_date: str, end_date: str, timeframe: str = "1d"):
    """Get historical stock data with optional indicators"""
    df = StockDataService.fetch_stock_data_chart(symbol, start_date, end_date, timeframe)
    
    if df.empty:
        raise HTTPException(status_code=404, detail="No data found for the given parameters")
    
    data = df.to_dict('records')
    for record in data:
        if 'Date' in record and hasattr(record['Date'], 'isoformat'):
            record['Date'] = record['Date'].isoformat()
    
    return {"symbol": symbol, "data": data}


@api_router.get("/indicators/info")
async def get_indicators_info():
    """Get information about all supported indicators"""
    return IndicatorService.get_indicator_info()


@api_router.get("/strategies/templates")
async def get_strategy_templates():
    """Get famous pre-built strategy templates"""
    return get_all_templates()


@api_router.get("/strategies/templates/{template_id}")
async def get_strategy_template(template_id: str):
    """Get specific strategy template by ID"""
    template = get_template_by_id(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@api_router.post("/strategies", response_model=Strategy)
async def create_strategy(strategy: StrategyCreate):
    """Create and save a new strategy"""
    strategy_obj = Strategy(**strategy.model_dump())
    
    doc = strategy_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.strategies.insert_one(doc)
    return strategy_obj


@api_router.get("/strategies", response_model=List[Strategy])
async def get_strategies(limit: int = 50):
    """Get all saved strategies"""
    strategies = await db.strategies.find({}, {"_id": 0}).to_list(limit)
    
    for strategy in strategies:
        if isinstance(strategy.get('created_at'), str):
            strategy['created_at'] = datetime.fromisoformat(strategy['created_at'])
        if isinstance(strategy.get('updated_at'), str):
            strategy['updated_at'] = datetime.fromisoformat(strategy['updated_at'])
    
    return strategies


@api_router.get("/strategies/{strategy_id}", response_model=Strategy)
async def get_strategy(strategy_id: str):
    """Get a specific strategy by ID"""
    strategy = await db.strategies.find_one({"id": strategy_id}, {"_id": 0})
    
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    if isinstance(strategy.get('created_at'), str):
        strategy['created_at'] = datetime.fromisoformat(strategy['created_at'])
    if isinstance(strategy.get('updated_at'), str):
        strategy['updated_at'] = datetime.fromisoformat(strategy['updated_at'])
    
    return strategy


@api_router.delete("/strategies/{strategy_id}")
async def delete_strategy(strategy_id: str):
    """Delete a strategy"""
    result = await db.strategies.delete_one({"id": strategy_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    return {"message": "Strategy deleted successfully"}


from datetime import datetime,timedelta
import pandas as pd

# yfinance timeframe limits
TIMEFRAME_LIMITS = {
    "1m": 7,
    "2m": 60,
    "5m": 60,
    "15m": 60,
    "30m": 60,
    "1h": 730,
}


from datetime import datetime, timedelta
from fastapi import HTTPException

@api_router.post("/backtest", response_model=BacktestResult)
async def run_backtest(strategy: StrategyCreate):
    """Run backtest for a strategy"""
    try:
        # ✅ Validate stock
        if not strategy.stocks or len(strategy.stocks) == 0:
            raise HTTPException(status_code=400, detail="At least one stock symbol is required")
        
        symbol = strategy.stocks[0]

        # ✅ Ensure datetime (IMPORTANT FIX)
        start_date = strategy.start_date
        end_date = strategy.end_date

        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date)

        if isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date)

        # ✅ Validate date range
        if start_date >= end_date:
            raise HTTPException(status_code=400, detail="Invalid date range")

        # ✅ Apply timeframe limits
        warning_msg = None

        if strategy.timeframe in TIMEFRAME_LIMITS:
            limit_days = TIMEFRAME_LIMITS[strategy.timeframe]
            safer_buffer = 2  # extra days to ensure we get enough data even if there are missing days
            max_start = end_date - timedelta(days=limit_days-5)

            if start_date < max_start:
                start_date = max_start
                warning_msg = (
                    f"Start date adjusted to {start_date.date()} "
                    f"due to timeframe limits for {strategy.timeframe}"
                )

        # ✅ Fetch data
        df = StockDataService.fetch_stock_data_backtest(
            symbol,
            start_date,
            end_date,
            strategy.timeframe
        )

        if df.empty:
            raise HTTPException(status_code=404, detail="No stock data found")

        # ✅ Run backtest
        strategy_obj = Strategy(**strategy.model_dump())
        engine = BacktestEngine(df, strategy_obj)
        result = engine.run_backtest()

        # ✅ Convert for DB
        doc = result.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()

        # ✅ Add warning (optional, does NOT break backend)
        if warning_msg:
            doc["warning"] = warning_msg

        await db.backtest_results.insert_one(doc)

        # ✅ Return response (with optional warning)
        if warning_msg:
            result_dict = result.model_dump()
            result_dict["warning"] = warning_msg
            return result_dict

        return result

    except HTTPException:
        raise  # ✅ don't override proper errors

    except Exception as e:
        logger.error(f"Backtest error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/backtest/results/{strategy_id}", response_model=List[BacktestResult])
async def get_backtest_results(strategy_id: str):
    """Get backtest results for a strategy"""
    results = await db.backtest_results.find({"strategy_id": strategy_id}, {"_id": 0}).to_list(100)
    
    for result in results:
        if isinstance(result.get('created_at'), str):
            result['created_at'] = datetime.fromisoformat(result['created_at'])
    
    return results




@api_router.get("/indices", response_model=List[ScreenerResult])
async def get_indices(universe_type: str):

    screener = AdvancedScreener()
    results = []

    # -----------------------------
    # STEP 1: Select Universe
    # -----------------------------
    if universe_type == "ALL":
        stocks = get_all_stocks()

    elif universe_type in screener.INDEXES:
        stocks = StockDataService.get_stocks_by_index(universe_type)
        stocks=await db.stock_master.find({"index": universe_type}, {"_id": 0}).to_list()

    elif universe_type in screener.SECTORS:
        stocks = StockDataService.get_stocks_by_sector(universe_type) 

    else:
        raise HTTPException(status_code=400, detail="Invalid universe type")

    # -----------------------------
    # STEP 2: Prepare symbol list
    # -----------------------------
    symbols = [s["symbol"] for s in stocks]

    logger.info(f"Universe Size: {len(symbols)}")

    # -----------------------------
    # STEP 3: Load bulk data
    # (always call — handles cache invalidation internally)
    # -----------------------------
    StockDataService.fetch_bulk_stock_data(symbols)

    # -----------------------------
    # STEP 4: Process stocks
    # -----------------------------
    for stock in stocks:

        symbol = stock["symbol"]
        name = stock["company_name"]

        df = StockDataService.bulk_cache.get(symbol)

        if df is None or df.empty:
            continue

        latest = df.iloc[-1]

        price = latest["Close"]
        volume = latest["Volume"]

        # Skip rows with NaN price or volume
        if price != price or volume != volume:  # NaN check
            price=0.0
            volume=0.0

        results.append(
            ScreenerResult(
                symbol=symbol.replace(".NS", ""),
                name=name,
                price=price,
                volume=volume,
                matched_filters=["Universe"],
                indicator_values={}
            )
        )

    return results


@api_router.post("/screener", response_model=List[ScreenerResult])
async def run_screener(request: ScreenerRequest):

    screener = AdvancedScreener()
    results = []

    # -----------------------------
    # STEP 1: SELECT UNIVERSE
    # -----------------------------
    if request.universe_type == "ALL":
        stocks = get_all_stocks()

    elif request.universe_type in screener.INDEXES:
        stocks = StockDataService.get_stocks_by_index(request.universe_type)

    elif request.universe_type in screener.SECTORS:
        stocks = StockDataService.get_stocks_by_sector(request.universe_type)

    else:
        raise HTTPException(status_code=400, detail="Invalid universe type")

    symbols = [s["symbol"] for s in stocks]

    logger.info(f"Universe Size: {len(symbols)}")

    # -----------------------------
    # STEP 2: PRELOAD BULK DATA
    # (always call — handles cache invalidation internally)
    # -----------------------------
    StockDataService.fetch_bulk_stock_data(symbols)

    # -----------------------------
    # NO FILTER CASE (FAST PATH)
    # -----------------------------
    if not request.filters:

        for stock in stocks:

            symbol = stock["symbol"]
            name = stock["name"]

            df = StockDataService.bulk_cache.get(symbol)

            if df is None or df.empty:
                continue

            latest = df.iloc[-1]

            price = latest["Close"]
            volume = latest["Volume"]

            if price != price or volume != volume:  # NaN check
                price=0.0
                volume=0.0

            results.append(
                ScreenerResult(
                    symbol=symbol.replace(".NS", ""),
                    name=name,
                    price=price,
                    volume=volume,
                    matched_filters=["Universe"],
                    indicator_values={}
                )
            )

        return results

    # -----------------------------
    # PARALLEL SCREENING
    # -----------------------------

    with ThreadPoolExecutor(max_workers=12) as executor:

        futures = {
            executor.submit(process_symbol, stock["symbol"], request, screener): stock
            for stock in stocks
        }

        for future in futures:

            result = future.result()

            if result:
                results.append(result)

    print("Total matched stocks:", len(results))

    return results

@api_router.get("/screener/filters")
async def get_screener_filters():
    """Return all available screener filters"""

    return {
        "indices": [
            {
                "id": "NIFTY50",
                "name": "Nifty 50",
                "description": "Stocks in Nifty 50 index"
            },
             {
                "id":"NIFTYNEXT50",
                "name": "Nifty Next 50",
                "description": "Stocks in Nifty Next 50 index"
            },
            {
                "id": "NIFTY200",
                "name": "Nifty 200",
                "description": "Stocks in Nifty 200 index"
                
            },
            {
                "id":"NIFTY500",
                "name": "Nifty 500",
                "description": "Stocks in Nifty 500 index"
            },
            
            {
                "id": "NIFTYTOTALMARKET",
                "name": "Nifty Total Market",
                "description": "Stocks in Nifty Total Market (750)"
            }
        ],
        
        "sectors":[
            {
                "id":"NIFTY_CHEMICALS",
                "name": "Chemical",
                "description": "Stocks in Chemicals Sector Index"
            },
            {
                "id":"NIFTY_FINANCE",
                "name": "Finance",
                "description": "Stocks in Finance Sector Index"
                
            },
            {
                "id":"NIFTY_IT",
                "name": "IT",
                "description": "Stocks in IT Sector Index"
            },
            {
                "id":"NIFTY_PSUBANK",
                "name": "PSU Banks",
                "description": "Stocks in PSU Bank  Sector Index"
            },
            {
                "id":"NIFTY_AUTO",
                "name": "Auto",
                "description": "Stocks in Auto Sector Index"
            },
            {
                "id":"NIFTY_FMCG",
                "name": "FMCG",
                "description": "Stocks in FMCG Sector Index"
            },
            {
                "id":"NIFTY_METAL",
                "name": "Metal",
                "description": "Stocks in Metal Sector Index"
            },
            {
                "id":"NIFTY_BANK",
                "name": "Banking",
                "description": "Stocks in Banking Sector Index"
            },
            {
                "id":"NIFTY_MEDIA",
                "name": "Media",
                "description": "Stocks in Media Sector Index"
            },
        ],
        "price_action": [
            {
                "id": "52w_high",
                "name": "52-Week High",
                "description": "Price within 2% of 52-week high"
            },
            {
                "id": "ath",
                "name": "All Time High",
                "description": "Stocks at all time High"
            },
            {
                "id": "price_above_ma",
                "name": "Price Above Moving Average",
                "description": "Price above  moving average 9  ",
                "params": ["period"]
            },
            {
                "id": "price_near_low",
                "name": "52-Week Low",
                "description": "Price within 2% of 52-week low"
            },
            # {
            #     "id": "new_high",
            #     "name": "New High (5 Days)",
            #     "description": "Highest price in last 5 days"
            # },
            {
                "id":"new_high",
                "name": "New High Custom LookBack Period",
                "description": "Highest price in last N days",
                "params": ["lookback_period"]
            },
            {
                "id":"new_low",
                "name": "New Low Custom LookBack Period",
                "description": "Lowest price in last N days",
                "params": ["lookback_period"]
                
            }
            # {
            #     "id": "gap_up",
            #     "name": "Gap Up",
            #     "description": "Opening gap up",
            #     "params": ["min_gap"]
            # },
            # {
            #     "id": "gap_down",
            #     "name": "Gap Down",
            #     "description": "Opening gap down",
            #     "params": ["min_gap"]
            # }
        ],

        "volume": [
            {
                "id": "high_volume",
                "name": "High Volume",
                "description": "Customise multiplier and moving average period (default: 2x above 20 day MA)",
                "params": ["period", "multiplier"]
            },
            {
                "id": "unusual_volume",
                "name": "Unusual Volume",
                "description": "Volume 2x above 20 day moving average"
            },
            {
                "id": "volume_spike",
                "name": "Volume Spike",
                "description": "Volume 3x above 20 day moving average"
            },
            {
                "id": "increasing_volume",
                "name": "Increasing Volume",
                "description": "3 consecutive increasing volume candles"
            }
        ],

        "momentum": [
            {
                "id": "strong_adx",
                "name": "Strong Trend (ADX)",
                "description": "ADX above threshold(25)",
                "params": ["threshold"]
            },
            {
                "id": "rsi_oversold",
                "name": "RSI Oversold",
                "description": "RSI below threshold (30)",
                "params": ["threshold"]
            },
            {
                "id": "rsi_overbought",
                "name": "RSI Overbought",
                "description": "RSI above threshold (70)",
                "params": ["threshold"]
            },
            {
                "id": "macd_bullish",
                "name": "MACD Bullish",
                "description": "MACD line above signal line"
            },
            {
                "id": "macd_bearish",
                "name": "MACD Bearish",
                "description": "MACD line below signal line"
            }
        ],

        "volatility": [
            {
                "id": "high_volatility",
                "name": "High Volatility",
                "description": "ATR higher than average"
            },
            {
                "id": "bollinger_squeeze",
                "name": "Bollinger Squeeze",
                "description": "Very tight Bollinger Bands"
            }
        ],

        "patterns": [
            {
                "id": "bullish_engulfing",
                "name": "Bullish Engulfing",
                "description": "Bullish engulfing candle pattern"
            },
            {
                "id": "bearish_engulfing",
                "name": "Bearish Engulfing",
                "description": "Bearish engulfing candle pattern"
            },
            {
                "id": "doji",
                "name": "Doji",
                "description": "Doji candle pattern"
            },
            {
                "id": "hammer",
                "name": "Hammer",
                "description": "Hammer candle pattern"
            }
        ],

        "performance": [
            {
                "id": "gainers_1d",
                "name": "Top Gainers (1 Day)",
                "description": "Daily gainers more than 2% change",
                "params": ["min_gain"]
            },
            {
                "id": "losers_1d",
                "name": "Top Losers (1 Day)",
                "description": "Daily losers more than -2% change",
                "params": ["min_loss"]
            },
            {
                "id": "gainers_1w",
                "name": "Top Gainers (1 Week)",
                "description": "Weekly gainers more than 5% change",
                "params": ["min_gain"]
            },
            {
                "id": "gainers_1m",
                "name": "Top Gainers (1 Month)",
                "description": "Monthly gainers more than 10% change",
                "params": ["min_gain"]
            }
        ]
    }
    
def safe(val, decimals=2):
    """Return rounded float or None — never NaN/Inf."""
    try:
        if val is None:
            return None
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, decimals)
    except Exception:
        return None

def safe_int(val):
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return int(f)
    except Exception:
        return None

def pct(val):
    v = safe(val)
    return round(v * 100, 2) if v is not None else None

"""
Add to your server.py / api_router.
pip install httpx beautifulsoup4 lxml

Scrapes: https://www.screener.in/company/{SYMBOL}/consolidated/
No API key needed. All figures in ₹ Crores (as shown on Screener).
"""

import math
import re
import httpx
from fastapi import HTTPException
from bs4 import BeautifulSoup
from typing import Optional, List, Dict, Any


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _n(text) -> Optional[float]:
    """Parse '19,05,852' or '8.40%' or '-73,070' → float | None."""
    if not text:
        return None
    s = str(text).strip().replace(",", "").replace("%", "").replace("₹", "").replace("Cr.", "").replace("Cr", "").strip()
    # handle negative in parentheses e.g. (73,070)
    if s.startswith("(") and s.endswith(")"):
        s = "-" + s[1:-1]
    try:
        f = float(s)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except Exception:
        return None


def _r(val, dec=2) -> Optional[float]:
    return round(val, dec) if val is not None else None


def _verdict(score: int) -> str:
    if score >= 75: return "STRONG BUY"
    if score >= 60: return "BUY"
    if score >= 45: return "HOLD"
    if score >= 30: return "WEAK"
    return "AVOID"


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.screener.in/",
}


# ─── Table Parser ─────────────────────────────────────────────────────────────

def _parse_section_table(section) -> Dict[str, Any]:
    """
    Parse a <table class="data-table"> inside a section.
    Returns {
        '__headers__': ['Mar 2014', ...],
        'Sales': ['433521', '374372', ...],
        ...
    }
    Numbers already have commas stripped.
    """
    result: Dict[str, Any] = {"__headers__": []}
    if section is None:
        return result

    table = section.find("table", class_="data-table")
    if not table:
        return result

    # Headers (skip first empty th)
    ths = table.select("thead tr th")
    result["__headers__"] = [th.get_text(strip=True) for th in ths[1:]]

    for tr in table.select("tbody tr"):
        tds = tr.find_all("td")
        if not tds:
            continue
        # Row label — strip button noise ("Sales +")
        label = tds[0].get_text(separator=" ", strip=True)
        label = re.sub(r"\s*\+\s*$", "", label).strip()
        label = re.sub(r"\s+", " ", label)
        vals = [td.get_text(strip=True).replace(",", "") for td in tds[1:]]
        result[label] = vals

    return result


def _last_val(tbl: dict, key: str) -> Optional[float]:
    """Latest non-TTM numeric value for a row."""
    rows = tbl.get(key, [])
    headers = tbl.get("__headers__", [])
    # prefer last non-TTM column
    for i in range(len(rows) - 1, -1, -1):
        h = headers[i] if i < len(headers) else ""
        if "TTM" not in h:
            v = _n(rows[i])
            if v is not None:
                return v
    return None


def _ttm_val(tbl: dict, key: str) -> Optional[float]:
    """TTM column value, fallback to last."""
    rows = tbl.get(key, [])
    headers = tbl.get("__headers__", [])
    for i, h in enumerate(headers):
        if "TTM" in h and i < len(rows):
            return _n(rows[i])
    return _last_val(tbl, key)


# ─── CAGR / Range tables ─────────────────────────────────────────────────────

def _parse_range_tables(pl_section) -> Dict[str, Optional[float]]:
    """
    Parse the 4 small `ranges-table` grids under P&L:
      Compounded Sales Growth | Compounded Profit Growth | Stock Price CAGR | Return on Equity
    Returns flat dict like:
      {'sales_cagr_3y': 11, 'profit_cagr_3y': 5, 'price_cagr_3y': 10, 'roe_3y': 9, ...}
    """
    out: Dict[str, Optional[float]] = {}
    if pl_section is None:
        return out

    for tbl in pl_section.find_all("table", class_="ranges-table"):
        rows = tbl.find_all("tr")
        if not rows:
            continue
        title = rows[0].get_text(strip=True).lower()
        for row in rows[1:]:
            cells = row.find_all("td")
            if len(cells) < 2:
                continue
            period = cells[0].get_text(strip=True).lower().replace(":", "").strip()
            val = _n(cells[1].get_text(strip=True))

            if "sales" in title:
                if "10" in period:   out["sales_cagr_10y"] = val
                elif "5" in period:  out["sales_cagr_5y"]  = val
                elif "3" in period:  out["sales_cagr_3y"]  = val
                elif "ttm" in period: out["sales_cagr_ttm"] = val
            elif "profit" in title:
                if "10" in period:   out["profit_cagr_10y"] = val
                elif "5" in period:  out["profit_cagr_5y"]  = val
                elif "3" in period:  out["profit_cagr_3y"]  = val
                elif "ttm" in period: out["profit_cagr_ttm"] = val
            elif "price" in title:
                if "10" in period:   out["price_cagr_10y"] = val
                elif "5" in period:  out["price_cagr_5y"]  = val
                elif "3" in period:  out["price_cagr_3y"]  = val
                elif "1" in period:  out["price_cagr_1y"]  = val
            elif "equity" in title or "roe" in title:
                if "10" in period:     out["roe_10y"]   = val
                elif "5" in period:    out["roe_5y"]    = val
                elif "3" in period:    out["roe_3y"]    = val
                elif "last" in period: out["roe_last"]  = val
    return out


# ─── Scoring ──────────────────────────────────────────────────────────────────

def _score_valuation(pe, pb, roce, div_yield) -> int:
    pts, defined = 0, 0
    if pe is not None:
        pts += 30 if pe < 15 else (20 if pe < 25 else (10 if pe < 40 else 3))
        defined += 1
    if pb is not None:
        pts += 25 if pb < 1.5 else (15 if pb < 3 else (8 if pb < 5 else 3))
        defined += 1
    if roce is not None:
        pts += 25 if roce > 15 else (15 if roce > 10 else (8 if roce > 6 else 3))
        defined += 1
    if div_yield is not None and div_yield > 0:
        pts += 10 if div_yield > 2 else 5
        defined += 1
    return int((pts / max(defined * 22.5, 1)) * 100) if defined else 50


def _score_profitability(roe, roce, opm, npm) -> int:
    pts, defined = 0, 0
    if roe is not None:
        pts += 30 if roe > 20 else (20 if roe > 12 else (10 if roe > 6 else 3))
        defined += 1
    if roce is not None:
        pts += 25 if roce > 15 else (15 if roce > 10 else (8 if roce > 6 else 3))
        defined += 1
    if opm is not None:
        pts += 25 if opm > 20 else (15 if opm > 12 else (8 if opm > 6 else 3))
        defined += 1
    if npm is not None:
        pts += 20 if npm > 12 else (12 if npm > 6 else (6 if npm > 2 else 2))
        defined += 1
    return int((pts / max(defined * 25, 1)) * 100) if defined else 50


def _score_growth(s3, p3, price1) -> int:
    pts = 50
    if s3  is not None: pts += min(s3  * 2,   20)
    if p3  is not None: pts += min(p3  * 2,   20)
    if price1 is not None: pts += min(price1 * 0.5, 10)
    return max(0, min(int(pts), 100))


def _score_health(de, promoter, op_cf, borrowings, reserves, equity_cap) -> int:
    pts, defined = 0, 0
    if de is not None:
        pts += 40 if de < 0.3 else (28 if de < 0.8 else (15 if de < 1.5 else (6 if de < 3 else 0)))
        defined += 1
    if promoter is not None:
        pts += 30 if promoter > 60 else (20 if promoter > 45 else (10 if promoter > 30 else 3))
        defined += 1
    if op_cf is not None:
        pts += 20 if op_cf > 0 else 0
        defined += 1
    return int((pts / max(defined * 30, 1)) * 100) if defined else 50


# ─── Main Endpoint ────────────────────────────────────────────────────────────

@api_router.get("/stocks/{symbol}/fundamental")
async def get_fundamental(symbol: str):
    """
    Scrapes Screener.in consolidated page for full fundamental data.
    Symbol: plain NSE symbol, e.g.  RELIANCE  (no .NS)
    """
    sym = symbol.upper().replace(".NS", "").strip()
    url = f"https://www.screener.in/company/{sym}/"

    try:
        async with httpx.AsyncClient(timeout=25, follow_redirects=True) as client:
            resp = await client.get(url, headers=HEADERS)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Cannot reach Screener.in: {e}")

    # Fallback to standalone if consolidated not found
    if resp.status_code == 404:
        url = f"https://www.screener.in/company/{sym}/"
        try:
            async with httpx.AsyncClient(timeout=25, follow_redirects=True) as client:
                resp = await client.get(url, headers=HEADERS)
        except Exception as e:
            raise HTTPException(status_code=503, detail=str(e))

    if resp.status_code != 200:
        raise HTTPException(status_code=404, detail=f"Symbol '{sym}' not found on Screener.in")

    soup = BeautifulSoup(resp.text, "lxml")

    # ── Company name ──────────────────────────────────────────────────────────
    # <h1 class="margin-0 show-from-tablet-landscape">Reliance Industries Ltd</h1>
    name_el = soup.select_one(".company-nav h1") or soup.find("h1")
    company_name = name_el.get_text(strip=True) if name_el else sym

    # ── Current Price ─────────────────────────────────────────────────────────
    # <div class="font-size-18 strong line-height-14"><div class="flex flex-align-center"><span>₹ 1,409</span>
    price_wrap = soup.select_one(".font-size-18.strong .flex span")
    current_price = _n(price_wrap.get_text(strip=True)) if price_wrap else None

    # ── Price Change ──────────────────────────────────────────────────────────
    # <span class="font-size-12 down">-1.07%</span>  OR  .up
    chg_el = soup.select_one(".font-size-12.down, .font-size-12.up")
    price_change_pct = None
    if chg_el:
        price_change_pct = _n(chg_el.get_text(strip=True))

    # ── Top Ratios  (#top-ratios li) ─────────────────────────────────────────
    # <li><span class="name">Market Cap</span><span class="nowrap value">₹<span class="number">19,05,852</span>Cr.</span></li>
    ratios: Dict[str, str] = {}
    for li in soup.select("#top-ratios li"):
        name_s = li.select_one("span.name")
        num_s  = li.select_one("span.number")
        if name_s and num_s:
            ratios[name_s.get_text(strip=True)] = num_s.get_text(strip=True)

    market_cap   = _n(ratios.get("Market Cap", ""))       # Crores
    stock_pe     = _n(ratios.get("Stock P/E", ""))
    book_value   = _n(ratios.get("Book Value", ""))
    div_yield    = _n(ratios.get("Dividend Yield", ""))   # already in %
    roce         = _n(ratios.get("ROCE", ""))             # already in %
    roe          = _n(ratios.get("ROE", ""))              # already in %
    face_value   = _n(ratios.get("Face Value", ""))

    # 52W High/Low: <span class="nowrap value">₹ <span class="number">1,612</span> / <span class="number">1,115</span></span>
    w52_high, w52_low = None, None
    hl_li = next((li for li in soup.select("#top-ratios li")
                  if "High" in (li.select_one("span.name") or {}).get_text("")), None)
    if hl_li:
        nums = hl_li.select("span.number")
        if len(nums) >= 2:
            w52_high = _n(nums[0].get_text())
            w52_low  = _n(nums[1].get_text())

    # Price to Book
    pb = _r(current_price / book_value) if current_price and book_value and book_value > 0 else None

    # ── About / Description ───────────────────────────────────────────────────
    about_el = soup.select_one(".company-profile .about p ")
    description = about_el.get_text(strip=True) if about_el else ""

    # ── Sector / Industry from #peers breadcrumb ──────────────────────────────
    # <a href="/market/IN03/" title="Broad Sector">Energy</a>
    # <a href="/market/IN03/IN0301/" title="Sector">Oil, Gas …</a>
    # <a href="/market/IN03/IN0301/IN030103/" title="Broad Industry">Petroleum Products</a>
    # <a href="/market/IN03/IN0301/IN030103/IN030103001/" title="Industry">Refineries & Marketing</a>
    sector = industry = broad_sector = None
    for a in soup.select("#peers a[title]"):
        t = a.get("title", "")
        if t == "Broad Sector":  broad_sector = a.get_text(strip=True)
        elif t == "Sector":      sector       = a.get_text(strip=True)
        elif t == "Industry":    industry     = a.get_text(strip=True)

    # ── Index memberships ─────────────────────────────────────────────────────
    indices = [a.get_text(strip=True) for a in soup.select("#benchmarks a.tag")][:6]

    # ── Pros & Cons ───────────────────────────────────────────────────────────
    pros = [li.get_text(strip=True) for li in soup.select("#analysis .pros li")]
    cons = [li.get_text(strip=True) for li in soup.select("#analysis .cons li")]

    # ── Quarterly Results ─────────────────────────────────────────────────────
    qtr_section = soup.find("section", id="quarters")
    qtr = _parse_section_table(qtr_section)
    qtr_hdrs = qtr.get("__headers__", [])

    # ── Profit & Loss ─────────────────────────────────────────────────────────
    pl_section = soup.find("section", id="profit-loss")
    pl = _parse_section_table(pl_section)
    pl_hdrs = pl.get("__headers__", [])

    # Annual revenue trend (skip TTM, last 6 years)
    sales_row   = pl.get("Sales", [])
    profit_row  = pl.get("Net Profit", [])
    opm_row     = pl.get("OPM %", [])
    eps_pl_row  = pl.get("EPS in Rs", [])
    div_payout_row = pl.get("Dividend Payout %", [])

    annual_trend: List[dict] = []
    for i, h in enumerate(pl_hdrs):
        if "TTM" in h:
            continue
        s = _n(sales_row[i])  if i < len(sales_row)  else None
        p = _n(profit_row[i]) if i < len(profit_row) else None
        o = _n(str(opm_row[i]).replace("%", "")) if i < len(opm_row) else None
        e = _n(eps_pl_row[i]) if i < len(eps_pl_row) else None
        annual_trend.append({
            "year":       h,
            "revenue":    s,           # already in Crores
            "net_income": p,
            "opm":        o,
            "eps":        e,
        })
    annual_trend = annual_trend[-7:]   # last 7 years

    # TTM / latest figures
    sales_ttm  = _ttm_val(pl, "Sales")
    profit_ttm = _ttm_val(pl, "Net Profit")
    opm_latest = _r(_n(str(_ttm_val(pl, "OPM %") or "").replace("%", "")))

    # Net margin from TTM
    npm = _r((profit_ttm / sales_ttm) * 100) if sales_ttm and profit_ttm else None

    # Sales / profit growth YoY (last 2 annual years)
    def _yoy(row, hdrs, ttm=False):
        vals = [(h, _n(v)) for h, v in zip(hdrs, row) if ("TTM" in h) == ttm and _n(v) is not None]
        if len(vals) >= 2:
            prev, curr = vals[-2][1], vals[-1][1]
            if prev and prev != 0:
                return _r(((curr - prev) / abs(prev)) * 100)
        return None

    rev_gr_yoy    = _yoy(sales_row,  pl_hdrs, ttm=False)
    profit_gr_yoy = _yoy(profit_row, pl_hdrs, ttm=False)

    # CAGR tables
    cagr = _parse_range_tables(pl_section)

    # ── Quarterly EPS trend ───────────────────────────────────────────────────
    qtr_eps_row = qtr.get("EPS in Rs", [])
    eps_trend: List[dict] = []
    recent_hdrs = qtr_hdrs[-8:]
    for i, h in enumerate(recent_hdrs):
        idx = len(qtr_hdrs) - 8 + i
        e = _n(qtr_eps_row[idx]) if idx < len(qtr_eps_row) else None
        eps_trend.append({"quarter": h, "eps": e})

    # Quarterly revenue trend
    qtr_sales  = qtr.get("Sales", [])
    qtr_profit = qtr.get("Net Profit", [])
    qtr_opm    = qtr.get("OPM %", [])
    quarterly_trend: List[dict] = []
    for i, h in enumerate(recent_hdrs):
        idx = len(qtr_hdrs) - 8 + i
        s = _n(qtr_sales[idx])  if idx < len(qtr_sales)  else None
        p = _n(qtr_profit[idx]) if idx < len(qtr_profit) else None
        o = _n(str(qtr_opm[idx]).replace("%", "")) if idx < len(qtr_opm) else None
        quarterly_trend.append({"quarter": h, "sales": s, "net_profit": p, "opm": o})

    # ── Balance Sheet ─────────────────────────────────────────────────────────
    bs_section = soup.find("section", id="balance-sheet")
    bs = _parse_section_table(bs_section)

    equity_cap = _last_val(bs, "Equity Capital")
    reserves   = _last_val(bs, "Reserves")
    borrowings = _last_val(bs, "Borrowings")
    total_assets = _last_val(bs, "Total Assets")

    total_equity = (equity_cap or 0) + (reserves or 0)
    de = _r(borrowings / total_equity) if total_equity and borrowings and total_equity > 0 else None

    # Balance sheet trend (last 6 years)
    bs_hdrs      = bs.get("__headers__", [])
    borrow_row   = bs.get("Borrowings", [])
    reserve_row  = bs.get("Reserves", [])
    eqcap_row    = bs.get("Equity Capital", [])
    bs_trend: List[dict] = []
    for i, h in enumerate(bs_hdrs[-6:]):
        idx = len(bs_hdrs) - 6 + i
        b  = _n(borrow_row[idx])  if idx < len(borrow_row)  else None
        r  = _n(reserve_row[idx]) if idx < len(reserve_row) else None
        ec = _n(eqcap_row[idx])   if idx < len(eqcap_row)   else None
        eq = (ec or 0) + (r or 0)
        bs_trend.append({
            "year":      h,
            "borrowings": b,
            "equity":    _r(eq) if eq else None,
            "de_ratio":  _r(b / eq) if b and eq and eq > 0 else None,
        })

    # ── Cash Flow ─────────────────────────────────────────────────────────────
    cf_section = soup.find("section", id="cash-flow")
    cf = _parse_section_table(cf_section)

    op_cf  = _last_val(cf, "Cash from Operating Activity")
    inv_cf = _last_val(cf, "Cash from Investing Activity")
    fin_cf = _last_val(cf, "Cash from Financing Activity")
    fcf    = _r((op_cf or 0) + (inv_cf or 0)) if op_cf is not None else None

    # Cash flow trend
    cf_hdrs    = cf.get("__headers__", [])
    opcf_row   = cf.get("Cash from Operating Activity", [])
    invcf_row  = cf.get("Cash from Investing Activity", [])
    cf_trend: List[dict] = []
    for i, h in enumerate(cf_hdrs[-6:]):
        idx = len(cf_hdrs) - 6 + i
        oc = _n(opcf_row[idx])  if idx < len(opcf_row)  else None
        ic = _n(invcf_row[idx]) if idx < len(invcf_row) else None
        cf_trend.append({
            "year":       h,
            "operating":  oc,
            "investing":  ic,
            "free_cf":    _r((oc or 0) + (ic or 0)) if oc is not None else None,
        })

    # ── Ratios section ────────────────────────────────────────────────────────
    ratio_section = soup.find("section", id="ratios")
    rat = _parse_section_table(ratio_section)

    debtor_days    = _last_val(rat, "Debtor Days")
    inventory_days = _last_val(rat, "Inventory Days")
    days_payable   = _last_val(rat, "Days Payable")
    cash_conv      = _last_val(rat, "Cash Conversion Cycle")
    roce_trend_row = rat.get("ROCE %", [])
    roce_latest    = _last_val(rat, "ROCE %") or roce

    # ── Shareholding ─────────────────────────────────────────────────────────
    # #quarterly-shp table — thead has quarters, tbody has Promoters / FIIs / DIIs / Public
    shp_section = soup.find("section", id="shareholding")
    shp_tbl = shp_section.find("div", id="quarterly-shp").find("table") if shp_section else None
    shp_hdrs: List[str] = []
    shp_rows: Dict[str, List[str]] = {}
    if shp_tbl:
        shp_hdrs = [th.get_text(strip=True) for th in shp_tbl.select("thead th")[1:]]
        for tr in shp_tbl.select("tbody tr"):
            tds = tr.find_all("td")
            if not tds: continue
            lbl = tds[0].get_text(separator=" ", strip=True)
            lbl = re.sub(r"\s*\+\s*$", "", lbl).strip()
            shp_rows[lbl] = [td.get_text(strip=True).replace("%", "").replace(",", "") for td in tds[1:]]

    def _shp_latest(key):
        vals = shp_rows.get(key, [])
        for v in reversed(vals):
            n = _n(v)
            if n is not None: return n
        return None

    promoter_hold = _shp_latest("Promoters")
    fii_hold      = _shp_latest("FIIs")
    dii_hold      = _shp_latest("DIIs")
    public_hold   = _shp_latest("Public")

    # Shareholding trend (last 8 quarters)
    shp_trend: List[dict] = []
    p_vals = shp_rows.get("Promoters", [])
    f_vals = shp_rows.get("FIIs", [])
    d_vals = shp_rows.get("DIIs", [])
    for i, h in enumerate(shp_hdrs[-8:]):
        idx = len(shp_hdrs) - 8 + i
        shp_trend.append({
            "quarter":  h,
            "promoter": _n(p_vals[idx]) if idx < len(p_vals) else None,
            "fii":      _n(f_vals[idx]) if idx < len(f_vals) else None,
            "dii":      _n(d_vals[idx]) if idx < len(d_vals) else None,
        })

    # ── Recent Announcements ──────────────────────────────────────────────────
    announcements = []
    for li in soup.select("#company-announcements-tab ul.list-links li")[:5]:
        a = li.find("a")
        if a:
            title = a.get_text(separator=" ", strip=True).split("\n")[0][:120]
            announcements.append({"title": title, "url": a.get("href", "")})

    # ── Scores ────────────────────────────────────────────────────────────────
    val_score    = _score_valuation(stock_pe, pb, roce_latest, div_yield)
    prof_score   = _score_profitability(roe, roce_latest, opm_latest, npm)
    growth_score = _score_growth(cagr.get("sales_cagr_3y"), cagr.get("profit_cagr_3y"), cagr.get("price_cagr_1y"))
    health_score = _score_health(de, promoter_hold, op_cf, borrowings, reserves, equity_cap)
    overall      = int((val_score + prof_score + growth_score + health_score) / 4)

    # ── Response ──────────────────────────────────────────────────────────────
    return {
        "symbol":        sym,
        "name":          company_name,
        "sector":        sector or broad_sector,
        "industry":      industry,
        "description":   description,
        "source_url":    url,
        "indices":       indices,

        # Price
        "current_price":    current_price,
        "price_change_pct": price_change_pct,
        "market_cap":       market_cap,
        "52w_high":         w52_high,
        "52w_low":          w52_low,
        "face_value":       face_value,
        "book_value":       book_value,

        # Valuation
        "valuation": {
            "pe":             stock_pe,
            "price_to_book":  pb,
            "dividend_yield": div_yield,
            "roce":           roce_latest,
            "roe":            roe,
        },

        # Profitability
        "profitability": {
            "roe":              roe,
            "roce":             roce_latest,
            "operating_margin": opm_latest,
            "net_margin":       npm,
            "roe_3y":           cagr.get("roe_3y"),
            "roe_5y":           cagr.get("roe_5y"),
        },

        # Growth
        "growth": {
            "revenue_yoy":     rev_gr_yoy,
            "profit_yoy":      profit_gr_yoy,
            "sales_cagr_3y":   cagr.get("sales_cagr_3y"),
            "sales_cagr_5y":   cagr.get("sales_cagr_5y"),
            "sales_cagr_10y":  cagr.get("sales_cagr_10y"),
            "profit_cagr_3y":  cagr.get("profit_cagr_3y"),
            "profit_cagr_5y":  cagr.get("profit_cagr_5y"),
            "profit_cagr_10y": cagr.get("profit_cagr_10y"),
            "price_cagr_1y":   cagr.get("price_cagr_1y"),
            "price_cagr_3y":   cagr.get("price_cagr_3y"),
            "price_cagr_5y":   cagr.get("price_cagr_5y"),
        },

        # Balance sheet
        "balance_sheet": {
            "equity_capital": equity_cap,
            "reserves":       reserves,
            "borrowings":     borrowings,
            "total_assets":   total_assets,
            "debt_to_equity": de,
        },

        # Cash flow
        "cashflow": {
            "operating": op_cf,
            "investing": inv_cf,
            "financing": fin_cf,
            "free_cf":   fcf,
        },

        # Efficiency
        "efficiency": {
            "debtor_days":    debtor_days,
            "inventory_days": inventory_days,
            "days_payable":   days_payable,
            "cash_conversion_cycle": cash_conv,
        },

        # Shareholding
        "ownership": {
            "promoter_pct": promoter_hold,
            "fii_pct":      fii_hold,
            "dii_pct":      dii_hold,
            "public_pct":   public_hold,
        },

        # Screener pros/cons
        "analysis": {"pros": pros, "cons": cons},

        # Trends
        "trends": {
            "annual":      annual_trend,      # [{year, revenue, net_income, opm, eps}]
            "quarterly":   quarterly_trend,   # [{quarter, sales, net_profit, opm}]
            "eps":         eps_trend,         # [{quarter, eps}]
            "balance_sheet": bs_trend,        # [{year, borrowings, equity, de_ratio}]
            "cashflow":    cf_trend,          # [{year, operating, investing, free_cf}]
            "shareholding": shp_trend,        # [{quarter, promoter, fii, dii}]
        },

        "announcements": announcements,

        # Scores
        "scores": {
            "valuation":        val_score,
            "profitability":    prof_score,
            "growth":           growth_score,
            "financial_health": health_score,
            "overall":          overall,
            "verdict":          _verdict(overall),
        },
    }
    

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.on_event("startup")
def load_stock_data_on_startup():
    """
    On server start, populate bulk_cache from MongoDB.
    Only hits yfinance for symbols whose data is stale or missing.
    Runs in a background thread so the server stays responsive immediately.
    """
    def background_loader():
        try:
            all_stocks = get_all_stocks_list()
            symbols = [s["symbol"] for s in all_stocks]
            logger.info(f"[Startup] Loading {len(symbols)} symbols into bulk_cache…")
            StockDataService.fetch_bulk_stock_data(symbols)
            logger.info(f"[Startup] bulk_cache ready with {len(StockDataService.bulk_cache)} stocks")
        except Exception as e:
            logger.error(f"[Startup] Stock loader error: {e}")

    thread = threading.Thread(target=background_loader, daemon=True)
    thread.start()
    logger.info("[Startup] Background stock loader started")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()