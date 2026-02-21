"""Backtesting Engine
Vectorized backtesting for strategy performance evaluation
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Any
from datetime import datetime
import logging

from services.indicators import IndicatorService
from models import Strategy, BacktestResult, BacktestMetrics, Trade, IndicatorCondition, StrategyRules

logger = logging.getLogger(__name__)


class BacktestEngine:
    """Vectorized backtesting engine"""
    
    def __init__(self, df: pd.DataFrame, strategy: Strategy):
        self.df = df.copy()
        self.strategy = strategy
        self.indicators = IndicatorService()
        
    def add_indicators(self) -> None:
        """Calculate and add all required indicators to dataframe"""
        all_conditions = self.strategy.entry_rules.conditions + self.strategy.exit_rules.conditions
        
        for condition in all_conditions:
            indicator = condition.indicator
            params = condition.params
            
            if indicator == 'MA':
                if params.get('type') == 'EMA':
                    self.df[f"EMA_{params['period']}"] = self.indicators.calculate_ema(
                        self.df, params['period'], params.get('source', 'Close')
                    )
                else:
                    self.df[f"SMA_{params['period']}"] = self.indicators.calculate_sma(
                        self.df, params['period'], params.get('source', 'Close')
                    )
            
            elif indicator == 'Donchian':
                result = self.indicators.calculate_donchian(
                    self.df, params.get('upper_period', 20), params.get('lower_period', 20)
                )
                self.df['Donchian_Upper'] = result['upper']
                self.df['Donchian_Lower'] = result['lower']
            
            elif indicator == 'ATR':
                self.df[f"ATR_{params.get('period', 14)}"] = self.indicators.calculate_atr(
                    self.df, params.get('period', 14)
                )
            
            elif indicator == 'ADX':
                result = self.indicators.calculate_adx(self.df, params.get('period', 14))
                self.df['ADX'] = result['adx']
            
            elif indicator == 'Volume':
                self.df[f"Volume_MA_{params.get('period', 20)}"] = self.indicators.calculate_volume_ma(
                    self.df, params.get('period', 20)
                )
            
            elif indicator == 'RSI':
                self.df[f"RSI_{params.get('period', 14)}"] = self.indicators.calculate_rsi(
                    self.df, params.get('period', 14), params.get('source', 'Close')
                )
            
            elif indicator == 'MACD':
                result = self.indicators.calculate_macd(
                    self.df, params.get('fast', 12), params.get('slow', 26), 
                    params.get('signal', 9), params.get('source', 'Close')
                )
                self.df['MACD'] = result['macd']
                self.df['MACD_Signal'] = result['signal']
            
            elif indicator == 'Bollinger':
                result = self.indicators.calculate_bollinger(
                    self.df, params.get('period', 20), params.get('std_dev', 2.0),
                    params.get('source', 'Close')
                )
                self.df['BB_Upper'] = result['upper']
                self.df['BB_Lower'] = result['lower']
            
            elif indicator == 'Supertrend':
                result = self.indicators.calculate_supertrend(
                    self.df, params.get('atr_period', 10), params.get('multiplier', 3.0)
                )
                self.df['Supertrend'] = result['supertrend']
                self.df['Supertrend_Direction'] = result['direction']
            
            elif indicator == 'VWAP':
                self.df['VWAP'] = self.indicators.calculate_vwap(self.df)
    
    def evaluate_condition(self, condition: IndicatorCondition, idx: int) -> bool:
        """Evaluate a single condition at a specific index"""
        try:
            if pd.isna(self.df.iloc[idx]['Close']):
                return False
            
            indicator = condition.indicator
            params = condition.params
            cond_type = condition.condition
            value = condition.value
            
            if indicator == 'MA':
                ma_type = params.get('type', 'SMA')
                period = params['period']
                col_name = f"{ma_type}_{period}"
                
                if cond_type == 'crossover':
                    return (self.df.iloc[idx-1]['Close'] <= self.df.iloc[idx-1][col_name] and
                           self.df.iloc[idx]['Close'] > self.df.iloc[idx][col_name])
                elif cond_type == 'crossunder':
                    return (self.df.iloc[idx-1]['Close'] >= self.df.iloc[idx-1][col_name] and
                           self.df.iloc[idx]['Close'] < self.df.iloc[idx][col_name])
                elif cond_type == 'above':
                    return self.df.iloc[idx]['Close'] > self.df.iloc[idx][col_name]
                elif cond_type == 'below':
                    return self.df.iloc[idx]['Close'] < self.df.iloc[idx][col_name]
            
            elif indicator == 'Donchian':
                if cond_type == 'breakout_upper':
                    return self.df.iloc[idx]['Close'] > self.df.iloc[idx]['Donchian_Upper']
                elif cond_type == 'breakout_lower':
                    return self.df.iloc[idx]['Close'] < self.df.iloc[idx]['Donchian_Lower']
            
            elif indicator == 'RSI':
                period = params.get('period', 14)
                rsi_val = self.df.iloc[idx][f'RSI_{period}']
                
                if cond_type == 'above':
                    return rsi_val > value
                elif cond_type == 'below':
                    return rsi_val < value
            
            elif indicator == 'ADX':
                adx_val = self.df.iloc[idx]['ADX']
                threshold = params.get('threshold', 25)
                if cond_type == 'above':
                    return adx_val > threshold
            
            elif indicator == 'MACD':
                if cond_type == 'crossover':
                    return (self.df.iloc[idx-1]['MACD'] <= self.df.iloc[idx-1]['MACD_Signal'] and
                           self.df.iloc[idx]['MACD'] > self.df.iloc[idx]['MACD_Signal'])
            
            elif indicator == 'Volume':
                period = params.get('period', 20)
                multiplier = params.get('multiplier', 1.5)
                vol_ma = self.df.iloc[idx][f'Volume_MA_{period}']
                if cond_type == 'high_volume':
                    return self.df.iloc[idx]['Volume'] > (vol_ma * multiplier)
            
            return False
            
        except Exception as e:
            logger.error(f"Error evaluating condition: {str(e)}")
            return False
    
    def evaluate_rules(self, rules: StrategyRules, idx: int) -> bool:
        """Evaluate entry or exit rules (AND/OR logic)"""
        if not rules.conditions:
            return False
        
        results = [self.evaluate_condition(cond, idx) for cond in rules.conditions]
        return all(results) if rules.logic == 'AND' else any(results)
    
    def run_backtest(self) -> BacktestResult:
        """Execute backtest and return results"""
        self.add_indicators()
        
        trades: List[Trade] = []
        equity_curve = []
        position = None
        equity = self.strategy.initial_capital
        peak_equity = equity
        
        # Safety limit to prevent infinite loops
        max_iterations = len(self.df)
        if max_iterations > 10000:
            logger.warning(f"Large dataset: {max_iterations} bars, limiting to 10000")
            max_iterations = min(max_iterations, 10000)
        
        for i in range(1, max_iterations):
            if i >= len(self.df):
                break
                
            current_price = self.df.iloc[i]['Close']
            current_date = self.df.iloc[i]['Date']
            
            if position:
                unrealized_pnl = (current_price - position['entry_price']) * position['quantity']
                current_equity = equity + unrealized_pnl
            else:
                current_equity = equity
            
            drawdown = (peak_equity - current_equity) / peak_equity if peak_equity > 0 else 0
            peak_equity = max(peak_equity, current_equity)
            
            equity_curve.append({
                'date': str(current_date),
                'equity': current_equity,
                'drawdown': drawdown * 100
            })
            
            if position:
                exit_signal = self.evaluate_rules(self.strategy.exit_rules, i)
                
                if self.strategy.stop_loss_atr_multiplier:
                    atr_col = "ATR_14"
                    if atr_col in self.df.columns:
                        atr = self.df.iloc[i][atr_col]
                        stop_loss = position['entry_price'] - (atr * self.strategy.stop_loss_atr_multiplier)
                        if current_price <= stop_loss:
                            exit_signal = True
                
                if exit_signal:
                    pnl = (current_price - position['entry_price']) * position['quantity']
                    pnl_percent = ((current_price / position['entry_price']) - 1) * 100
                    
                    trade = Trade(
                        entry_date=str(position['entry_date']),
                        exit_date=str(current_date),
                        symbol=self.strategy.stocks[0],
                        entry_price=position['entry_price'],
                        exit_price=current_price,
                        position_type='long',
                        quantity=position['quantity'],
                        pnl=pnl,
                        pnl_percent=pnl_percent,
                        holding_period=i - position['entry_idx']
                    )
                    trades.append(trade)
                    
                    equity += pnl
                    position = None
            
            else:
                entry_signal = self.evaluate_rules(self.strategy.entry_rules, i)
                
                if entry_signal:
                    if self.strategy.position_sizing == 'percent':
                        position_value = equity * (self.strategy.position_size_value / 100)
                    else:
                        position_value = self.strategy.position_size_value
                    
                    quantity = position_value / current_price
                    
                    position = {
                        'entry_date': current_date,
                        'entry_idx': i,
                        'entry_price': current_price,
                        'quantity': quantity
                    }
        
        metrics = self.calculate_metrics(trades, equity_curve)
        
        return BacktestResult(
            strategy_id=self.strategy.id,
            symbol=self.strategy.stocks[0],
            metrics=metrics,
            trades=trades,
            equity_curve=equity_curve
        )
    
    def calculate_metrics(self, trades: List[Trade], equity_curve: List[Dict]) -> BacktestMetrics:
        """Calculate performance metrics"""
        if not trades:
            return BacktestMetrics(
                total_return=0, buy_hold_return=0, sharpe_ratio=0, sortino_ratio=0,
                max_drawdown=0, max_drawdown_duration=0, win_rate=0, profit_factor=0,
                avg_win=0, avg_loss=0, expectancy=0, total_trades=0,
                winning_trades=0, losing_trades=0, avg_holding_period=0
            )
        
        final_equity = equity_curve[-1]['equity']
        total_return = ((final_equity / self.strategy.initial_capital) - 1) * 100
        buy_hold_return = ((self.df.iloc[-1]['Close'] / self.df.iloc[0]['Close']) - 1) * 100
        
        winning_trades = [t for t in trades if t.pnl > 0]
        losing_trades = [t for t in trades if t.pnl <= 0]
        
        win_rate = (len(winning_trades) / len(trades)) * 100 if trades else 0
        total_wins = sum(t.pnl for t in winning_trades)
        total_losses = abs(sum(t.pnl for t in losing_trades))
        
        avg_win = total_wins / len(winning_trades) if winning_trades else 0
        avg_loss = total_losses / len(losing_trades) if losing_trades else 0
        profit_factor = total_wins / total_losses if total_losses > 0 else 0
        
        expectancy = (avg_win * (len(winning_trades) / len(trades))) - \
                    (avg_loss * (len(losing_trades) / len(trades))) if trades else 0
        
        max_dd = max([e['drawdown'] for e in equity_curve]) if equity_curve else 0
        
        returns = pd.Series([t.pnl_percent for t in trades])
        sharpe = (returns.mean() / returns.std()) * np.sqrt(252) if len(returns) > 1 and returns.std() > 0 else 0
        
        negative_returns = returns[returns < 0]
        sortino = (returns.mean() / negative_returns.std()) * np.sqrt(252) if len(negative_returns) > 1 and negative_returns.std() > 0 else 0
        
        avg_holding = sum(t.holding_period for t in trades) / len(trades) if trades else 0
        
        return BacktestMetrics(
            total_return=round(total_return, 2),
            buy_hold_return=round(buy_hold_return, 2),
            sharpe_ratio=round(sharpe, 2),
            sortino_ratio=round(sortino, 2),
            max_drawdown=round(max_dd, 2),
            max_drawdown_duration=0,
            win_rate=round(win_rate, 2),
            profit_factor=round(profit_factor, 2),
            avg_win=round(avg_win, 2),
            avg_loss=round(avg_loss, 2),
            expectancy=round(expectancy, 2),
            total_trades=len(trades),
            winning_trades=len(winning_trades),
            losing_trades=len(losing_trades),
            avg_holding_period=round(avg_holding, 1)
        )
