# import math
# import pandas as pd
# import numpy as np
# from typing import Dict, List, Any, Optional
# from datetime import datetime
# import logging

# from models import Strategy, BacktestResult, BacktestMetrics, Trade, IndicatorCondition, StrategyRules

# logger = logging.getLogger(__name__)

# # ─── Indicator Calculations ───────────────────────────────────────────────────

# def _source_series(df: pd.DataFrame, source: str) -> pd.Series:
#     m = {
#         'Close': df['Close'], 'Open': df['Open'],
#         'High':  df['High'],  'Low':  df['Low'],
#         'HL2':   (df['High'] + df['Low']) / 2,
#         'HLC3':  (df['High'] + df['Low'] + df['Close']) / 3,
#         'OHLC4': (df['Open'] + df['High'] + df['Low'] + df['Close']) / 4,
#     }
#     return m.get(source, df['Close'])


# def _calc_ma(series: pd.Series, period: int, ma_type: str) -> pd.Series:
#     if ma_type.upper() == 'EMA':
#         return series.ewm(span=period, adjust=False).mean()
#     return series.rolling(period).mean()


# def _calc_rsi(series: pd.Series, period: int) -> pd.Series:
#     delta = series.diff()
#     gain  = delta.clip(lower=0).ewm(com=period - 1, adjust=False).mean()
#     loss  = (-delta.clip(upper=0)).ewm(com=period - 1, adjust=False).mean()
#     rs    = gain / loss.replace(0, np.nan)
#     return 100 - (100 / (1 + rs))


# def _calc_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
#     h, l, c = df['High'], df['Low'], df['Close'].shift(1)
#     tr = pd.concat([h - l, (h - c).abs(), (l - c).abs()], axis=1).max(axis=1)
#     return tr.ewm(com=period - 1, adjust=False).mean()


# def _calc_supertrend(df: pd.DataFrame, period: int = 10, multiplier: float = 3.0):
#     atr = _calc_atr(df, period)
#     hl2 = (df['High'] + df['Low']) / 2

#     # .copy() is REQUIRED — to_numpy() on a derived Series is read-only
#     raw_upper = (hl2 + multiplier * atr).to_numpy(dtype=float).copy()
#     raw_lower = (hl2 - multiplier * atr).to_numpy(dtype=float).copy()
#     close     = df['Close'].to_numpy(dtype=float).copy()

#     n          = len(df)
#     upper_band = raw_upper.copy()
#     lower_band = raw_lower.copy()
#     supertrend = np.full(n, np.nan)
#     direction  = np.zeros(n, dtype=int)

#     supertrend[0] = upper_band[0]
#     direction[0]  = -1

#     for i in range(1, n):
#         prev_close = close[i - 1]   # Pine Script close[1] = previous bar

#         # Upper band: use new value if it moved DOWN or prev close broke above prev upper
#         if raw_upper[i] < upper_band[i - 1] or prev_close > upper_band[i - 1]:
#             upper_band[i] = raw_upper[i]
#         else:
#             upper_band[i] = upper_band[i - 1]

#         # Lower band: use new value if it moved UP or prev close broke below prev lower
#         if raw_lower[i] > lower_band[i - 1] or prev_close < lower_band[i - 1]:
#             lower_band[i] = raw_lower[i]
#         else:
#             lower_band[i] = lower_band[i - 1]

#         # Direction based on which band the previous supertrend was on
#         if supertrend[i - 1] == upper_band[i - 1]:
#             # Was bearish — check for bullish flip
#             if close[i] > upper_band[i]:
#                 direction[i]  = 1
#                 supertrend[i] = lower_band[i]
#             else:
#                 direction[i]  = -1
#                 supertrend[i] = upper_band[i]
#         else:
#             # Was bullish — check for bearish flip
#             if close[i] < lower_band[i]:
#                 direction[i]  = -1
#                 supertrend[i] = upper_band[i]
#             else:
#                 direction[i]  = 1
#                 supertrend[i] = lower_band[i]

#     return (
#         pd.Series(supertrend, index=df.index),
#         pd.Series(direction,  index=df.index),
#     )


# def _calc_vwap(df: pd.DataFrame) -> pd.Series:
#     tp         = (df['High'] + df['Low'] + df['Close']) / 3
#     cum_tp_vol = (tp * df['Volume']).cumsum()
#     cum_vol    = df['Volume'].cumsum()
#     return cum_tp_vol / cum_vol.replace(0, np.nan)


# def _calc_bollinger(df: pd.DataFrame, period: int, std_dev: float, source: str):
#     src = _source_series(df, source)
#     mid = src.rolling(period).mean()
#     std = src.rolling(period).std(ddof=0)
#     return mid, mid + std_dev * std, mid - std_dev * std


# def _calc_macd(df: pd.DataFrame, fast: int, slow: int, signal: int, source: str):
#     src       = _source_series(df, source)
#     macd_line = src.ewm(span=fast, adjust=False).mean() - src.ewm(span=slow, adjust=False).mean()
#     sig_line  = macd_line.ewm(span=signal, adjust=False).mean()
#     histogram = macd_line - sig_line
#     return macd_line, sig_line, histogram


# # ─── BacktestEngine ──────────────────────────────────────────────────────────

# class BacktestEngine:

#     def __init__(self, df: pd.DataFrame, strategy: Strategy):
#         self.df       = df.copy().reset_index(drop=True)
#         self.strategy = strategy
#         self._cache: Dict[str, pd.Series] = {}

#     # ── Pre-compute all needed indicators ─────────────────────────────────────
#     def _precompute(self) -> None:
#         all_conds = (self.strategy.entry_rules.conditions +
#                      self.strategy.exit_rules.conditions)

#         for cond in all_conds:
#             ind = cond.indicator
#             p   = cond.params

#             if ind == 'MA':
#                 period  = int(p.get('period', 20))
#                 ma_type = p.get('ma_type', 'EMA')
#                 source  = p.get('source', 'Close')
#                 key     = f'MA_{ma_type}_{period}_{source}'
#                 if key not in self._cache:
#                     self._cache[key] = _calc_ma(_source_series(self.df, source), period, ma_type)

#             elif ind == 'MA_CROSS':
#                 fp   = int(p.get('fast_period', 9))
#                 sp   = int(p.get('slow_period', 21))
#                 mt   = p.get('ma_type', 'EMA')
#                 src  = p.get('source', 'Close')
#                 fkey = f'MA_{mt}_{fp}_{src}'
#                 skey = f'MA_{mt}_{sp}_{src}'
#                 series = _source_series(self.df, src)
#                 if fkey not in self._cache:
#                     self._cache[fkey] = _calc_ma(series, fp, mt)
#                 if skey not in self._cache:
#                     self._cache[skey] = _calc_ma(series, sp, mt)
#                 self._cache[f'MA_CROSS_fast_{cond.id}'] = self._cache[fkey]
#                 self._cache[f'MA_CROSS_slow_{cond.id}'] = self._cache[skey]
                
#             elif ind == 'Breakout':
#                 period = int(p.get('period', 20))
#                 key    = f'Breakout_{period}'

#                 if f'{key}_high' not in self._cache:
#                     high_roll = self.df['High'].rolling(period).max().shift(1)
#                     low_roll  = self.df['Low'].rolling(period).min().shift(1)

#                     self._cache[f'{key}_high'] = high_roll
#                     self._cache[f'{key}_low']  = low_roll

#                 self._cache[f'Breakout_high_{cond.id}'] = self._cache[f'{key}_high']
#                 self._cache[f'Breakout_low_{cond.id}']  = self._cache[f'{key}_low']



#             elif ind == 'RSI':
#                 period = int(p.get('period', 14))
#                 source = p.get('source', 'Close')
#                 key    = f'RSI_{period}_{source}'
#                 if key not in self._cache:
#                     self._cache[key] = _calc_rsi(_source_series(self.df, source), period)

#             elif ind == 'MACD':
#                 fp   = int(p.get('fast_period', 12))
#                 sp   = int(p.get('slow_period', 26))
#                 sig  = int(p.get('signal_period', 9))
#                 src  = p.get('source', 'Close')
#                 base = f'MACD_{fp}_{sp}_{sig}_{src}'
#                 if base not in self._cache:
#                     ml, sl, hist = _calc_macd(self.df, fp, sp, sig, src)
#                     self._cache[f'{base}_line']   = ml
#                     self._cache[f'{base}_signal'] = sl
#                     self._cache[f'{base}_hist']   = hist
#                 self._cache[f'MACD_line_{cond.id}']   = self._cache[f'{base}_line']
#                 self._cache[f'MACD_signal_{cond.id}'] = self._cache[f'{base}_signal']
#                 self._cache[f'MACD_hist_{cond.id}']   = self._cache[f'{base}_hist']

