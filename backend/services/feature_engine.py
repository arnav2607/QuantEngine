import pandas as pd
import ta


def compute_features(df):

    df["ma20"] = df["close"].rolling(20).mean()
    df["ma50"] = df["close"].rolling(50).mean()
    df["ma200"] = df["close"].rolling(200).mean()

    df["rsi14"] = ta.momentum.RSIIndicator(
        df["close"], window=14
    ).rsi()

    macd = ta.trend.MACD(df["close"])

    df["macd"] = macd.macd()
    df["macd_signal"] = macd.macd_signal()

    df["adx14"] = ta.trend.ADXIndicator(
        df["high"],
        df["low"],
        df["close"],
        window=14
    ).adx()

    df["atr14"] = ta.volatility.AverageTrueRange(
        df["high"],
        df["low"],
        df["close"]
    ).average_true_range()

    bb = ta.volatility.BollingerBands(df["close"])

    df["bb_upper"] = bb.bollinger_hband()
    df["bb_lower"] = bb.bollinger_lband()

    df["volume_ma20"] = df["volume"].rolling(20).mean()

    df["volume_ratio"] = df["volume"] / df["volume_ma20"]

    df["high_5d"] = df["high"].rolling(5).max()

    df["return_1d"] = df["close"].pct_change()
    df["return_5d"] = df["close"].pct_change(5)
    df["return_20d"] = df["close"].pct_change(20)

    return df