import yfinance as yf
import pandas as pd


def fetch_stock_history(symbol):

    ticker = symbol + ".NS"

    data = yf.download(
        ticker,
        period="max",
        interval="1d",
        progress=False
    )

    data.reset_index(inplace=True)

    data["symbol"] = symbol

    return data