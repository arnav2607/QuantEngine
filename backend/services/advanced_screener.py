"""Advanced Stock Screener with TradingView-style Filters"""
import pandas as pd
import numpy as np
from typing import List, Dict, Any
from services.stock_data import StockDataService
from services.indicators import IndicatorService
import logging

logger = logging.getLogger(__name__)


class AdvancedScreener:
    """Enhanced stock screener with multiple filter types"""
    
    @staticmethod
    def screen_price_action(df: pd.DataFrame, filter_type: str, params: Dict = None) -> bool:
        """Screen based on price action filters"""
        if df.empty or len(df) < 2:
            return False
        
        try:
            current_price = df['Close'].iloc[-1]
            
            if filter_type == '52w_high':
                high_52w = df['High'].tail(252).max()
                return current_price >= high_52w * 0.98
            
            elif filter_type == 'ath':
                # All-time high
                ath = df['High'].max()
                return current_price >= ath * 0.99
            
            elif filter_type == 'price_above_ma':
                period = params.get('period', 200) if params else 200
                ma = df['Close'].rolling(window=period).mean().iloc[-1]
                return current_price > ma
            
            elif filter_type == 'price_near_low':
                low_52w = df['Low'].tail(252).min()
                return current_price <= low_52w * 1.02
            
            elif filter_type == 'new_high':
                # New high in last 5 days
                recent_high = df['High'].tail(5).max()
                return current_price >= recent_high * 0.999
            
            elif filter_type == 'gap_up':
                today_open = df['Open'].iloc[-1]
                yesterday_close = df['Close'].iloc[-2]
                gap_percent = ((today_open - yesterday_close) / yesterday_close) * 100
                threshold = params.get('min_gap', 2.0) if params else 2.0
                return gap_percent >= threshold
            
            elif filter_type == 'gap_down':
                today_open = df['Open'].iloc[-1]
                yesterday_close = df['Close'].iloc[-2]
                gap_percent = ((yesterday_close - today_open) / yesterday_close) * 100
                threshold = params.get('min_gap', 2.0) if params else 2.0
                return gap_percent >= threshold
            
            return False
        except Exception as e:
            logger.error(f"Price action filter error: {str(e)}")
            return False
    
    @staticmethod
    def screen_volume(df: pd.DataFrame, filter_type: str, params: Dict = None) -> bool:
        """Screen based on volume filters"""
        if df.empty or len(df) < 20:
            return False
        
        try:
            current_volume = df['Volume'].iloc[-1]
            
            if filter_type == 'high_volume':
                period = params.get('period', 20) if params else 20
                multiplier = params.get('multiplier', 1.5) if params else 1.5
                avg_volume = df['Volume'].tail(period).mean()
                return current_volume > (avg_volume * multiplier)
            
            elif filter_type == 'unusual_volume':
                avg_volume = df['Volume'].tail(20).mean()
                return current_volume > (avg_volume * 2.0)
            
            elif filter_type == 'volume_spike':
                avg_volume = df['Volume'].tail(10).mean()
                return current_volume > (avg_volume * 3.0)
            
            elif filter_type == 'increasing_volume':
                # Volume increasing for 3 consecutive days
                volumes = df['Volume'].tail(4).values
                return all(volumes[i] < volumes[i+1] for i in range(3))
            
            return False
        except Exception as e:
            logger.error(f"Volume filter error: {str(e)}")
            return False
    
    @staticmethod
    def screen_momentum(df: pd.DataFrame, filter_type: str, params: Dict = None) -> bool:
        """Screen based on momentum indicators"""
        if df.empty or len(df) < 50:
            return False
        
        try:
            ind_service = IndicatorService()
            
            if filter_type == 'strong_adx':
                threshold = params.get('threshold', 25) if params else 25
                adx_result = ind_service.calculate_adx(df)
                current_adx = adx_result['adx'].iloc[-1]
                return current_adx > threshold
            
            elif filter_type == 'rsi_oversold':
                threshold = params.get('threshold', 30) if params else 30
                rsi = ind_service.calculate_rsi(df, 14)
                return rsi.iloc[-1] < threshold
            
            elif filter_type == 'rsi_overbought':
                threshold = params.get('threshold', 70) if params else 70
                rsi = ind_service.calculate_rsi(df, 14)
                return rsi.iloc[-1] > threshold
            
            elif filter_type == 'macd_bullish':
                macd_result = ind_service.calculate_macd(df)
                return (macd_result['macd'].iloc[-1] > macd_result['signal'].iloc[-1] and
                       macd_result['histogram'].iloc[-1] > 0)
            
            elif filter_type == 'macd_crossover':
                macd_result = ind_service.calculate_macd(df)
                # MACD crossed above signal in last 3 bars
                for i in range(-3, 0):
                    if (macd_result['macd'].iloc[i-1] <= macd_result['signal'].iloc[i-1] and
                        macd_result['macd'].iloc[i] > macd_result['signal'].iloc[i]):
                        return True
                return False
            
            elif filter_type == 'rsi_divergence':
                # Bullish divergence: price making lower lows, RSI making higher lows
                rsi = ind_service.calculate_rsi(df, 14)
                if len(df) < 20:
                    return False
                price_low1 = df['Low'].iloc[-20:].min()
                price_low2 = df['Low'].iloc[-5:].min()
                rsi_low1 = rsi.iloc[-20:].min()
                rsi_low2 = rsi.iloc[-5:].min()
                return price_low2 < price_low1 and rsi_low2 > rsi_low1
            
            return False
        except Exception as e:
            logger.error(f"Momentum filter error: {str(e)}")
            return False
    
    @staticmethod
    def screen_volatility(df: pd.DataFrame, filter_type: str, params: Dict = None) -> bool:
        """Screen based on volatility"""
        if df.empty or len(df) < 30:
            return False
        
        try:
            ind_service = IndicatorService()
            
            if filter_type == 'high_volatility':
                atr = ind_service.calculate_atr(df, 14)
                avg_atr = atr.tail(20).mean()
                current_atr = atr.iloc[-1]
                return current_atr > (avg_atr * 1.5)
            
            elif filter_type == 'bollinger_squeeze':
                bb = ind_service.calculate_bollinger(df, 20, 2.0)
                bandwidth = (bb['upper'] - bb['lower']) / bb['middle']
                current_bw = bandwidth.iloc[-1]
                avg_bw = bandwidth.tail(100).mean()
                return current_bw < (avg_bw * 0.5)
            
            elif filter_type == 'bollinger_expansion':
                bb = ind_service.calculate_bollinger(df, 20, 2.0)
                bandwidth = (bb['upper'] - bb['lower']) / bb['middle']
                current_bw = bandwidth.iloc[-1]
                prev_bw = bandwidth.iloc[-5:].mean()
                return current_bw > (prev_bw * 1.5)
            
            return False
        except Exception as e:
            logger.error(f"Volatility filter error: {str(e)}")
            return False
    
    @staticmethod
    def screen_pattern(df: pd.DataFrame, filter_type: str, params: Dict = None) -> bool:
        """Screen based on chart patterns"""
        if df.empty or len(df) < 10:
            return False
        
        try:
            if filter_type == 'bullish_engulfing':
                # Last candle engulfs previous candle
                if len(df) < 2:
                    return False
                prev = df.iloc[-2]
                curr = df.iloc[-1]
                return (prev['Close'] < prev['Open'] and  # Prev bearish
                       curr['Close'] > curr['Open'] and   # Curr bullish
                       curr['Open'] < prev['Close'] and
                       curr['Close'] > prev['Open'])
            
            elif filter_type == 'bearish_engulfing':
                if len(df) < 2:
                    return False
                prev = df.iloc[-2]
                curr = df.iloc[-1]
                return (prev['Close'] > prev['Open'] and  # Prev bullish
                       curr['Close'] < curr['Open'] and   # Curr bearish
                       curr['Open'] > prev['Close'] and
                       curr['Close'] < prev['Open'])
            
            elif filter_type == 'doji':
                curr = df.iloc[-1]
                body_size = abs(curr['Close'] - curr['Open'])
                range_size = curr['High'] - curr['Low']
                return body_size < (range_size * 0.1)
            
            elif filter_type == 'hammer':
                curr = df.iloc[-1]
                body_size = abs(curr['Close'] - curr['Open'])
                lower_shadow = min(curr['Open'], curr['Close']) - curr['Low']
                upper_shadow = curr['High'] - max(curr['Open'], curr['Close'])
                return (lower_shadow > (body_size * 2) and
                       upper_shadow < body_size)
            
            return False
        except Exception as e:
            logger.error(f"Pattern filter error: {str(e)}")
            return False
    
    @staticmethod
    def screen_performance(df: pd.DataFrame, filter_type: str, params: Dict = None) -> bool:
        """Screen based on performance metrics"""
        if df.empty or len(df) < 30:
            return False
        
        try:
            current_price = df['Close'].iloc[-1]
            
            if filter_type == 'gainers_1d':
                threshold = params.get('min_gain', 3.0) if params else 3.0
                prev_close = df['Close'].iloc[-2]
                gain = ((current_price - prev_close) / prev_close) * 100
                return gain >= threshold
            
            elif filter_type == 'losers_1d':
                threshold = params.get('min_loss', 3.0) if params else 3.0
                prev_close = df['Close'].iloc[-2]
                loss = ((prev_close - current_price) / prev_close) * 100
                return loss >= threshold
            
            elif filter_type == 'gainers_1w':
                threshold = params.get('min_gain', 5.0) if params else 5.0
                week_ago = df['Close'].iloc[-5] if len(df) >= 5 else df['Close'].iloc[0]
                gain = ((current_price - week_ago) / week_ago) * 100
                return gain >= threshold
            
            elif filter_type == 'gainers_1m':
                threshold = params.get('min_gain', 10.0) if params else 10.0
                month_ago = df['Close'].iloc[-20] if len(df) >= 20 else df['Close'].iloc[0]
                gain = ((current_price - month_ago) / month_ago) * 100
                return gain >= threshold
            
            return False
        except Exception as e:
            logger.error(f"Performance filter error: {str(e)}")
            return False
