"""Famous Pre-built Strategy Templates"""

FAMOUS_STRATEGIES = [
    {
        'id': 'ma_crossover',
        'name': 'Moving Average Crossover',
        'description': 'Classic trend-following strategy using 50/200 EMA crossover (Golden Cross/Death Cross)',
        'category': 'Trend Following',
        'timeframe': '1d',
        'entry_rules': {
            'conditions': [
                {
                    'indicator': 'MA',
                    'params': {'period': 50, 'type': 'EMA', 'source': 'Close'},
                    'condition': 'crosses_above',
                    'target': {'indicator': 'MA', 'params': {'period': 200, 'type': 'EMA'}}
                }
            ],
            'logic': 'AND'
        },
        'exit_rules': {
            'conditions': [
                {
                    'indicator': 'MA',
                    'params': {'period': 50, 'type': 'EMA', 'source': 'Close'},
                    'condition': 'crosses_below',
                    'target': {'indicator': 'MA', 'params': {'period': 200, 'type': 'EMA'}}
                }
            ],
            'logic': 'AND'
        }
    },
    {
        'id': 'rsi_oversold',
        'name': 'RSI Oversold/Overbought',
        'description': 'Mean reversion strategy buying oversold (RSI < 30) and selling overbought (RSI > 70)',
        'category': 'Mean Reversion',
        'timeframe': '1h',
        'entry_rules': {
            'conditions': [
                {
                    'indicator': 'RSI',
                    'params': {'period': 14},
                    'condition': 'crosses_above',
                    'value': 30
                }
            ],
            'logic': 'AND'
        },
        'exit_rules': {
            'conditions': [
                {
                    'indicator': 'RSI',
                    'params': {'period': 14},
                    'condition': 'crosses_above',
                    'value': 70
                }
            ],
            'logic': 'AND'
        }
    },
    {
        'id': 'macd_momentum',
        'name': 'MACD Momentum',
        'description': 'Momentum strategy entering on MACD bullish crossover with confirmation',
        'category': 'Momentum',
        'timeframe': '1d',
        'entry_rules': {
            'conditions': [
                {
                    'indicator': 'MACD',
                    'params': {'fast': 12, 'slow': 26, 'signal': 9},
                    'condition': 'line_crosses_above_signal',
                    'value': None
                },
                {
                    'indicator': 'MACD',
                    'params': {'fast': 12, 'slow': 26, 'signal': 9},
                    'condition': 'histogram_positive',
                    'value': None
                }
            ],
            'logic': 'AND'
        },
        'exit_rules': {
            'conditions': [
                {
                    'indicator': 'MACD',
                    'params': {'fast': 12, 'slow': 26, 'signal': 9},
                    'condition': 'line_crosses_below_signal',
                    'value': None
                }
            ],
            'logic': 'AND'
        }
    },
    {
        'id': 'bollinger_breakout',
        'name': 'Bollinger Band Breakout',
        'description': 'Volatility breakout buying upper band breakout with volume confirmation',
        'category': 'Breakout',
        'timeframe': '15m',
        'entry_rules': {
            'conditions': [
                {
                    'indicator': 'Bollinger',
                    'params': {'period': 20, 'std_dev': 2.0},
                    'condition': 'close_breaks_upper',
                    'value': None
                },
                {
                    'indicator': 'Volume',
                    'params': {'period': 20, 'multiplier': 1.5},
                    'condition': 'high_volume',
                    'value': None
                }
            ],
            'logic': 'AND'
        },
        'exit_rules': {
            'conditions': [
                {
                    'indicator': 'Bollinger',
                    'params': {'period': 20, 'std_dev': 2.0},
                    'condition': 'close_breaks_lower',
                    'value': None
                }
            ],
            'logic': 'AND'
        }
    },
    {
        'id': 'supertrend_trend',
        'name': 'Supertrend Following',
        'description': 'Clean trend-following strategy using Supertrend indicator signals',
        'category': 'Trend Following',
        'timeframe': '1h',
        'entry_rules': {
            'conditions': [
                {
                    'indicator': 'Supertrend',
                    'params': {'atr_period': 10, 'multiplier': 3.0},
                    'condition': 'buy_signal',
                    'value': None
                },
                {
                    'indicator': 'ADX',
                    'params': {'period': 14, 'threshold': 25},
                    'condition': 'above_threshold',
                    'value': 25
                }
            ],
            'logic': 'AND'
        },
        'exit_rules': {
            'conditions': [
                {
                    'indicator': 'Supertrend',
                    'params': {'atr_period': 10, 'multiplier': 3.0},
                    'condition': 'sell_signal',
                    'value': None
                }
            ],
            'logic': 'AND'
        }
    },
    {
        'id': 'donchian_turtle',
        'name': 'Turtle Trading System',
        'description': 'Famous Turtle Traders strategy using Donchian Channel breakouts',
        'category': 'Breakout',
        'timeframe': '1d',
        'entry_rules': {
            'conditions': [
                {
                    'indicator': 'Donchian',
                    'params': {'upper_period': 20, 'lower_period': 10},
                    'condition': 'breakout_upper',
                    'value': None
                }
            ],
            'logic': 'AND'
        },
        'exit_rules': {
            'conditions': [
                {
                    'indicator': 'Donchian',
                    'params': {'upper_period': 10, 'lower_period': 10},
                    'condition': 'breakout_lower',
                    'value': None
                }
            ],
            'logic': 'AND'
        },
        'stop_loss_atr_multiplier': 2.0
    },
    {
        'id': 'triple_ema',
        'name': 'Triple EMA System',
        'description': 'Multi-timeframe momentum using 8/21/55 EMA alignment',
        'category': 'Momentum',
        'timeframe': '15m',
        'entry_rules': {
            'conditions': [
                {
                    'indicator': 'MA',
                    'params': {'period': 8, 'type': 'EMA'},
                    'condition': 'crosses_above',
                    'target': {'indicator': 'MA', 'params': {'period': 21, 'type': 'EMA'}}
                },
                {
                    'indicator': 'MA',
                    'params': {'period': 21, 'type': 'EMA'},
                    'condition': 'above',
                    'target': {'indicator': 'MA', 'params': {'period': 55, 'type': 'EMA'}}
                }
            ],
            'logic': 'AND'
        },
        'exit_rules': {
            'conditions': [
                {
                    'indicator': 'MA',
                    'params': {'period': 8, 'type': 'EMA'},
                    'condition': 'crosses_below',
                    'target': {'indicator': 'MA', 'params': {'period': 21, 'type': 'EMA'}}
                }
            ],
            'logic': 'AND'
        }
    },
]

def get_all_templates():
    return FAMOUS_STRATEGIES

def get_template_by_id(template_id):
    for strategy in FAMOUS_STRATEGIES:
        if strategy['id'] == template_id:
            return strategy
    return None

def get_templates_by_category(category):
    return [s for s in FAMOUS_STRATEGIES if s['category'] == category]
