from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime, timezone
import sys

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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="QuantEdge API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


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
    df = StockDataService.fetch_stock_data(symbol, start_date, end_date, timeframe)
    
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


@api_router.post("/backtest", response_model=BacktestResult)
async def run_backtest(strategy: StrategyCreate):
    """Run backtest for a strategy"""
    try:
        if not strategy.stocks or len(strategy.stocks) == 0:
            raise HTTPException(status_code=400, detail="At least one stock symbol is required")
        
        symbol = strategy.stocks[0]
        
        df = StockDataService.fetch_stock_data(
            symbol, strategy.start_date, strategy.end_date, strategy.timeframe
        )
        
        if df.empty:
            raise HTTPException(status_code=404, detail="No stock data found")
        
        strategy_obj = Strategy(**strategy.model_dump())
        engine = BacktestEngine(df, strategy_obj)
        result = engine.run_backtest()
        
        doc = result.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.backtest_results.insert_one(doc)
        
        return result
        
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


@api_router.post("/screener", response_model=List[ScreenerResult])
async def run_screener(request: ScreenerRequest):
    """Run stock screener with advanced filters"""
    results = []
    screener = AdvancedScreener()
    
    for symbol in request.universe:
        try:
            stock_info = StockDataService.get_latest_price(symbol)
            if not stock_info:
                continue
            
            matched_filters = []
            indicator_values = {}
            
            df = StockDataService.fetch_stock_data(
                symbol, 
                request.date or "2023-01-01",
                request.date or datetime.now().strftime('%Y-%m-%d'),
                "1d"
            )
            
            if df.empty:
                continue
            
            for filter_item in request.filters:
                filter_type = filter_item.filter_type
                params = filter_item.params or {}
                matched = False
                
                # Price Action Filters
                if filter_type in ['52w_high', 'ath', 'price_above_ma', 'price_near_low', 'new_high', 'gap_up', 'gap_down']:
                    matched = screener.screen_price_action(df, filter_type, params)
                
                # Volume Filters
                elif filter_type in ['high_volume', 'unusual_volume', 'volume_spike', 'increasing_volume']:
                    matched = screener.screen_volume(df, filter_type, params)
                
                # Momentum Filters
                elif filter_type in ['strong_adx', 'rsi_oversold', 'rsi_overbought', 'macd_bullish', 'macd_crossover', 'rsi_divergence']:
                    matched = screener.screen_momentum(df, filter_type, params)
                
                # Volatility Filters
                elif filter_type in ['high_volatility', 'bollinger_squeeze', 'bollinger_expansion']:
                    matched = screener.screen_volatility(df, filter_type, params)
                
                # Pattern Filters
                elif filter_type in ['bullish_engulfing', 'bearish_engulfing', 'doji', 'hammer']:
                    matched = screener.screen_pattern(df, filter_type, params)
                
                # Performance Filters
                elif filter_type in ['gainers_1d', 'losers_1d', 'gainers_1w', 'gainers_1m']:
                    matched = screener.screen_performance(df, filter_type, params)
                
                if matched:
                    matched_filters.append(filter_type)
            
            if matched_filters:
                # Calculate some indicator values for display
                current_price = df['Close'].iloc[-1]
                prev_price = df['Close'].iloc[-2] if len(df) > 1 else current_price
                change_percent = ((current_price - prev_price) / prev_price) * 100
                
                indicator_values['change_percent'] = round(change_percent, 2)
                indicator_values['high_52w'] = round(df['High'].tail(252).max(), 2)
                indicator_values['low_52w'] = round(df['Low'].tail(252).min(), 2)
                
                results.append(ScreenerResult(
                    symbol=symbol,
                    name=stock_info['name'],
                    price=stock_info['price'],
                    volume=stock_info['volume'],
                    matched_filters=matched_filters,
                    indicator_values=indicator_values
                ))
        
        except Exception as e:
            logger.error(f"Screener error for {symbol}: {str(e)}")
            continue
    
    return results


