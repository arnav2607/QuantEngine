"""Stock Data Service
Fetches stock data from Yahoo Finance for Indian stocks (NSE/BSE)
"""
import yfinance as yf
import pandas as pd
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging
import sys
sys.path.append('/app/backend')
from data.nifty_stocks import get_all_stocks, get_stocks_by_index, get_stocks_by_sector, NIFTY_50_STOCKS

logger = logging.getLogger(__name__)


class StockDataService:
    """Fetch and manage stock data"""
    
    INDICES = {
        '^NSEI': 'Nifty 50',
        '^BSESN': 'Sensex',
        '^NSEBANK': 'Nifty Bank'
    }
    
    TIMEFRAME_MAP = {
        '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m',
        '30m': '30m', '1h': '1h', '1d': '1d', '1wk': '1wk', '1mo': '1mo'
    }
    
    @staticmethod
    def fetch_stock_data(symbol: str, start_date: str, end_date: str, 
                        timeframe: str = '1d') -> pd.DataFrame:
        """Fetch historical stock data from Yahoo Finance"""
        try:
            interval = StockDataService.TIMEFRAME_MAP.get(timeframe, '1d')
            
            if interval in ['1m', '3m', '5m', '15m', '30m', '1h']:
                end = datetime.strptime(end_date, '%Y-%m-%d')
                start = datetime.strptime(start_date, '%Y-%m-%d')
                if (end - start).days > 60:
                    start = end - timedelta(days=60)
                    start_date = start.strftime('%Y-%m-%d')
                    logger.warning(f"Intraday data limited to 60 days")
            
            ticker = yf.Ticker(symbol)
            df = ticker.history(start=start_date, end=end_date, interval=interval)
            
            if df.empty:
                return pd.DataFrame()
            
            df.reset_index(inplace=True)
            df.columns = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume', 'Dividends', 'Stock Splits']
            df = df[['Date', 'Open', 'High', 'Low', 'Close', 'Volume']]
            
            return df
            
        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {str(e)}")
            return pd.DataFrame()
    
    @staticmethod
    def get_latest_price(symbol: str) -> Dict[str, Any]:
        """Get current/latest price and info for a stock"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            hist = ticker.history(period='1d', interval='1d')
            
            return {
                'symbol': symbol,
                'name': info.get('longName', symbol),
                'price': hist['Close'].iloc[-1] if not hist.empty else info.get('currentPrice', 0),
                'volume': hist['Volume'].iloc[-1] if not hist.empty else 0,
                'market_cap': info.get('marketCap', 0),
                'sector': info.get('sector', 'Unknown'),
                'pe_ratio': info.get('trailingPE', 0),
                'change': info.get('regularMarketChangePercent', 0)
            }
        except Exception as e:
            logger.error(f"Error getting latest price for {symbol}: {str(e)}")
            return None
    
    @staticmethod
    def search_stocks(query: str) -> List[Dict[str, str]]:
        """Search for stocks by name or symbol"""
        query_lower = query.lower()
        results = []
        
        all_stocks = get_all_stocks()
        for stock in all_stocks:
            if query_lower in stock['symbol'].lower() or query_lower in stock['name'].lower():
                results.append(stock)
        
        return results
    
    @staticmethod
    def get_popular_stocks() -> List[Dict[str, str]]:
        """Get list of popular Indian stocks"""
        return NIFTY_50_STOCKS
    
    @staticmethod
    def get_all_stocks() -> List[Dict[str, str]]:
        """Get complete stock database"""
        return get_all_stocks()
    
    @staticmethod
    def get_stocks_by_index(index_name: str) -> List[Dict[str, str]]:
        """Get stocks by index (Nifty 50, Nifty Bank, etc.)"""
        return get_stocks_by_index(index_name)
    
    @staticmethod
    def get_stocks_by_sector(sector: str) -> List[Dict[str, str]]:
        """Get stocks by sector"""
        return get_stocks_by_sector(sector)
    
    @staticmethod
    def get_indices() -> List[Dict[str, str]]:
        """Get list of Indian indices"""
        return [
            {'symbol': symbol, 'name': name}
            for symbol, name in StockDataService.INDICES.items()
        ]
    
    @staticmethod
    def get_all_sectors() -> List[str]:
        """Get unique sectors"""
        all_stocks = get_all_stocks()
        sectors = list(set([s['sector'] for s in all_stocks]))
        return sorted(sectors)
