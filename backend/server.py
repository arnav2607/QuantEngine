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
    """Get list of popular Indian stocks"""
    return StockDataService.get_popular_stocks()


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
    """Run stock screener with filters"""
    results = []
    
    for symbol in request.universe:
        try:
            stock_info = StockDataService.get_latest_price(symbol)
            if not stock_info:
                continue
            
            matched_filters = []
            indicator_values = {}
            
            df = StockDataService.fetch_stock_data(
                symbol, 
                request.date or "2024-01-01",
                request.date or datetime.now().strftime('%Y-%m-%d'),
                "1d"
            )
            
            if df.empty:
                continue
            
            for filter_item in request.filters:
                if filter_item.filter_type == "52w_high":
                    high_52w = df['High'].tail(252).max()
                    current_price = df['Close'].iloc[-1]
                    if current_price >= high_52w * 0.98:
                        matched_filters.append("52w_high")
                        indicator_values['52w_high'] = high_52w
                
                elif filter_item.filter_type == "high_volume":
                    vol_ma = df['Volume'].tail(20).mean()
                    current_vol = df['Volume'].iloc[-1]
                    if current_vol > vol_ma * 1.5:
                        matched_filters.append("high_volume")
                        indicator_values['volume_ratio'] = current_vol / vol_ma
                
                elif filter_item.filter_type == "strong_adx":
                    ind_service = IndicatorService()
                    adx_result = ind_service.calculate_adx(df)
                    current_adx = adx_result['adx'].iloc[-1]
                    if current_adx > 25:
                        matched_filters.append("strong_adx")
                        indicator_values['adx'] = current_adx
            
            if matched_filters:
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