#             elif ind == 'Supertrend':
#                 period = int(p.get('period', 10))
#                 mult   = float(p.get('multiplier', 3.0))
#                 key    = f'ST_{period}_{mult}'
#                 if f'{key}_val' not in self._cache:
#                     st, direction = _calc_supertrend(self.df, period, mult)
#                     self._cache[f'{key}_val'] = st
#                     self._cache[f'{key}_dir'] = direction
#                 self._cache[f'ST_val_{cond.id}'] = self._cache[f'{key}_val']
#                 self._cache[f'ST_dir_{cond.id}'] = self._cache[f'{key}_dir']

#             elif ind == 'VWAP':
#                 if 'VWAP' not in self._cache:
#                     self._cache['VWAP'] = _calc_vwap(self.df)
#                 if p.get('std_dev_bands'):
#                     std_dev = float(p.get('std_dev', 1.0))
#                     key = f'VWAP_std_{std_dev}'
#                     if key not in self._cache:
#                         tp  = (self.df['High'] + self.df['Low'] + self.df['Close']) / 3
#                         std = tp.rolling(20).std(ddof=0)
#                         self._cache[f'{key}_upper'] = self._cache['VWAP'] + std_dev * std
#                         self._cache[f'{key}_lower'] = self._cache['VWAP'] - std_dev * std
#                     self._cache[f'VWAP_upper_{cond.id}'] = self._cache[f'{key}_upper']
#                     self._cache[f'VWAP_lower_{cond.id}'] = self._cache[f'{key}_lower']

#             elif ind == 'Bollinger':
#                 period = int(p.get('period', 20))
#                 std_d  = float(p.get('std_dev', 2.0))
#                 source = p.get('source', 'Close')
#                 key    = f'BB_{period}_{std_d}_{source}'
#                 if key not in self._cache:
#                     mid, upper, lower = _calc_bollinger(self.df, period, std_d, source)
#                     self._cache[f'{key}_mid']   = mid
#                     self._cache[f'{key}_upper'] = upper
#                     self._cache[f'{key}_lower'] = lower
#                 self._cache[f'BB_mid_{cond.id}']   = self._cache[f'{key}_mid']
#                 self._cache[f'BB_upper_{cond.id}'] = self._cache[f'{key}_upper']
#                 self._cache[f'BB_lower_{cond.id}'] = self._cache[f'{key}_lower']

#             elif ind == 'Volume':
#                 period = int(p.get('period', 20))
#                 key    = f'VOL_MA_{period}'
#                 if key not in self._cache:
#                     self._cache[key] = self.df['Volume'].rolling(period).mean()

#         if 'ATR_14' not in self._cache:
#             self._cache['ATR_14'] = _calc_atr(self.df, 14)

#     # ── Evaluate one condition at bar index i ─────────────────────────────────
#     def _eval(self, cond: IndicatorCondition, i: int) -> bool:
#         if i < 1:
#             return False
#         try:
#             ind       = cond.indicator
#             p         = cond.params
#             ct        = cond.condition
#             val       = cond.value
#             close     = self.df['Close']
#             close_now = close.iloc[i]

#             def cross_above(a: pd.Series, b: pd.Series) -> bool:
#                 return a.iloc[i - 1] <= b.iloc[i - 1] and a.iloc[i] > b.iloc[i]

#             def cross_below(a: pd.Series, b: pd.Series) -> bool:
#                 return a.iloc[i - 1] >= b.iloc[i - 1] and a.iloc[i] < b.iloc[i]

#             if ind == 'MA':
#                 period  = int(p.get('period', 20))
#                 ma_type = p.get('ma_type', 'EMA')
#                 source  = p.get('source', 'Close')
#                 ma      = self._cache[f'MA_{ma_type}_{period}_{source}']
#                 src_s   = _source_series(self.df, source)
#                 if ct == 'crossover':     return cross_above(src_s, ma)
#                 if ct == 'crossunder':    return cross_below(src_s, ma)
#                 if ct == 'above':         return src_s.iloc[i] > ma.iloc[i]
#                 if ct == 'below':         return src_s.iloc[i] < ma.iloc[i]
#                 if ct == 'ma_slope_up':   return ma.iloc[i] > ma.iloc[i - 1]
#                 if ct == 'ma_slope_down': return ma.iloc[i] < ma.iloc[i - 1]

#             elif ind == 'MA_CROSS':
#                 fast = self._cache[f'MA_CROSS_fast_{cond.id}']
#                 slow = self._cache[f'MA_CROSS_slow_{cond.id}']
#                 if ct == 'crossover':       return cross_above(fast, slow)
#                 if ct == 'crossunder':      return cross_below(fast, slow)
#                 if ct == 'fast_above_slow': return fast.iloc[i] > slow.iloc[i]
#                 if ct == 'fast_below_slow': return fast.iloc[i] < slow.iloc[i]
                
#             elif ind == 'Breakout':
#                 high = self._cache[f'Breakout_high_{cond.id}']
#                 low  = self._cache[f'Breakout_low_{cond.id}']

#                 if pd.isna(high.iloc[i]) or pd.isna(low.iloc[i]):
#                     return False

#                 if ct == 'breakout_upper':
#                     return close_now > high.iloc[i]

#                 if ct == 'breakout_lower':
#                     return close_now < low.iloc[i]      

                    

#             elif ind == 'RSI':
#                 period = int(p.get('period', 14))
#                 source = p.get('source', 'Close')
#                 rsi    = self._cache[f'RSI_{period}_{source}']
#                 if ct == 'overbought': return rsi.iloc[i] > 70
#                 if ct == 'oversold':   return rsi.iloc[i] < 30
#                 if val is None:        return False
#                 const = pd.Series(val, index=rsi.index)
#                 if ct == 'crossover':  return cross_above(rsi, const)
#                 if ct == 'crossunder': return cross_below(rsi, const)
#                 if ct == 'above':      return rsi.iloc[i] > val
#                 if ct == 'below':      return rsi.iloc[i] < val

#             elif ind == 'MACD':
#                 ml   = self._cache[f'MACD_line_{cond.id}']
#                 sl   = self._cache[f'MACD_signal_{cond.id}']
#                 hist = self._cache[f'MACD_hist_{cond.id}']
#                 if ct == 'crossover':          return cross_above(ml, sl)
#                 if ct == 'crossunder':         return cross_below(ml, sl)
#                 if ct == 'above_signal':       return ml.iloc[i] > sl.iloc[i]
#                 if ct == 'below_signal':       return ml.iloc[i] < sl.iloc[i]
#                 if ct == 'above_zero':         return ml.iloc[i] > 0
#                 if ct == 'below_zero':         return ml.iloc[i] < 0
#                 if ct == 'histogram_positive': return hist.iloc[i] > 0 and hist.iloc[i] > hist.iloc[i - 1]
#                 if ct == 'histogram_negative': return hist.iloc[i] < 0 and hist.iloc[i] < hist.iloc[i - 1]

#             elif ind == 'Supertrend':
#                 st_dir = self._cache[f'ST_dir_{cond.id}']
#                 if ct == 'bullish':
#                     return int(st_dir.iloc[i]) == 1
#                 if ct == 'bearish':
#                     return int(st_dir.iloc[i]) == -1
#                 if ct == 'crossover':
#                     return (i > 0
#                             and int(st_dir.iloc[i])     ==  1
#                             and int(st_dir.iloc[i - 1]) == -1)
#                 if ct == 'crossunder':
#                     return (i > 0
#                             and int(st_dir.iloc[i])     == -1
#                             and int(st_dir.iloc[i - 1]) ==  1)

#             elif ind == 'VWAP':
#                 vwap = self._cache['VWAP']
#                 if ct == 'crossover':  return cross_above(close, vwap)
#                 if ct == 'crossunder': return cross_below(close, vwap)
#                 if ct == 'above':      return close_now > vwap.iloc[i]
#                 if ct == 'below':      return close_now < vwap.iloc[i]
#                 if ct in ('above_upper_band', 'below_lower_band'):
#                     upper_key = f'VWAP_upper_{cond.id}'
#                     if upper_key not in self._cache:
#                         return False
#                     if ct == 'above_upper_band': return close_now > self._cache[upper_key].iloc[i]
#                     if ct == 'below_lower_band': return close_now < self._cache[f'VWAP_lower_{cond.id}'].iloc[i]

