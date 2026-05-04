"""
Daily Price Update Job
Fetches latest daily OHLCV from yfinance and upserts into MongoDB.
Uses mongo_store and market_hours so logic is consistent with the API.
Only runs yfinance for symbols that need a refresh (after market close).
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import yfinance as yf
import pandas as pd
import warnings
import logging

pd.options.mode.copy_on_write = True
warnings.simplefilter(action='ignore', category=FutureWarning)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from database.collections import stocks_master
from services.mongo_store import upsert_daily_prices
from services.market_hours import needs_refresh, mark_symbol_fetched

BATCH_SIZE = 50


def update_prices():
    """Fetch and store daily OHLCV for all symbols in stocks_master."""
    symbols = stocks_master.distinct("symbol")

    if not symbols:
        logger.warning("No symbols found in stocks_master collection.")
        return

    # Filter to only symbols that need a refresh
    to_update = [s for s in symbols if needs_refresh(s)]

    if not to_update:
        logger.info(f"All {len(symbols)} symbols are fresh — nothing to download.")
        return

    logger.info(f"Updating {len(to_update)} / {len(symbols)} symbols…")

    batches = [to_update[i:i + BATCH_SIZE] for i in range(0, len(to_update), BATCH_SIZE)]

    for batch in batches:
        try:
            data = yf.download(
                batch,
                period="max",
                progress=False,
                auto_adjust=True,
                group_by='ticker'
            )

            if data is None or data.empty:
                continue

            for symbol in batch:
                try:
                    df = data[symbol].copy() if len(batch) > 1 else data.copy()
                    df = df.dropna(how='all')
                    if df.empty:
                        continue

                    df.reset_index(inplace=True)
                    df = df[['Date', 'Open', 'High', 'Low', 'Close', 'Volume']]

                    upsert_daily_prices(symbol, df)
                    mark_symbol_fetched(symbol)

                except Exception as e:
                    logger.warning(f"  Symbol {symbol} error: {e}")

            logger.info(f"  Batch done: {batch[0]} … {batch[-1]}")

        except Exception as e:
            logger.error(f"Batch error: {e}")

    logger.info("update_prices complete.")


if __name__ == "__main__":
    update_prices()