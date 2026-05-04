import pandas as pd
from services.database import price_collection, metrics_collection


def compute_metrics(symbol):

    data = list(price_collection.find({"symbol": symbol}))

    if len(data) < 300:
        return

    df = pd.DataFrame(data)

    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date")

    today = df.iloc[-1]
    prev_df = df.iloc[:-1]  # exclude today

    high_52 = prev_df.tail(252)["high"].max()
    low_52 = prev_df.tail(252)["low"].min()

    ath = prev_df["high"].max()
    atl = prev_df["low"].min()

    breakout = today["high"] > high_52
    breakdown = today["low"] < low_52

    metrics = {

        "symbol": symbol,
        "date": today["date"].strftime("%Y-%m-%d"),

        "close": today["close"],

        "52w_high": float(high_52),
        "52w_low": float(low_52),

        "all_time_high": float(ath),
        "all_time_low": float(atl),

        "breakout_52w": breakout,
        "breakdown_52w": breakdown
    }

    metrics_collection.update_one(
        {"symbol": symbol, "date": metrics["date"]},
        {"$set": metrics},
        upsert=True
    )