#             elif ind == 'Bollinger':
#                 mid   = self._cache[f'BB_mid_{cond.id}']
#                 upper = self._cache[f'BB_upper_{cond.id}']
#                 lower = self._cache[f'BB_lower_{cond.id}']
#                 if ct == 'breakout_upper':   return cross_above(close, upper)
#                 if ct == 'breakout_lower':   return cross_below(close, lower)
#                 if ct == 'above_upper':      return close_now > upper.iloc[i]
#                 if ct == 'below_lower':      return close_now < lower.iloc[i]
#                 if ct == 'above_middle':     return close_now > mid.iloc[i]
#                 if ct == 'below_middle':     return close_now < mid.iloc[i]
#                 if ct == 'squeeze':
#                     bw = (upper - lower) / mid
#                     return bw.iloc[i] < bw.rolling(20).mean().iloc[i]
#                 if ct == 'squeeze_breakout':
#                     bw = (upper - lower) / mid
#                     mean_bw = bw.rolling(20).mean()
#                     return bw.iloc[i - 1] < mean_bw.iloc[i - 1] and bw.iloc[i] >= mean_bw.iloc[i]

#             elif ind == 'Volume':
#                 period = int(p.get('period', 20))
#                 mult   = float(p.get('multiplier', 1.5))
#                 vol_ma = self._cache[f'VOL_MA_{period}']
#                 vol    = self.df['Volume']
#                 if ct == 'above_avg':  return vol.iloc[i] > vol_ma.iloc[i]
#                 if ct == 'spike':      return vol.iloc[i] > vol_ma.iloc[i] * mult
#                 if ct == 'increasing': return (i >= 2 and vol.iloc[i] > vol.iloc[i-1] > vol.iloc[i-2])
#                 if ct == 'decreasing': return (i >= 2 and vol.iloc[i] < vol.iloc[i-1] < vol.iloc[i-2])

#         except Exception as e:
#             logger.debug(f"Condition eval error [{cond.indicator}/{cond.condition}] bar {i}: {e}")

#         return False

#     def _eval_rules(self, rules: StrategyRules, i: int) -> bool:
#         if not rules.conditions:
#             return False
#         results = [self._eval(c, i) for c in rules.conditions]
#         return all(results) if rules.logic == 'AND' else any(results)
    
    

#     # ── Main backtest loop ────────────────────────────────────────────────────
#     def run_backtest(self) -> BacktestResult:
#         self._precompute()

#         trades: List[Trade] = []
#         equity_curve: List[Dict] = []
#         position: Optional[Dict] = None

#         equity = self.strategy.initial_capital
#         peak_equity = equity

#         df = self.df
#         n = len(df)
#         close = df['Close']
#         atr14 = self._cache['ATR_14']

#         strategy_type = self.strategy.strategy_type
#         slippage_pct = self.strategy.slippage_percent / 100
#         slippage_factor = 1 + slippage_pct

#         # Direction: +1 = long, -1 = short
#         direction = 1 if strategy_type == "long_only" else -1

#         # For trailing stop
#         extreme_price = 0.0

#         for i in range(1, n):
#             current_price = close.iloc[i]
#             current_date = str(df.iloc[i]['Date'])

#             # ------------------ EQUITY UPDATE ------------------
#             if position:
#                 entry = position['entry_price']
#                 qty = position['quantity']

#                 unreal = (current_price - entry) * qty * direction
#                 curr_equity = equity + unreal

#                 # Track extreme price
#                 if direction == 1:
#                     extreme_price = max(extreme_price, current_price)
#                 else:
#                     extreme_price = min(extreme_price, current_price)

#             else:
#                 curr_equity = equity

#             drawdown = (
#                 (peak_equity - curr_equity) / peak_equity * 100
#                 if peak_equity > 0 else 0
#             )
#             peak_equity = max(peak_equity, curr_equity)

#             equity_curve.append({
#                 "date": current_date,
#                 "equity": round(curr_equity, 2),
#                 "drawdown": round(drawdown, 2),
#             })

#             # ------------------ EXIT LOGIC ------------------
#             if position:
#                 entry = position['entry_price']
#                 qty = position['quantity']

#                 exit_signal = self._eval_rules(self.strategy.exit_rules, i)

#                 # Stop Loss %
#                 if not exit_signal and self.strategy.stop_loss_pct:
#                     if direction == 1:
#                         if current_price <= entry * (1 - self.strategy.stop_loss_pct / 100):
#                             exit_signal = True
#                     else:
#                         if current_price >= entry * (1 + self.strategy.stop_loss_pct / 100):
#                             exit_signal = True

#                 # Take Profit %
#                 if not exit_signal and self.strategy.take_profit_pct:
#                     if direction == 1:
#                         if current_price >= entry * (1 + self.strategy.take_profit_pct / 100):
#                             exit_signal = True
#                     else:
#                         if current_price <= entry * (1 - self.strategy.take_profit_pct / 100):
#                             exit_signal = True

#                 # ATR Stop Loss
#                 if not exit_signal and self.strategy.stop_loss_atr_multiplier:
#                     atr_val = atr14.iloc[i]
#                     if direction == 1:
#                         if current_price <= entry - atr_val * self.strategy.stop_loss_atr_multiplier:
#                             exit_signal = True
#                     else:
#                         if current_price >= entry + atr_val * self.strategy.stop_loss_atr_multiplier:
#                             exit_signal = True

#                 # ATR Take Profit
#                 if not exit_signal and self.strategy.take_profit_atr_multiplier:
#                     atr_val = atr14.iloc[i]
#                     if direction == 1:
#                         if current_price >= entry + atr_val * self.strategy.take_profit_atr_multiplier:
#                             exit_signal = True
#                     else:
#                         if current_price <= entry - atr_val * self.strategy.take_profit_atr_multiplier:
#                             exit_signal = True

#                 # Trailing Stop
#                 if not exit_signal and self.strategy.trailing_stop and self.strategy.trailing_stop_pct:
#                     if direction == 1:
#                         if current_price <= extreme_price * (1 - self.strategy.trailing_stop_pct / 100):
#                             exit_signal = True
#                     else:
#                         if current_price >= extreme_price * (1 + self.strategy.trailing_stop_pct / 100):
#                             exit_signal = True

#                 # Execute Exit
#                 if exit_signal:
#                     gross_pnl = (current_price - entry) * qty * direction
#                     slippage = (entry * qty + current_price * qty) * slippage_pct
#                     net_pnl = gross_pnl - slippage

#                     pnl_pct = ((current_price / entry - 1) * 100) * direction

#                     trades.append(Trade(
#                         entry_date=str(position['entry_date']),
#                         exit_date=current_date,
#                         symbol=self.strategy.stocks[0],
#                         entry_price=round(entry, 4),
#                         exit_price=round(current_price, 4),
#                         position_type="long" if direction == 1 else "short",
#                         quantity=round(qty, 6),
#                         pnl=round(net_pnl, 2),
#                         pnl_percent=round(pnl_pct, 4),
#                         holding_period=i - position['entry_idx'],
#                     ))

#                     equity += net_pnl
#                     position = None

#             # ------------------ ENTRY LOGIC ------------------
#             else:
#                 if self._eval_rules(self.strategy.entry_rules, i):

#                     # Position sizing
#                     if self.strategy.position_sizing == "percent":
#                         pos_value = equity * (self.strategy.position_size_value / 100)

#                     elif self.strategy.position_sizing == "atr_risk":
#                         risk_per_share = max(
#                             atr14.iloc[i] * (self.strategy.stop_loss_atr_multiplier or 2.0),
#                             0.01
#                         )
#                         pos_value = min(
#                             equity,
#                             self.strategy.position_size_value / risk_per_share * current_price
#                         )

#                     else:
#                         pos_value = self.strategy.position_size_value

#                     pos_value = min(pos_value, equity)
#                     quantity = pos_value / (current_price * slippage_factor)

#                     if quantity > 0:
#                         position = {
#                             "entry_date": current_date,
#                             "entry_idx": i,
#                             "entry_price": current_price,
#                             "quantity": quantity,
#                             "type": "long" if direction == 1 else "short",
#                         }

