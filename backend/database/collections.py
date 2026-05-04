from .mongo import db

stocks_master = db["stocks_master"]

daily_prices = db["daily_prices"]

stock_statistics = db["stock_statistics"]

stock_features_daily = db["stock_features_daily"]

latest_features = db["latest_features"]

# Tracks when each symbol's daily prices were last fetched from yfinance
price_metadata = db["price_metadata"]