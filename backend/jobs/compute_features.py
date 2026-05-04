import pandas as pd
from database.collections import daily_prices, stock_features_daily, stocks_master
from services.feature_engine import compute_features


def compute_all_features():

    stocks = stocks_master.find()

    for stock in stocks:

        symbol = stock["symbol"]

        data = list(daily_prices.find({"symbol": symbol}).sort("date", 1))

        if not data:
            continue

        df = pd.DataFrame(data)

        df = compute_features(df)

        records = df.to_dict("records")

        stock_features_daily.delete_many({"symbol": symbol})

        stock_features_daily.insert_many(records)

        print("Features stored:", symbol)