#                         extreme_price = current_price

#         # ------------------ FORCE EXIT AT END ------------------
#         if position:
#             last_price = close.iloc[-1]
#             last_date = str(df.iloc[-1]['Date'])

#             entry = position['entry_price']
#             qty = position['quantity']

#             gross_pnl = (last_price - entry) * qty * direction
#             slippage = (entry * qty + last_price * qty) * slippage_pct
#             net_pnl = gross_pnl - slippage

#             pnl_pct = ((last_price / entry - 1) * 100) * direction

#             trades.append(Trade(
#                 entry_date=str(position['entry_date']),
#                 exit_date=last_date,
#                 symbol=self.strategy.stocks[0],
#                 entry_price=round(entry, 4),
#                 exit_price=round(last_price, 4),
#                 position_type="long" if direction == 1 else "short",
#                 quantity=round(qty, 6),
#                 pnl=round(net_pnl, 2),
#                 pnl_percent=round(pnl_pct, 4),
#                 holding_period=(n - 1) - position['entry_idx'],
#             ))

#             equity += net_pnl
#             position = None

#         # ------------------ METRICS ------------------
#         metrics = self._calc_metrics(trades, equity_curve)

#         return BacktestResult(
#             strategy_id=self.strategy.id,
#             symbol=self.strategy.stocks[0],
#             metrics=metrics,
#             trades=trades,
#             equity_curve=equity_curve,
#         )

#     # ── Performance Metrics ───────────────────────────────────────────────────
#     def _calc_metrics(self, trades: List[Trade], equity_curve: List[Dict]) -> BacktestMetrics:
#         empty = BacktestMetrics(
#             total_return=0, annualized_return=0, buy_hold_return=0,
#             sharpe_ratio=0, sortino_ratio=0, calmar_ratio=0,
#             max_drawdown=0, max_drawdown_duration=0,
#             win_rate=0, profit_factor=0,
#             avg_win=0, avg_loss=0, avg_win_pct=0, avg_loss_pct=0,
#             expectancy=0, expectancy_pct=0,
#             total_trades=0, winning_trades=0, losing_trades=0,
#             avg_holding_period=0, max_consecutive_wins=0, max_consecutive_losses=0,
#             gross_profit=0, gross_loss=0, net_profit=0,
#         )
#         if not trades or not equity_curve:
#             return empty

#         initial      = self.strategy.initial_capital
#         final        = equity_curve[-1]['equity']
#         total_return = (final / initial - 1) * 100

#         tf            = self.strategy.timeframe
#         bars_per_year = {'1m': 252*390, '5m': 252*78, '15m': 252*26, '30m': 252*13,
#                          '1h': 252*6.5, '1d': 252, '1wk': 52, '1mo': 12}.get(tf, 252)
#         years      = len(equity_curve) / bars_per_year
#         ann_return = ((final / initial) ** (1 / max(years, 0.01)) - 1) * 100 if years > 0 else 0
#         bh_return  = (self.df['Close'].iloc[-1] / self.df['Close'].iloc[0] - 1) * 100

#         winners      = [t for t in trades if t.pnl > 0]
#         losers       = [t for t in trades if t.pnl <= 0]
#         gross_profit = sum(t.pnl for t in winners)
#         gross_loss   = abs(sum(t.pnl for t in losers))
#         net_profit   = gross_profit - gross_loss
#         win_rate      = len(winners) / len(trades) * 100 if trades else 0
#         profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')
#         avg_win       = gross_profit / len(winners) if winners else 0
#         avg_loss      = gross_loss   / len(losers)  if losers  else 0
#         avg_win_pct   = sum(t.pnl_percent for t in winners) / len(winners) if winners else 0
#         avg_loss_pct  = abs(sum(t.pnl_percent for t in losers) / len(losers)) if losers else 0

#         wr_frac        = win_rate / 100
#         lr_frac        = 1 - wr_frac
#         expectancy     = wr_frac * avg_win     - lr_frac * avg_loss
#         expectancy_pct = wr_frac * avg_win_pct - lr_frac * avg_loss_pct

#         max_dd  = max(e['drawdown'] for e in equity_curve) if equity_curve else 0
#         cur_dur = max_dur = 0
#         for e in equity_curve:
#             if e['drawdown'] > 0:
#                 cur_dur += 1; max_dur = max(max_dur, cur_dur)
#             else:
#                 cur_dur = 0

#         ret_series = pd.Series([t.pnl_percent for t in trades])
#         sharpe = sortino = 0.0
#         if len(ret_series) > 1 and ret_series.std() > 0:
#             sharpe = (ret_series.mean() / ret_series.std()) * np.sqrt(
#                 bars_per_year / max(len(trades) / max(years, 0.01), 1))
#         neg = ret_series[ret_series < 0]
#         if len(neg) > 1 and neg.std() > 0:
#             sortino = (ret_series.mean() / neg.std()) * np.sqrt(
#                 bars_per_year / max(len(trades) / max(years, 0.01), 1))

#         calmar = ann_return / max_dd if max_dd > 0 else 0.0

#         max_cw = max_cl = cur_cw = cur_cl = 0
#         for t in trades:
#             if t.pnl > 0:
#                 cur_cw += 1; max_cw = max(max_cw, cur_cw); cur_cl = 0
#             else:
#                 cur_cl += 1; max_cl = max(max_cl, cur_cl); cur_cw = 0

#         avg_holding = sum(t.holding_period for t in trades) / len(trades) if trades else 0
        
#         def safe_float(x, default=0.0):
#             if x is None or math.isnan(x) or math.isinf(x):
#                 return default
#             return float(x)

#         return BacktestMetrics(
#             total_return           = safe_float(round(total_return, 2)),
#             annualized_return      = safe_float(round(ann_return, 2)),
#             buy_hold_return        = safe_float(round(bh_return, 2)),
#             sharpe_ratio           = safe_float(round(sharpe, 3)),
#             sortino_ratio          = safe_float(round(sortino, 3)),
#             calmar_ratio           = safe_float(round(calmar, 3)),
#             max_drawdown           = safe_float(round(max_dd, 2)),
#             max_drawdown_duration  = max_dur,
#             win_rate               = safe_float(round(win_rate, 2)),
#             profit_factor          = safe_float(round(profit_factor, 3)),
#             avg_win                = safe_float(round(avg_win, 2)),
#             avg_loss               = safe_float(round(avg_loss, 2)),
#             avg_win_pct            = safe_float(round(avg_win_pct, 4)),
#             avg_loss_pct           = safe_float(round(avg_loss_pct, 4)),
#             expectancy             = safe_float(round(expectancy, 2)),
#             expectancy_pct         = safe_float(round(expectancy_pct, 4)),
#             total_trades           = len(trades),
#             winning_trades         = len(winners),
#             losing_trades          = len(losers),
#             avg_holding_period     = safe_float(round(avg_holding, 1)),
#             max_consecutive_wins   = max_cw,
#             max_consecutive_losses = max_cl,
#             gross_profit           = safe_float(round(gross_profit, 2)),
#             gross_loss             = safe_float(round(gross_loss, 2)),
#             net_profit             = safe_float(round(net_profit, 2)),
#         )       
import math
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

from models import Strategy, BacktestResult, BacktestMetrics, Trade, IndicatorCondition, StrategyRules

logger = logging.getLogger(__name__)

# ─── Indicator Calculations ───────────────────────────────────────────────────

def _source_series(df: pd.DataFrame, source: str) -> pd.Series:
    m = {
        'Close': df['Close'], 'Open': df['Open'],
        'High':  df['High'],  'Low':  df['Low'],
        'HL2':   (df['High'] + df['Low']) / 2,
        'HLC3':  (df['High'] + df['Low'] + df['Close']) / 3,
        'OHLC4': (df['Open'] + df['High'] + df['Low'] + df['Close']) / 4,
    }
    return m.get(source, df['Close'])


def _calc_ma(series: pd.Series, period: int, ma_type: str) -> pd.Series:
    if ma_type.upper() == 'EMA':
        return series.ewm(span=period, adjust=False).mean()
    return series.rolling(period).mean()


def _calc_rsi(series: pd.Series, period: int) -> pd.Series:
    delta = series.diff()
    gain  = delta.clip(lower=0).ewm(com=period - 1, adjust=False).mean()
    loss  = (-delta.clip(upper=0)).ewm(com=period - 1, adjust=False).mean()
    rs    = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def _calc_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    h, l, c = df['High'], df['Low'], df['Close'].shift(1)
    tr = pd.concat([h - l, (h - c).abs(), (l - c).abs()], axis=1).max(axis=1)
    return tr.ewm(com=period - 1, adjust=False).mean()


