"""Technical Indicators Service
Calculates all supported indicators with explanations and formulas.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List


class IndicatorService:
    """Calculate technical indicators"""
    
    @staticmethod
    def calculate_sma(df: pd.DataFrame, period: int = 20, source: str = 'Close') -> pd.Series:
        """Simple Moving Average
        Formula: SMA = Sum(Price, n) / n
        """
        return df[source].rolling(window=period).mean()
    
    @staticmethod
    def calculate_ema(df: pd.DataFrame, period: int = 20, source: str = 'Close') -> pd.Series:
        """Exponential Moving Average
        Formula: EMA = Price(t) * k + EMA(y) * (1 - k)
        where k = 2 / (period + 1)
        """
        return df[source].ewm(span=period, adjust=False).mean()
    
    @staticmethod
    def calculate_donchian(df: pd.DataFrame, upper_period: int = 20, lower_period: int = 20) -> Dict[str, pd.Series]:
        """Donchian Channel
        Upper: Highest High over n periods
        Lower: Lowest Low over n periods
        """
        return {
            'upper': df['High'].rolling(window=upper_period).max(),
            'lower': df['Low'].rolling(window=lower_period).min(),
            'middle': (df['High'].rolling(window=upper_period).max() + 
                      df['Low'].rolling(window=lower_period).min()) / 2
        }
    
    @staticmethod
    def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Average True Range
        TR = max[(High - Low), abs(High - Close_prev), abs(Low - Close_prev)]
        ATR = Moving Average of TR
        """
        high_low = df['High'] - df['Low']
        high_close = abs(df['High'] - df['Close'].shift())
        low_close = abs(df['Low'] - df['Close'].shift())
        
        tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        return tr.rolling(window=period).mean()
    
    @staticmethod
    def calculate_adx(df: pd.DataFrame, period: int = 14) -> Dict[str, pd.Series]:
        """Average Directional Index
        Measures trend strength (0-100)
        """
        high = df['High']
        low = df['Low']
        close = df['Close']
        
        plus_dm = high.diff()
        minus_dm = -low.diff()
        plus_dm[plus_dm < 0] = 0
        minus_dm[minus_dm < 0] = 0
        
        tr = IndicatorService.calculate_atr(df, 1)
        atr = tr.rolling(window=period).mean()
        
        plus_di = 100 * (plus_dm.rolling(window=period).mean() / atr)
        minus_di = 100 * (minus_dm.rolling(window=period).mean() / atr)
        
        dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di)
        adx = dx.rolling(window=period).mean()
        
        return {
            'adx': adx,
            'plus_di': plus_di,
            'minus_di': minus_di
        }
    
    @staticmethod
    def calculate_volume_ma(df: pd.DataFrame, period: int = 20) -> pd.Series:
        """Volume Moving Average
        """
        return df['Volume'].rolling(window=period).mean()
    
    @staticmethod
    def calculate_rsi(df: pd.DataFrame, period: int = 14, source: str = 'Close') -> pd.Series:
        """Relative Strength Index
        Formula: RSI = 100 - (100 / (1 + RS))
        where RS = Average Gain / Average Loss
        """
        delta = df[source].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        # Avoid division by zero
        rs = gain / loss.replace(0, np.finfo(float).eps)
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    @staticmethod
    def calculate_macd(df: pd.DataFrame, fast: int = 12, slow: int = 26, 
                      signal: int = 9, source: str = 'Close') -> Dict[str, pd.Series]:
        """MACD (Moving Average Convergence Divergence)
        MACD Line = EMA(fast) - EMA(slow)
        Signal Line = EMA(MACD, signal_period)
        Histogram = MACD - Signal
        """
        ema_fast = df[source].ewm(span=fast, adjust=False).mean()
        ema_slow = df[source].ewm(span=slow, adjust=False).mean()
        
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        
        return {
            'macd': macd_line,
            'signal': signal_line,
            'histogram': histogram
        }
    
    @staticmethod
    def calculate_bollinger(df: pd.DataFrame, period: int = 20, std_dev: float = 2.0,
                           source: str = 'Close') -> Dict[str, pd.Series]:
        """Bollinger Bands
        Middle Band = SMA(period)
        Upper Band = SMA + (std_dev * standard_deviation)
        Lower Band = SMA - (std_dev * standard_deviation)
        """
        sma = df[source].rolling(window=period).mean()
        std = df[source].rolling(window=period).std()
        
        return {
            'upper': sma + (std * std_dev),
            'middle': sma,
            'lower': sma - (std * std_dev)
        }
    
    @staticmethod
    def calculate_supertrend(df: pd.DataFrame, atr_period: int = 10, 
                            multiplier: float = 3.0) -> Dict[str, pd.Series]:
        """Supertrend Indicator
        Basic Upper Band = (High + Low) / 2 + (Multiplier * ATR)
        Basic Lower Band = (High + Low) / 2 - (Multiplier * ATR)
        """
        hl2 = (df['High'] + df['Low']) / 2
        atr = IndicatorService.calculate_atr(df, atr_period)
        
        basic_upper = hl2 + (multiplier * atr)
        basic_lower = hl2 - (multiplier * atr)
        
        supertrend = pd.Series(index=df.index, dtype=float)
        direction = pd.Series(index=df.index, dtype=int)
        
        for i in range(1, len(df)):
            # Upper band
            if pd.isna(basic_upper.iloc[i-1]):
                final_upper = basic_upper.iloc[i]
            else:
                final_upper = basic_upper.iloc[i] if basic_upper.iloc[i] < basic_upper.iloc[i-1] or \
                             df['Close'].iloc[i-1] > basic_upper.iloc[i-1] else basic_upper.iloc[i-1]
            
            # Lower band
            if pd.isna(basic_lower.iloc[i-1]):
                final_lower = basic_lower.iloc[i]
            else:
                final_lower = basic_lower.iloc[i] if basic_lower.iloc[i] > basic_lower.iloc[i-1] or \
                             df['Close'].iloc[i-1] < basic_lower.iloc[i-1] else basic_lower.iloc[i-1]
            
            # Direction
            if pd.isna(supertrend.iloc[i-1]):
                direction.iloc[i] = 1
            elif supertrend.iloc[i-1] == basic_upper.iloc[i-1] and df['Close'].iloc[i] <= final_upper:
                direction.iloc[i] = 1
            elif supertrend.iloc[i-1] == basic_lower.iloc[i-1] and df['Close'].iloc[i] >= final_lower:
                direction.iloc[i] = -1
            else:
                direction.iloc[i] = direction.iloc[i-1]
            
            supertrend.iloc[i] = final_lower if direction.iloc[i] == -1 else final_upper
        
        return {
            'supertrend': supertrend,
            'direction': direction
        }
    
    @staticmethod
    def calculate_vwap(df: pd.DataFrame) -> pd.Series:
        """Volume Weighted Average Price
        VWAP = Cumulative(Price * Volume) / Cumulative(Volume)
        Resets at start of each session (for intraday)
        """
        typical_price = (df['High'] + df['Low'] + df['Close']) / 3
        return (typical_price * df['Volume']).cumsum() / df['Volume'].cumsum()
    
    @staticmethod
    def get_indicator_info() -> Dict[str, Dict[str, Any]]:
        """Get information about all indicators"""
        return {
            'MA': {
                'name': 'Moving Average',
                'category': 'Trend',
                'description': 'A Moving Average smooths out price data by averaging past prices over a specified period. SMA gives equal weight to all prices, while EMA gives more weight to recent prices.',
                'formula': 'SMA = Sum(Price, Period) / Period;EMA= Price(t) * k + EMA(y) * (1 - k); k = 2 / (Period + 1),y=previous EMA',
                'parameters': {
                    'period': {'type': 'int', 'default': 20, 'range': [5, 200]},
                    'type': {'type': 'select', 'options': ['SMA', 'EMA'], 'default': 'SMA'},
                    'source': {'type': 'select', 'options': ['Close', 'High', 'Low', 'Open'], 'default': 'Close'}
                }
            },
            'Donchian': {
                'name': 'Donchian Channel',
                'category': 'Breakout',
                'description': 'Tracks highest high and lowest low.Creates a range for breakouts. Great for trend-following strategies.',
                'formula': 'Upper = Highest(High, n); Lower = Lowest(Low, n)',
                'parameters': {
                    'upper_period': {'type': 'int', 'default': 20, 'range': [10, 252]},
                    'lower_period': {'type': 'int', 'default': 20, 'range': [10, 252]}
                }
            },
            'ATR': {
                'name': 'Average True Range',
                'category': 'Volatility',
                'description': 'Measures market volatility. Multiplier with ATR used for  stop-loss and position sizing.',
                'formula': 'TrueRamge(TR) = max(High-Low, |High-Close_prev|, |Low-Close_prev|); ATR = Average(TR)',
                'parameters': {
                    'period': {'type': 'int', 'default': 14, 'range': [7, 30]},
                    'multiplier': {'type': 'float', 'default': 2.0, 'range': [1.0, 5.0]},
                    'source': {'type': 'select', 'options': ['Close', 'High', 'Low', 'Open'], 'default': 'Close'}        
                }
            },
            'SuperTrend':{
                'name': 'SuperTrend',
                'category': 'Trend',
                'description': 'Trend-following indicator using ATR. Clean buy/sell signals.',
                'formula': 'Upper/Lower Bands based on (High+Low)/2 ± (Multiplier * ATR).If trend is upwards, SuperTrend = Lower Band; if downwards, SuperTrend = Upper Band.',
                'parameters': {
                    'atr_period': {'type': 'int', 'default': 10, 'range': [7, 20]},
                    'multiplier': {'type': 'float', 'default': 3.0, 'range': [1.0, 5.0]}
                }
            },
            'ADX': {
                'name': 'Average Directional Index',
                'category': 'Trend Strength',
                'description': 'Measures trend strength from 0-100. Values >25 indicate strong trend.',
                'formula': 'DX = 100 * |+DI - -DI| / (+DI + -DI); ADX = MA(DX)',
                'parameters': {
                    'period': {'type': 'int', 'default': 14, 'range': [7, 30]},
                    'threshold': {'type': 'float', 'default': 25.0, 'range': [20.0, 40.0]}
                }
            },
            'Volume': {
                'name': 'Volume Moving Average',
                'category': 'Participation',
                'description': 'Identifies unusual volume indicating institutional activity.',
                'formula': 'Volume_MA = MA(Volume, n)',
                'parameters': {
                    'period': {'type': 'int', 'default': 20, 'range': [10, 50]},
                    'multiplier': {'type': 'float', 'default': 1.5, 'range': [1.0, 3.0]}
                }
            },
            'RSI': {
                'name': 'Relative Strength Index',
                'category': 'Momentum',
                'description': 'Oscillator measuring overbought/oversold conditions (0-100).',
                'formula': 'RSI = 100 - (100 / (1 + RS)); RS = AvgGain / AvgLoss',
                'parameters': {
                    'period': {'type': 'int', 'default': 14, 'range': [7, 30]},
                    'overbought': {'type': 'float', 'default': 70.0, 'range': [60.0, 80.0]},
                    'oversold': {'type': 'float', 'default': 30.0, 'range': [20.0, 40.0]}
                }
            },
            'MACD': {
                'name': 'MACD',
                'category': 'Momentum Expansion',
                'description': 'Shows relationship between two moving averages. Great for crossovers.',
                'formula': 'MACD = EMA(fast) - EMA(slow); Signal = EMA(MACD, signal_period)',
                'parameters': {
                    'fast': {'type': 'int', 'default': 12, 'range': [8, 20]},
                    'slow': {'type': 'int', 'default': 26, 'range': [20, 40]},
                    'signal': {'type': 'int', 'default': 9, 'range': [5, 15]}
                }
            },
            'Bollinger': {
                'name': 'Bollinger Bands',
                'category': 'Volatility',
                'description': 'Volatility bands showing standard deviations from moving average.',
                'formula': 'Upper = SMA + (k * σ); Lower = SMA - (k * σ)',
                'parameters': {
                    'period': {'type': 'int', 'default': 20, 'range': [10, 50]},
                    'std_dev': {'type': 'float', 'default': 2.0, 'range': [1.0, 3.0]}
                }
            },
            'VWAP': {
                'name': 'VWAP',
                'category': 'Institutional Benchmark',
                'description': 'Volume-weighted average price. Key level for intraday traders.',
                'formula': 'VWAP = Σ(Price * Volume) / Σ(Volume)',
                'parameters': {
                }
            }
        }
