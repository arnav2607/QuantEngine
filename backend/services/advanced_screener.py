
import pandas as pd
from typing import Dict, Optional
import logging

from services.indicators import IndicatorService

logger = logging.getLogger(__name__)


class AdvancedScreener:

    INDEXES = [
        "NIFTY50",
        "NIFTYNEXT50",
        "NIFTY200",
        "NIFTY500",
        "NIFTYTOTALMARKET"
    ]

    SECTORS = [
        "NIFTY_CHEMICALS",
        "NIFTY_FINANCE",
        "NIFTY_IT",
        "NIFTY_PSUBANK",
        "NIFTY_AUTO",
        "NIFTY_FMCG",
        "NIFTY_METAL",
        "NIFTY_BANK",
        "NIFTY_MEDIA",
    ]

    PRICE_ACTION = [
        "52w_high",
        "ath",
        "price_above_ma",
        "price_near_low",
        "new_high",
        "new_low",
    ]

    VOLUME = [
        "high_volume",
        "unusual_volume",
        "volume_spike",
        "increasing_volume"
    ]

    MOMENTUM = [
        "strong_adx",
        "rsi_oversold",
        "rsi_overbought",
        "macd_bullish",
        "macd_bearish"
    ]

    VOLATILITY = [
        "high_volatility",
        "bollinger_squeeze",
        "bollinger_expansion"
    ]

    PATTERNS = [
        "bullish_engulfing",
        "bearish_engulfing",
        "doji",
        "hammer"
    ]

    PERFORMANCE = [
        "gainers_1d",
        "losers_1d",
        "gainers_1w",
        "gainers_1m"
    ]

    # --------------------------------
    # Indicator cache
    # --------------------------------

    @staticmethod
    def get_indicators(df: pd.DataFrame):

        ind = IndicatorService()

        return {
            "rsi": ind.calculate_rsi(df),
            "macd": ind.calculate_macd(df),
            "adx": ind.calculate_adx(df),
            "atr": ind.calculate_atr(df),
            "bollinger": ind.calculate_bollinger(df),
        }

    # --------------------------------
    # PRICE ACTION
    # --------------------------------

    @staticmethod
    def screen_price_action(df: pd.DataFrame, filter_type: str, params: Dict):

        if len(df) < 253:
            return False

        current_price = df["Close"].iloc[-1]

        if filter_type == "52w_high":

            high_52 = df["High"].iloc[-253:-1].max()

            return current_price >= high_52 * 0.98

        if filter_type == "ath":

            ath = df["High"].iloc[:-1].max()

            return df["High"].iloc[-1] >= ath

        if filter_type == "price_above_ma":

            period = int(params.get("period", 9))

            if len(df) < period:
                return False

            ma = df["Close"].rolling(period).mean().iloc[-1]

            return current_price > ma

        if filter_type == "price_near_low":

            low_52 = df["Low"].iloc[-253:-1].min()

            return current_price <= low_52 * 1.02

        if filter_type == "new_high":
            period = int(params.get("period", 5))
            
            if len(df) < period:
                return False

            prev_high = df["High"].iloc[-(period):-1].max()

            return df["High"].iloc[-1] >= prev_high
        
        if filter_type == "new_low":
            
            period = int(params.get("period", 5))

            if len(df) < period + 1:
                return False

            prev_low = df["Low"].iloc[-(period):-1].min()
            today_low = df["Low"].iloc[-1]

            return today_low <= prev_low

        return False
    

    # --------------------------------
    # VOLUME
    # --------------------------------

    @staticmethod
    def screen_volume(df: pd.DataFrame, filter_type: str, params: Dict):

        if len(df) < 21:
            return False

        current_volume = df["Volume"].iloc[-1]

        if filter_type == "high_volume":

            period = int(params.get("period", 20))
            multiplier = float(params.get("multiplier", 1.5))

            avg_volume = df["Volume"].iloc[-(period+1):-1].mean()

            return current_volume > avg_volume*multiplier

        if filter_type == "unusual_volume":
            period = int(params.get("period", 20))
            avg_volume = df["Volume"].iloc[-(period+1):-1].mean()

            return current_volume > avg_volume * 2

        if filter_type == "volume_spike":
            period = int(params.get("period", 20))
            avg_volume = df["Volume"].iloc[-(period+1):-1].mean()

            return current_volume > avg_volume * 3

        if filter_type == "increasing_volume":

            v = df["Volume"].iloc[-4:]

            return (
                v.iloc[0] < v.iloc[1] and
                v.iloc[1] < v.iloc[2] and
                v.iloc[2] < v.iloc[3]
            )

        return False

    # --------------------------------
    # MOMENTUM
    # --------------------------------

    @staticmethod
    def screen_momentum(df: pd.DataFrame, filter_type: str, params: Dict, indicators: Optional[Dict] = None):

        if indicators is None:
            indicators = AdvancedScreener.get_indicators(df)

        if filter_type == "rsi_oversold":

            rsi = indicators["rsi"]

            return rsi.iloc[-1] < params.get("threshold", 30)

        if filter_type == "rsi_overbought":

            rsi = indicators["rsi"]

            return rsi.iloc[-1] > params.get("threshold", 70)

        if filter_type == "macd_bullish":

            macd = indicators["macd"]
            return macd["macd"].iloc[-1] > macd["signal"].iloc[-1]

        if filter_type == "macd_bearish":

            macd = indicators["macd"]
            return macd["macd"].iloc[-1] > macd["signal"].iloc[-1]

        if filter_type == "strong_adx":

            adx = indicators["adx"]

            return adx["adx"].iloc[-1] > params.get("threshold", 25)

        return False

    # --------------------------------
    # VOLATILITY
    # --------------------------------

    @staticmethod
    def screen_volatility(df: pd.DataFrame, filter_type: str, params: Dict, indicators: Optional[Dict] = None):

        if indicators is None:
            indicators = AdvancedScreener.get_indicators(df)

        if filter_type == "high_volatility":

            atr = indicators["atr"]

            return atr.iloc[-1] > atr.mean() * 1.5

        if filter_type == "bollinger_squeeze":

            bb = indicators["bollinger"]

            width = (bb["upper"] - bb["lower"]) / bb["middle"]

            return width.iloc[-1] < width.mean() * 0.5

        if filter_type == "bollinger_expansion":

            bb = indicators["bollinger"]

            width = (bb["upper"] - bb["lower"]) / bb["middle"]

            return width.iloc[-1] > width.mean() * 1.5

        return False

    # --------------------------------
    # CANDLE PATTERNS
    # --------------------------------

    @staticmethod
    def screen_pattern(df: pd.DataFrame, filter_type: str, params: Dict):

        if len(df) < 2:
            return False

        last = df.iloc[-1]
        prev = df.iloc[-2]

        if filter_type == "bullish_engulfing":

            return (
                prev["Close"] < prev["Open"] and
                last["Close"] > last["Open"] and
                last["Open"] <= prev["Close"] and
                last["Close"] >= prev["Open"]
            )

        if filter_type == "bearish_engulfing":

            return (
                prev["Close"] > prev["Open"] and
                last["Close"] < last["Open"] and
                last["Open"] >= prev["Close"] and
                last["Close"] <= prev["Open"]
            )

        if filter_type == "doji":

            body = abs(last["Close"] - last["Open"])
            candle_range = last["High"] - last["Low"]

            return body < candle_range * 0.1

        if filter_type == "hammer":

            body = abs(last["Close"] - last["Open"])

            lower_wick = min(last["Open"], last["Close"]) - last["Low"]

            upper_wick = last["High"] - max(last["Open"], last["Close"])

            return lower_wick > body * 2 and upper_wick < body

        return False

    # --------------------------------
    # PERFORMANCE
    # --------------------------------

    @staticmethod
    def screen_performance(df: pd.DataFrame, filter_type: str, params: Dict):

        close = df["Close"]

        if len(close) < 21:
            return False

        if filter_type == "gainers_1d":

            change = (close.iloc[-1] - close.iloc[-2]) / close.iloc[-2] * 100

            return change > params.get("min_gain", 2)

        if filter_type == "losers_1d":

            change = (close.iloc[-1] - close.iloc[-2]) / close.iloc[-2] * 100

            return change < -params.get("min_loss", 2)

        if filter_type == "gainers_1w":

            if len(close) < 6:
                return False

            prev_price = close.iloc[-6]

            if prev_price == 0:
                return False

            change = ((close.iloc[-1] - prev_price) / prev_price) * 100

            return change > params.get("min_gain", 5)

        if filter_type == "gainers_1m":

            change = (close.iloc[-1] - close.iloc[-21]) / close.iloc[-21] * 100

            return change > params.get("min_gain", 10)

        return False