def _calc_supertrend(df: pd.DataFrame, period: int = 10, multiplier: float = 3.0):
    atr = _calc_atr(df, period)
    hl2 = (df['High'] + df['Low']) / 2

    raw_upper = (hl2 + multiplier * atr).to_numpy(dtype=float).copy()
    raw_lower = (hl2 - multiplier * atr).to_numpy(dtype=float).copy()
    close     = df['Close'].to_numpy(dtype=float).copy()

    n          = len(df)
    upper_band = raw_upper.copy()
    lower_band = raw_lower.copy()
    supertrend = np.full(n, np.nan)
    direction  = np.zeros(n, dtype=int)

    supertrend[0] = upper_band[0]
    direction[0]  = -1

    for i in range(1, n):
        prev_close = close[i - 1]

        if raw_upper[i] < upper_band[i - 1] or prev_close > upper_band[i - 1]:
            upper_band[i] = raw_upper[i]
        else:
            upper_band[i] = upper_band[i - 1]

        if raw_lower[i] > lower_band[i - 1] or prev_close < lower_band[i - 1]:
            lower_band[i] = raw_lower[i]
        else:
            lower_band[i] = lower_band[i - 1]

        if supertrend[i - 1] == upper_band[i - 1]:
            if close[i] > upper_band[i]:
                direction[i]  = 1
                supertrend[i] = lower_band[i]
            else:
                direction[i]  = -1
                supertrend[i] = upper_band[i]
        else:
            if close[i] < lower_band[i]:
                direction[i]  = -1
                supertrend[i] = upper_band[i]
            else:
                direction[i]  = 1
                supertrend[i] = lower_band[i]

    return (
        pd.Series(supertrend, index=df.index),
        pd.Series(direction,  index=df.index),
    )


def _calc_vwap(df: pd.DataFrame) -> pd.Series:
    tp         = (df['High'] + df['Low'] + df['Close']) / 3
    cum_tp_vol = (tp * df['Volume']).cumsum()
    cum_vol    = df['Volume'].cumsum()
    return cum_tp_vol / cum_vol.replace(0, np.nan)


def _calc_bollinger(df: pd.DataFrame, period: int, std_dev: float, source: str):
    src = _source_series(df, source)
    mid = src.rolling(period).mean()
    std = src.rolling(period).std(ddof=0)
    return mid, mid + std_dev * std, mid - std_dev * std


def _calc_macd(df: pd.DataFrame, fast: int, slow: int, signal: int, source: str):
    src       = _source_series(df, source)
    macd_line = src.ewm(span=fast, adjust=False).mean() - src.ewm(span=slow, adjust=False).mean()
    sig_line  = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - sig_line
    return macd_line, sig_line, histogram


# ─── BacktestEngine ──────────────────────────────────────────────────────────

