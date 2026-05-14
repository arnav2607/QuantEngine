import asyncio
import logging
from datetime import datetime
import pytz
from services.stock_data import StockDataService
from services.market_hours import IST, is_market_open

logger = logging.getLogger(__name__)

async def background_stock_refresher():
    """
    Background task that periodically refreshes stock data during market hours.
    - Starts at 09:15 AM IST
    - Runs every 3 minutes until 03:30 PM IST
    """
    logger.info("[Scheduler] Background stock refresher started.")
    
    while True:
        try:
            now = datetime.now(IST)
            
            # Check if it's a weekday (Monday-Friday)
            if now.weekday() < 5:
                # Market hours: 09:15 to 15:30
                # Start at 09:30 AM as requested
                market_start = now.replace(hour=9, minute=30, second=0, microsecond=0)
                market_end = now.replace(hour=15, minute=30, second=0, microsecond=0)
                
                if market_start <= now <= market_end:
                    logger.info(f"[Scheduler] Market is OPEN ({now.strftime('%H:%M')}). Refreshing all stocks...")
                    
                    # Fetch all stocks in the universe
                    all_stocks = StockDataService.get_all_stocks()
                    symbols = [s["symbol"] for s in all_stocks]
                    
                    # Run the fetch in a thread pool to avoid blocking the event loop
                    await asyncio.to_thread(StockDataService.fetch_bulk_stock_data, symbols)
                    
                    logger.info(f"[Scheduler] Refresh complete for {len(symbols)} symbols.")
                else:
                    # logger.info(f"[Scheduler] Market is CLOSED ({now.strftime('%H:%M')}). Skipping refresh.")
                    pass
            
            # Wait for 3 minutes
            await asyncio.sleep(180) 
            
        except asyncio.CancelledError:
            logger.info("[Scheduler] Background refresher cancelled.")
            break
        except Exception as e:
            logger.error(f"[Scheduler] Error in background refresher: {e}")
            await asyncio.sleep(60) # Wait a minute before retrying on error