@api_router.get("/screener/filters")
async def get_screener_filters():
    """Get all available screener filter options"""
    return {
        'price_action': [
            {'id': '52w_high', 'name': '52-Week High', 'description': 'Near 52-week high (within 2%)'},
            {'id': 'ath', 'name': 'All-Time High', 'description': 'Near all-time high (within 1%)'},
            {'id': 'price_above_ma', 'name': 'Price Above MA', 'description': 'Price above moving average', 'params': ['period']},
            {'id': 'price_near_low', 'name': '52-Week Low', 'description': 'Near 52-week low (within 2%)'},
            {'id': 'new_high', 'name': 'New High (5D)', 'description': 'New high in last 5 days'},
            {'id': 'gap_up', 'name': 'Gap Up', 'description': 'Opening gap up', 'params': ['min_gap']},
            {'id': 'gap_down', 'name': 'Gap Down', 'description': 'Opening gap down', 'params': ['min_gap']},
        ],
        'volume': [
            {'id': 'high_volume', 'name': 'High Relative Volume', 'description': 'Volume above average', 'params': ['period', 'multiplier']},
            {'id': 'unusual_volume', 'name': 'Unusual Volume', 'description': 'Volume 2x above average'},
            {'id': 'volume_spike', 'name': 'Volume Spike', 'description': 'Volume 3x above average'},
            {'id': 'increasing_volume', 'name': 'Increasing Volume', 'description': '3 consecutive days of increasing volume'},
        ],
        'momentum': [
            {'id': 'strong_adx', 'name': 'Strong Trend (ADX)', 'description': 'ADX above threshold', 'params': ['threshold']},
            {'id': 'rsi_oversold', 'name': 'RSI Oversold', 'description': 'RSI below 30', 'params': ['threshold']},
            {'id': 'rsi_overbought', 'name': 'RSI Overbought', 'description': 'RSI above 70', 'params': ['threshold']},
            {'id': 'macd_bullish', 'name': 'MACD Bullish', 'description': 'MACD above signal line'},
            {'id': 'macd_crossover', 'name': 'MACD Crossover', 'description': 'MACD crossed above signal (last 3 bars)'},
            {'id': 'rsi_divergence', 'name': 'RSI Bullish Divergence', 'description': 'Price lower, RSI higher'},
        ],
        'volatility': [
            {'id': 'high_volatility', 'name': 'High Volatility', 'description': 'ATR 1.5x above average'},
            {'id': 'bollinger_squeeze', 'name': 'Bollinger Squeeze', 'description': 'Narrow Bollinger Bands'},
            {'id': 'bollinger_expansion', 'name': 'Bollinger Expansion', 'description': 'Expanding Bollinger Bands'},
        ],
        'patterns': [
            {'id': 'bullish_engulfing', 'name': 'Bullish Engulfing', 'description': 'Bullish engulfing candle pattern'},
            {'id': 'bearish_engulfing', 'name': 'Bearish Engulfing', 'description': 'Bearish engulfing candle pattern'},
            {'id': 'doji', 'name': 'Doji', 'description': 'Doji candle pattern'},
            {'id': 'hammer', 'name': 'Hammer', 'description': 'Hammer candle pattern'},
        ],
        'performance': [
            {'id': 'gainers_1d', 'name': 'Top Gainers (1D)', 'description': 'Daily gainers', 'params': ['min_gain']},
            {'id': 'losers_1d', 'name': 'Top Losers (1D)', 'description': 'Daily losers', 'params': ['min_loss']},
            {'id': 'gainers_1w', 'name': 'Top Gainers (1W)', 'description': 'Weekly gainers', 'params': ['min_gain']},
            {'id': 'gainers_1m', 'name': 'Top Gainers (1M)', 'description': 'Monthly gainers', 'params': ['min_gain']},
        ]
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()