class BacktestEngine:

    def __init__(self, df: pd.DataFrame, strategy: Strategy):
        self.df       = df.copy().reset_index(drop=True)
        self.strategy = strategy
        self._cache: Dict[str, pd.Series] = {}

    # ── Minimum bars needed before any indicator is valid ─────────────────────
    def _min_bars_required(self) -> int:
        """
        Returns the maximum warm-up period across all conditions so we know
        the earliest bar index at which every indicator has a valid value.
        """
        warmup = 1
        all_conds = (self.strategy.entry_rules.conditions +
                     self.strategy.exit_rules.conditions)
        for cond in all_conds:
            p  = cond.params
            ind = cond.indicator
            if ind == 'MA':
                warmup = max(warmup, int(p.get('period', 20)))
            elif ind == 'MA_CROSS':
                warmup = max(warmup, int(p.get('slow_period', 21)))
            elif ind == 'Breakout':
                warmup = max(warmup, int(p.get('period', 20)) + 1)  # +1 because of .shift(1)
            elif ind == 'RSI':
                warmup = max(warmup, int(p.get('period', 14)) * 2)  # RSI needs extra bars to stabilise
            elif ind == 'MACD':
                warmup = max(warmup, int(p.get('slow_period', 26)) + int(p.get('signal_period', 9)))
            elif ind == 'Supertrend':
                warmup = max(warmup, int(p.get('period', 10)))
            elif ind == 'Bollinger':
                warmup = max(warmup, int(p.get('period', 20)))
            elif ind == 'Volume':
                warmup = max(warmup, int(p.get('period', 20)))
            elif ind == 'VWAP':
                warmup = max(warmup, 1)
        return warmup

    # ── Pre-compute all needed indicators ─────────────────────────────────────
    def _precompute(self) -> None:
        all_conds = (self.strategy.entry_rules.conditions +
                     self.strategy.exit_rules.conditions)

        for cond in all_conds:
            ind = cond.indicator
            p   = cond.params

            if ind == 'MA':
                period  = int(p.get('period', 20))
                ma_type = p.get('ma_type', 'EMA')
                source  = p.get('source', 'Close')
                key     = f'MA_{ma_type}_{period}_{source}'
                if key not in self._cache:
                    self._cache[key] = _calc_ma(_source_series(self.df, source), period, ma_type)

            elif ind == 'MA_CROSS':
                fp   = int(p.get('fast_period', 9))
                sp   = int(p.get('slow_period', 21))
                mt   = p.get('ma_type', 'EMA')
                src  = p.get('source', 'Close')
                fkey = f'MA_{mt}_{fp}_{src}'
                skey = f'MA_{mt}_{sp}_{src}'
                series = _source_series(self.df, src)
                if fkey not in self._cache:
                    self._cache[fkey] = _calc_ma(series, fp, mt)
                if skey not in self._cache:
                    self._cache[skey] = _calc_ma(series, sp, mt)
                self._cache[f'MA_CROSS_fast_{cond.id}'] = self._cache[fkey]
                self._cache[f'MA_CROSS_slow_{cond.id}'] = self._cache[skey]

            elif ind == 'Breakout':
                period = int(p.get('period', 20))
                key    = f'Breakout_{period}'
                if f'{key}_high' not in self._cache:
                    high_roll = self.df['High'].rolling(period).max().shift(1)
                    low_roll  = self.df['Low'].rolling(period).min().shift(1)
                    self._cache[f'{key}_high'] = high_roll
                    self._cache[f'{key}_low']  = low_roll
                self._cache[f'Breakout_high_{cond.id}'] = self._cache[f'{key}_high']
                self._cache[f'Breakout_low_{cond.id}']  = self._cache[f'{key}_low']

            elif ind == 'RSI':
                period = int(p.get('period', 14))
                source = p.get('source', 'Close')
                key    = f'RSI_{period}_{source}'
                if key not in self._cache:
                    self._cache[key] = _calc_rsi(_source_series(self.df, source), period)

            elif ind == 'MACD':
                fp   = int(p.get('fast_period', 12))
                sp   = int(p.get('slow_period', 26))
                sig  = int(p.get('signal_period', 9))
                src  = p.get('source', 'Close')
                base = f'MACD_{fp}_{sp}_{sig}_{src}'
                if base not in self._cache:
                    ml, sl, hist = _calc_macd(self.df, fp, sp, sig, src)
                    self._cache[f'{base}_line']   = ml
                    self._cache[f'{base}_signal'] = sl
                    self._cache[f'{base}_hist']   = hist
                self._cache[f'MACD_line_{cond.id}']   = self._cache[f'{base}_line']
                self._cache[f'MACD_signal_{cond.id}'] = self._cache[f'{base}_signal']
                self._cache[f'MACD_hist_{cond.id}']   = self._cache[f'{base}_hist']

            elif ind == 'Supertrend':
                period = int(p.get('period', 10))
                mult   = float(p.get('multiplier', 3.0))
                key    = f'ST_{period}_{mult}'
                if f'{key}_val' not in self._cache:
                    st, direction = _calc_supertrend(self.df, period, mult)
                    self._cache[f'{key}_val'] = st
                    self._cache[f'{key}_dir'] = direction
                self._cache[f'ST_val_{cond.id}'] = self._cache[f'{key}_val']
                self._cache[f'ST_dir_{cond.id}'] = self._cache[f'{key}_dir']

            elif ind == 'VWAP':
                if 'VWAP' not in self._cache:
                    self._cache['VWAP'] = _calc_vwap(self.df)
                if p.get('std_dev_bands'):
                    std_dev = float(p.get('std_dev', 1.0))
                    key = f'VWAP_std_{std_dev}'
                    if key not in self._cache:
                        tp  = (self.df['High'] + self.df['Low'] + self.df['Close']) / 3
                        std = tp.rolling(20).std(ddof=0)
                        self._cache[f'{key}_upper'] = self._cache['VWAP'] + std_dev * std
                        self._cache[f'{key}_lower'] = self._cache['VWAP'] - std_dev * std
                    self._cache[f'VWAP_upper_{cond.id}'] = self._cache[f'{key}_upper']
                    self._cache[f'VWAP_lower_{cond.id}'] = self._cache[f'{key}_lower']

            elif ind == 'Bollinger':
                period = int(p.get('period', 20))
                std_d  = float(p.get('std_dev', 2.0))
                source = p.get('source', 'Close')
                key    = f'BB_{period}_{std_d}_{source}'
                if key not in self._cache:
                    mid, upper, lower = _calc_bollinger(self.df, period, std_d, source)
                    self._cache[f'{key}_mid']   = mid
                    self._cache[f'{key}_upper'] = upper
                    self._cache[f'{key}_lower'] = lower
                self._cache[f'BB_mid_{cond.id}']   = self._cache[f'{key}_mid']
                self._cache[f'BB_upper_{cond.id}'] = self._cache[f'{key}_upper']
                self._cache[f'BB_lower_{cond.id}'] = self._cache[f'{key}_lower']

            elif ind == 'Volume':
                period = int(p.get('period', 20))
                key    = f'VOL_MA_{period}'
                if key not in self._cache:
                    self._cache[key] = self.df['Volume'].rolling(period).mean()

        if 'ATR_14' not in self._cache:
            self._cache['ATR_14'] = _calc_atr(self.df, 14)

    # ── NaN guard: returns True only if all required cache keys are non-NaN at bar i ──
    def _has_data(self, i: int, *cache_keys: str) -> bool:
        """
        Returns False if any of the given cache keys has a NaN value at index i
        or i-1 (needed for crossover checks). Prevents entries during warm-up.
        """
        for key in cache_keys:
            if key not in self._cache:
                return False
            s = self._cache[key]
            if i >= len(s):
                return False
            if pd.isna(s.iloc[i]):
                return False
            if i > 0 and pd.isna(s.iloc[i - 1]):
                return False
        return True

    # ── Evaluate one condition at bar index i ─────────────────────────────────
    def _eval(self, cond: IndicatorCondition, i: int) -> bool:
        if i < 1:
            return False
        try:
            ind       = cond.indicator
            p         = cond.params
            ct        = cond.condition
            val       = cond.value
            close     = self.df['Close']
            close_now = close.iloc[i]

            def cross_above(a: pd.Series, b: pd.Series) -> bool:
                return a.iloc[i - 1] <= b.iloc[i - 1] and a.iloc[i] > b.iloc[i]

            def cross_below(a: pd.Series, b: pd.Series) -> bool:
                return a.iloc[i - 1] >= b.iloc[i - 1] and a.iloc[i] < b.iloc[i]

            # ── MA ────────────────────────────────────────────────────────────
            if ind == 'MA':
                period  = int(p.get('period', 20))
                ma_type = p.get('ma_type', 'EMA')
                source  = p.get('source', 'Close')
                key     = f'MA_{ma_type}_{period}_{source}'
                if not self._has_data(i, key):
                    return False
                ma    = self._cache[key]
                src_s = _source_series(self.df, source)
                if ct == 'crossover':     return cross_above(src_s, ma)
                if ct == 'crossunder':    return cross_below(src_s, ma)
                if ct == 'above':         return src_s.iloc[i] > ma.iloc[i]
                if ct == 'below':         return src_s.iloc[i] < ma.iloc[i]
                if ct == 'ma_slope_up':   return ma.iloc[i] > ma.iloc[i - 1]
                if ct == 'ma_slope_down': return ma.iloc[i] < ma.iloc[i - 1]

            # ── MA_CROSS ──────────────────────────────────────────────────────
            elif ind == 'MA_CROSS':
                fkey = f'MA_CROSS_fast_{cond.id}'
                skey = f'MA_CROSS_slow_{cond.id}'
                if not self._has_data(i, fkey, skey):
                    return False
                fast = self._cache[fkey]
                slow = self._cache[skey]
                if ct == 'crossover':       return cross_above(fast, slow)
                if ct == 'crossunder':      return cross_below(fast, slow)
                if ct == 'fast_above_slow': return fast.iloc[i] > slow.iloc[i]
                if ct == 'fast_below_slow': return fast.iloc[i] < slow.iloc[i]

            # ── Breakout ──────────────────────────────────────────────────────
            elif ind == 'Breakout':
                hkey = f'Breakout_high_{cond.id}'
                lkey = f'Breakout_low_{cond.id}'
                if not self._has_data(i, hkey, lkey):
                    return False
                high = self._cache[hkey]
                low  = self._cache[lkey]
                if ct == 'breakout_upper':
                    return close_now > high.iloc[i]
                if ct == 'breakout_lower':
                    return close_now < low.iloc[i]

            # ── RSI ───────────────────────────────────────────────────────────
            elif ind == 'RSI':
                period = int(p.get('period', 14))
                source = p.get('source', 'Close')
                key    = f'RSI_{period}_{source}'
                if not self._has_data(i, key):
                    return False
                rsi = self._cache[key]
                if ct == 'overbought': return rsi.iloc[i] > 70
                if ct == 'oversold':   return rsi.iloc[i] < 30
                if val is None:        return False
                const = pd.Series(val, index=rsi.index)
                if ct == 'crossover':  return cross_above(rsi, const)
                if ct == 'crossunder': return cross_below(rsi, const)
                if ct == 'above':      return rsi.iloc[i] > val
                if ct == 'below':      return rsi.iloc[i] < val

            # ── MACD ──────────────────────────────────────────────────────────
            elif ind == 'MACD':
                lkey    = f'MACD_line_{cond.id}'
                skey    = f'MACD_signal_{cond.id}'
                hkey    = f'MACD_hist_{cond.id}'
                if not self._has_data(i, lkey, skey, hkey):
                    return False
                ml   = self._cache[lkey]
                sl   = self._cache[skey]
                hist = self._cache[hkey]
                if ct == 'crossover':          return cross_above(ml, sl)
                if ct == 'crossunder':         return cross_below(ml, sl)
                if ct == 'above_signal':       return ml.iloc[i] > sl.iloc[i]
                if ct == 'below_signal':       return ml.iloc[i] < sl.iloc[i]
                if ct == 'above_zero':         return ml.iloc[i] > 0
                if ct == 'below_zero':         return ml.iloc[i] < 0
                if ct == 'histogram_positive': return hist.iloc[i] > 0 and hist.iloc[i] > hist.iloc[i - 1]
                if ct == 'histogram_negative': return hist.iloc[i] < 0 and hist.iloc[i] < hist.iloc[i - 1]

            # ── Supertrend ────────────────────────────────────────────────────
            elif ind == 'Supertrend':
                dkey = f'ST_dir_{cond.id}'
                if not self._has_data(i, dkey):
                    return False
                st_dir = self._cache[dkey]
                if ct == 'bullish':
                    return int(st_dir.iloc[i]) == 1
                if ct == 'bearish':
                    return int(st_dir.iloc[i]) == -1
                if ct == 'crossover':
                    return (i > 0
                            and int(st_dir.iloc[i])     ==  1
                            and int(st_dir.iloc[i - 1]) == -1)
                if ct == 'crossunder':
                    return (i > 0
                            and int(st_dir.iloc[i])     == -1
                            and int(st_dir.iloc[i - 1]) ==  1)

            # ── VWAP ──────────────────────────────────────────────────────────
            elif ind == 'VWAP':
                if not self._has_data(i, 'VWAP'):
                    return False
                vwap = self._cache['VWAP']
                if ct == 'crossover':  return cross_above(close, vwap)
                if ct == 'crossunder': return cross_below(close, vwap)
                if ct == 'above':      return close_now > vwap.iloc[i]
                if ct == 'below':      return close_now < vwap.iloc[i]
                if ct in ('above_upper_band', 'below_lower_band'):
                    ukey = f'VWAP_upper_{cond.id}'
                    lkey = f'VWAP_lower_{cond.id}'
                    if not self._has_data(i, ukey, lkey):
                        return False
                    if ct == 'above_upper_band': return close_now > self._cache[ukey].iloc[i]
                    if ct == 'below_lower_band': return close_now < self._cache[lkey].iloc[i]

            # ── Bollinger ─────────────────────────────────────────────────────
            elif ind == 'Bollinger':
                mkey = f'BB_mid_{cond.id}'
                ukey = f'BB_upper_{cond.id}'
                lkey = f'BB_lower_{cond.id}'
                if not self._has_data(i, mkey, ukey, lkey):
                    return False
                mid   = self._cache[mkey]
                upper = self._cache[ukey]
                lower = self._cache[lkey]
                if ct == 'breakout_upper':   return cross_above(close, upper)
                if ct == 'breakout_lower':   return cross_below(close, lower)
                if ct == 'above_upper':      return close_now > upper.iloc[i]
                if ct == 'below_lower':      return close_now < lower.iloc[i]
                if ct == 'above_middle':     return close_now > mid.iloc[i]
                if ct == 'below_middle':     return close_now < mid.iloc[i]
                if ct == 'squeeze':
                    bw = (upper - lower) / mid
                    bw_mean = bw.rolling(20).mean()
                    if pd.isna(bw.iloc[i]) or pd.isna(bw_mean.iloc[i]):
                        return False
                    return bw.iloc[i] < bw_mean.iloc[i]
                if ct == 'squeeze_breakout':
                    bw = (upper - lower) / mid
                    bw_mean = bw.rolling(20).mean()
                    if pd.isna(bw.iloc[i]) or pd.isna(bw.iloc[i - 1]) or pd.isna(bw_mean.iloc[i]) or pd.isna(bw_mean.iloc[i - 1]):
                        return False
                    return bw.iloc[i - 1] < bw_mean.iloc[i - 1] and bw.iloc[i] >= bw_mean.iloc[i]

            # ── Volume ────────────────────────────────────────────────────────
            elif ind == 'Volume':
                period = int(p.get('period', 20))
                mult   = float(p.get('multiplier', 1.5))
                key    = f'VOL_MA_{period}'
                if not self._has_data(i, key):
                    return False
                vol_ma = self._cache[key]
                vol    = self.df['Volume']
                if ct == 'above_avg':  return vol.iloc[i] > vol_ma.iloc[i]
                if ct == 'spike':      return vol.iloc[i] > vol_ma.iloc[i] * mult
                if ct == 'increasing': return (i >= 2 and vol.iloc[i] > vol.iloc[i-1] > vol.iloc[i-2])
                if ct == 'decreasing': return (i >= 2 and vol.iloc[i] < vol.iloc[i-1] < vol.iloc[i-2])

        except Exception as e:
            logger.debug(f"Condition eval error [{cond.indicator}/{cond.condition}] bar {i}: {e}")

        return False

    def _eval_rules(self, rules: StrategyRules, i: int) -> bool:
        if not rules.conditions:
            return False
        results = [self._eval(c, i) for c in rules.conditions]
        return all(results) if rules.logic == 'AND' else any(results)

    # ── Main backtest loop ────────────────────────────────────────────────────
    def run_backtest(self) -> BacktestResult:
        self._precompute()

        min_bars = self._min_bars_required()

        trades: List[Trade] = []
        equity_curve: List[Dict] = []
        position: Optional[Dict] = None

        leverage = float(self.strategy.leverage or 1.0)
        equity = float(self.strategy.initial_capital or 100000.0)
        peak_equity = equity

        df = self.df
        n = len(df)
        close = df['Close']
        atr14 = self._cache.get('ATR_14')

        strategy_type = self.strategy.strategy_type
        slippage_pct = float(self.strategy.slippage_percent or 0.05) / 100
        slippage_factor = 1 + slippage_pct

        direction = 1 if strategy_type == "long_only" else -1
        extreme_price = 0.0

        # ✅ Breakdown control flags
        breakdown_triggered = False
        stop_trading = False

        for i in range(1, n):
            current_price = close.iloc[i]
            current_date = str(df.iloc[i]['Date'])

            # ── EQUITY UPDATE ───────────────────────────────────────────
            if position:
                entry = position['entry_price']
                qty = position['quantity']
                unreal = (current_price - entry) * qty * direction
                curr_equity = equity + unreal

                # Track extreme price
                if direction == 1:
                    extreme_price = max(extreme_price, current_price)
                else:
                    extreme_price = min(extreme_price, current_price)
            else:
                curr_equity = equity

            # ── DRAWDOWN CALC ───────────────────────────────────────────
            drawdown = (
                (peak_equity - curr_equity) / peak_equity * 100
                if peak_equity > 0 else 0
            )
            peak_equity = max(peak_equity, curr_equity)

            # ── BREAKDOWN CHECK (CORRECT) ───────────────────────────────
            if (
                self.strategy.breakdown_exit_pct
                and self.strategy.breakdown_exit_pct > 0
                and not breakdown_triggered
            ):
                if drawdown >= self.strategy.breakdown_exit_pct:
                    breakdown_triggered = True
                    stop_trading = True

            equity_curve.append({
                "date": current_date,
                "equity": round(curr_equity, 2),
                "drawdown": round(drawdown, 2),
            })

            # ── EXIT LOGIC ──────────────────────────────────────────────
            if position:
                entry = position['entry_price']
                qty = position['quantity']

                exit_signal = self._eval_rules(self.strategy.exit_rules, i)

                # 🔥 Force exit on breakdown
                if breakdown_triggered:
                    exit_signal = True

                if not exit_signal and self.strategy.additional_exit_conditions and self.strategy.time_based_exit_bars:
                    if i - position['entry_idx'] >= self.strategy.time_based_exit_bars:
                        exit_signal = True

                # Stop Loss %
                if not exit_signal and self.strategy.additional_exit_conditions and  self.strategy.stop_loss_pct:
                    if direction == 1:
                        if current_price <= entry * (1 - self.strategy.stop_loss_pct / 100):
                            exit_signal = True
                    else:
                        if current_price >= entry * (1 + self.strategy.stop_loss_pct / 100):
                            exit_signal = True

                # Take Profit %
                if not exit_signal and self.strategy.additional_exit_conditions and self.strategy.take_profit_pct:
                    if direction == 1:
                        if current_price >= entry * (1 + self.strategy.take_profit_pct / 100):
                            exit_signal = True
                    else:
                        if current_price <= entry * (1 - self.strategy.take_profit_pct / 100):
                            exit_signal = True

                # ATR SL/TP
                if not exit_signal and atr14 is not None:
                    atr_val = atr14.iloc[i]
                    if not pd.isna(atr_val):
                        if self.strategy.stop_loss_atr_multiplier:
                            if direction == 1:
                                if current_price <= entry - atr_val * self.strategy.stop_loss_atr_multiplier:
                                    exit_signal = True
                            else:
                                if current_price >= entry + atr_val * self.strategy.stop_loss_atr_multiplier:
                                    exit_signal = True

                        if self.strategy.take_profit_atr_multiplier:
                            if direction == 1:
                                if current_price >= entry + atr_val * self.strategy.take_profit_atr_multiplier:
                                    exit_signal = True
                            else:
                                if current_price <= entry - atr_val * self.strategy.take_profit_atr_multiplier:
                                    exit_signal = True

                # Trailing Stop
                if not exit_signal and self.strategy.trailing_stop and self.strategy.trailing_stop_pct:
                    if direction == 1:
                        if current_price <= extreme_price * (1 - self.strategy.trailing_stop_pct / 100):
                            exit_signal = True
                    else:
                        if current_price >= extreme_price * (1 + self.strategy.trailing_stop_pct / 100):
                            exit_signal = True

                # ── EXECUTE EXIT ─────────────────────────────────────────
                if exit_signal:
                    gross_pnl = (current_price - entry) * qty * direction
                    slippage = (entry * qty + current_price * qty) * slippage_pct
                    net_pnl = gross_pnl - slippage
                    pnl_pct = ((current_price / entry - 1) * 100) * direction

                    trades.append(Trade(
                        entry_date=str(position['entry_date']),
                        exit_date=current_date,
                        symbol=self.strategy.stocks[0],
                        entry_price=round(entry, 4),
                        exit_price=round(current_price, 4),
                        position_type="long" if direction == 1 else "short",
                        quantity=round(qty, 6),
                        pnl=round(net_pnl, 2),
                        pnl_percent=round(pnl_pct, 4),
                        holding_period=i - position['entry_idx'],
                    ))

                    equity += net_pnl
                    position = None

                    # 🔥 Stop loop AFTER clean exit
                    if breakdown_triggered:
                        break

            # ── ENTRY LOGIC ─────────────────────────────────────────────
            else:
                if i < min_bars:
                    continue

                # 🚫 Stop new trades after breakdown
                if stop_trading:
                    continue

                if self._eval_rules(self.strategy.entry_rules, i):

                    if self.strategy.position_sizing == "percent":
                        pos_value = equity * leverage * (self.strategy.position_size_value / 100)

                    elif self.strategy.position_sizing == "atr_risk":
                        if atr14 is None:
                            continue
                        atr_val = atr14.iloc[i]
                        if pd.isna(atr_val):
                            continue
                        risk_per_share = max(
                            atr_val * (self.strategy.stop_loss_atr_multiplier or 2.0),
                            0.01
                        )
                        pos_value = min(
                            equity,
                            self.strategy.position_size_value / risk_per_share * current_price
                        )

                    else:
                        pos_value = self.strategy.position_size_value * leverage

                    pos_value = min(pos_value, equity)
                    quantity = pos_value / (current_price * slippage_factor)

                    if quantity > 0:
                        position = {
                            "entry_date": current_date,
                            "entry_idx": i,
                            "entry_price": current_price,
                            "quantity": quantity,
                            "type": "long" if direction == 1 else "short",
                        }
                        extreme_price = current_price

        # ── FORCE EXIT AT END ─────────────────────────────────────────
        if position:
            last_price = close.iloc[-1]
            last_date = str(df.iloc[-1]['Date'])

            entry = position['entry_price']
            qty = position['quantity']

            gross_pnl = (last_price - entry) * qty * direction
            slippage = (entry * qty + last_price * qty) * slippage_pct
            net_pnl = gross_pnl - slippage
            pnl_pct = ((last_price / entry - 1) * 100) * direction

            trades.append(Trade(
                entry_date=str(position['entry_date']),
                exit_date=last_date,
                symbol=self.strategy.stocks[0],
                entry_price=round(entry, 4),
                exit_price=round(last_price, 4),
                position_type="long" if direction == 1 else "short",
                quantity=round(qty, 6),
                pnl=round(net_pnl, 2),
                pnl_percent=round(pnl_pct, 4),
                holding_period=(n - 1) - position['entry_idx'],
            ))

            equity += net_pnl
            position = None

        metrics = self._calc_metrics(trades, equity_curve)

        return BacktestResult(
            strategy_id=self.strategy.id,
            symbol=self.strategy.stocks[0],
            metrics=metrics,
            trades=trades,
            equity_curve=equity_curve,
        )

    # ── Performance Metrics ───────────────────────────────────────────────────
    def _calc_metrics(self, trades: List[Trade], equity_curve: List[Dict]) -> BacktestMetrics:
        empty = BacktestMetrics(
            total_return=0, annualized_return=0, buy_hold_return=0,
            sharpe_ratio=0, sortino_ratio=0, calmar_ratio=0,
            max_drawdown=0, max_drawdown_duration=0,
            win_rate=0, profit_factor=0,
            avg_win=0, avg_loss=0, avg_win_pct=0, avg_loss_pct=0,
            expectancy=0, expectancy_pct=0,
            total_trades=0, winning_trades=0, losing_trades=0,
            avg_holding_period=0, max_consecutive_wins=0, max_consecutive_losses=0,
            gross_profit=0, gross_loss=0, net_profit=0,
        )
        if not trades or not equity_curve:
            return empty

        initial      = self.strategy.initial_capital
        final        = equity_curve[-1]['equity']
        total_return = (final / initial - 1) * 100

        tf = self.strategy.timeframe
        bars_per_year = {
            '1m':  252 * 390,
            '5m':  252 * 78,
            '15m': 252 * 26,
            '30m': 252 * 13,
            '1h':  252 * 7,    # ~390 min/day ÷ 60 ≈ 6.5 → rounded to 7
            '1d':  252,
            '1wk': 52,
            '1mo': 12,
        }.get(tf, 252)

        years      = len(equity_curve) / bars_per_year
        ann_return = ((final / initial) ** (1 / max(years, 0.01)) - 1) * 100 if years > 0 else 0
        bh_return  = (self.df['Close'].iloc[-1] / self.df['Close'].iloc[0] - 1) * 100

        winners      = [t for t in trades if t.pnl > 0]
        losers       = [t for t in trades if t.pnl <= 0]
        gross_profit = sum(t.pnl for t in winners)
        gross_loss   = abs(sum(t.pnl for t in losers))
        net_profit   = gross_profit - gross_loss
        win_rate     = len(winners) / len(trades) * 100 if trades else 0
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')
        avg_win      = gross_profit / len(winners) if winners else 0
        avg_loss     = gross_loss   / len(losers)  if losers  else 0
        avg_win_pct  = sum(t.pnl_percent for t in winners) / len(winners) if winners else 0
        avg_loss_pct = abs(sum(t.pnl_percent for t in losers) / len(losers)) if losers else 0

        wr_frac        = win_rate / 100
        lr_frac        = 1 - wr_frac
        expectancy     = wr_frac * avg_win     - lr_frac * avg_loss
        expectancy_pct = wr_frac * avg_win_pct - lr_frac * avg_loss_pct

        max_dd  = max(e['drawdown'] for e in equity_curve) if equity_curve else 0
        cur_dur = max_dur = 0
        for e in equity_curve:
            if e['drawdown'] > 0:
                cur_dur += 1
                max_dur  = max(max_dur, cur_dur)
            else:
                cur_dur = 0

        ret_series = pd.Series([t.pnl_percent for t in trades])
        sharpe = sortino = 0.0
        if len(ret_series) > 1 and ret_series.std() > 0:
            sharpe = (ret_series.mean() / ret_series.std()) * np.sqrt(
                bars_per_year / max(len(trades) / max(years, 0.01), 1))
        neg = ret_series[ret_series < 0]
        if len(neg) > 1 and neg.std() > 0:
            sortino = (ret_series.mean() / neg.std()) * np.sqrt(
                bars_per_year / max(len(trades) / max(years, 0.01), 1))

        calmar = ann_return / max_dd if max_dd > 0 else 0.0

        max_cw = max_cl = cur_cw = cur_cl = 0
        for t in trades:
            if t.pnl > 0:
                cur_cw += 1; max_cw = max(max_cw, cur_cw); cur_cl = 0
            else:
                cur_cl += 1; max_cl = max(max_cl, cur_cl); cur_cw = 0

        avg_holding = sum(t.holding_period for t in trades) / len(trades) if trades else 0

        def safe_float(x, default=0.0):
            if x is None or math.isnan(x) or math.isinf(x):
                return default
            return float(x)

        return BacktestMetrics(
            total_return           = safe_float(round(total_return, 2)),
            annualized_return      = safe_float(round(ann_return, 2)),
            buy_hold_return        = safe_float(round(bh_return, 2)),
            sharpe_ratio           = safe_float(round(sharpe, 3)),
            sortino_ratio          = safe_float(round(sortino, 3)),
            calmar_ratio           = safe_float(round(calmar, 3)),
            max_drawdown           = safe_float(round(max_dd, 2)),
            max_drawdown_duration  = max_dur,
            win_rate               = safe_float(round(win_rate, 2)),
            profit_factor          = safe_float(round(profit_factor, 3)),
            avg_win                = safe_float(round(avg_win, 2)),
            avg_loss               = safe_float(round(avg_loss, 2)),
            avg_win_pct            = safe_float(round(avg_win_pct, 4)),
            avg_loss_pct           = safe_float(round(avg_loss_pct, 4)),
            expectancy             = safe_float(round(expectancy, 2)),
            expectancy_pct         = safe_float(round(expectancy_pct, 4)),
            total_trades           = len(trades),
            winning_trades         = len(winners),
            losing_trades          = len(losers),
            avg_holding_period     = safe_float(round(avg_holding, 1)),
            max_consecutive_wins   = max_cw,
            max_consecutive_losses = max_cl,
            gross_profit           = safe_float(round(gross_profit, 2)),
            gross_loss             = safe_float(round(gross_loss, 2)),
            net_profit             = safe_float(round(net_profit, 2)),
        )