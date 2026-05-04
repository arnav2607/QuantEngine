import pandas as pd
from database.collections import daily_prices, stock_statistics, stocks_master


def update_statistics():
    stocks = stocks_master.find()

    for stock in stocks:
        symbol = stock["symbol"]
        data = list(daily_prices.find({"symbol": symbol}))

        if not data:
            print(f"No data for {symbol}")
            continue

        df = pd.DataFrame(data)

        # Ensure numeric
        df["high"] = pd.to_numeric(df["high"], errors="coerce")
        df["low"] = pd.to_numeric(df["low"], errors="coerce")
        df["date"] = pd.to_datetime(df["date"], errors="coerce")

        if df.empty or df["high"].isnull().all() or df["low"].isnull().all():
            print(f"No valid numeric data for {symbol}")
            continue

        ath_price = df["high"].max()
        ath_date = df.loc[df["high"].idxmax()]["date"]

        last_252 = df.tail(min(252, len(df)))

        high_52 = last_252["high"].max()
        high_52_date = last_252.loc[last_252["high"].idxmax()]["date"]

        low_52 = last_252["low"].min()
        low_52_date = last_252.loc[last_252["low"].idxmin()]["date"]

        stock_statistics.update_one(
            {"symbol": symbol},
            {
                "$set": {
                    "symbol": symbol,
                    "ath_price": float(ath_price),
                    "ath_date": ath_date,
                    "high_52w": float(high_52),
                    "high_52w_date": high_52_date,
                    "low_52w": float(low_52),
                    "low_52w_date": low_52_date
                }
            },
            upsert=True
        )

        print("Updated stats:", symbol)