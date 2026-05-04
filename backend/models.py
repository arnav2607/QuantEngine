"""
Drop-in replacement for BacktestMetrics and StrategyCreate in your models.py
Also adds the new risk management fields to StrategyCreate.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timezone
import uuid


class IndicatorCondition(BaseModel):
    """Single indicator condition for entry/exit"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    indicator: str   # MA, MA_CROSS, RSI, MACD, Supertrend, VWAP, Bollinger, Volume
    params: Dict[str, Any]
    condition: str   # e.g. crossover, crossunder, above, below, ...
    value: Optional[float] = None


class StrategyRules(BaseModel):
    conditions: List[IndicatorCondition]
    logic: Literal["AND", "OR"] = "AND"


class StrategyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    stocks: List[str]
    timeframe: str   # 1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo
    start_date: str
    end_date: str
    initial_capital: float
    strategy_type: Literal["long_only", "short_only"] = "long_only"
    position_sizing: Literal["fixed", "percent", "atr_risk"] = "percent"
    position_size_value: float = 10.0
    entry_rules: StrategyRules
    exit_rules: StrategyRules

    # Risk management — all optional, any combination works
    stop_loss_pct: Optional[float] = None               # fixed % stop
    take_profit_pct: Optional[float] = None             # fixed % target
    stop_loss_atr_multiplier: Optional[float] = None    # ATR-based stop
    take_profit_atr_multiplier: Optional[float] = None  # ATR-based target
    trailing_stop: Optional[bool] = False
    additional_exit_conditions: Optional[bool] = True  # e.g. exit if RSI > 70
    trailing_stop_pct: Optional[float] = None           # trail distance 
    time_based_exit_bars: Optional[int] = None         # exit after N bars
    breakdown_exit_pct: Optional[float] = None              # exit if price breaks key level

    max_open_trades: int = 1
    slippage_percent: float = 0.05
    leverage: int = 1.0


class Strategy(StrategyCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Trade(BaseModel):
    entry_date: str
    exit_date: str
    symbol: str
    entry_price: float
    exit_price: float
    position_type: Literal["long", "short"]
    quantity: float
    pnl: float
    pnl_percent: float
    holding_period: int  # bars


class BacktestMetrics(BaseModel):
    """TradingView Strategy Tester-style metrics"""
    # Returns
    total_return: float            # % total return
    annualized_return: float       # % annualised
    buy_hold_return: float         # % buy & hold over same period
    net_profit: float              # ₹ net profit
    gross_profit: float            # ₹ gross profit from winners
    gross_loss: float              # ₹ gross loss from losers

    # Risk-adjusted
    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float            # ann_return / max_drawdown
    max_drawdown: float            # % max peak-to-trough
    max_drawdown_duration: int     # bars spent in drawdown

    # Trade stats
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float                # %
    profit_factor: float           # gross_profit / gross_loss
    avg_win: float                 # ₹
    avg_loss: float                # ₹
    avg_win_pct: float             # %
    avg_loss_pct: float            # %
    expectancy: float              # ₹ per trade
    expectancy_pct: float          # % per trade
    avg_holding_period: float      # bars
    max_consecutive_wins: int
    max_consecutive_losses: int


class BacktestResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    strategy_id: str
    symbol: str
    metrics: BacktestMetrics
    trades: List[Trade]
    equity_curve: List[Dict[str, Any]]  # [{date, equity, drawdown}]
    quantstats_report_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ScreenerFilter(BaseModel):
    """Stock screener filter criteria"""

    filter_type: Literal[
        "NIFTY50",
        "NIFTYNEXT50",
        "NIFTY200",
        "NIFTY500",
        "NIFTYTOTALMARKET",
        "NIFTY_CHEMICALS",
        "NIFTY_FINANCE",
        "NIFTY_IT",
        "NIFTY_PSUBANK",
        "NIFTY_AUTO",
        "NIFTY_FMCG",
        "NIFTY_METALS",
        "NIFTY_BANK",
        "NIFTY_MEDIA",
        "ath",
        "52w_high",
        "price_above_ma",
        "price_near_low",
        "new_high",
        "new_low",
        "high_volume",
        "unusual_volume",
        "volume_spike",
        "increasing_volume",
        "high_volatility",
        "bollinger_squeeze",
        "strong_adx",
        "rsi_oversold",
        "rsi_overbought",
        "macd_bullish",
        "macd_bearish",
        "custom_strategy",
        "bullish_engulfing",
        "bearish_engulfing",
        "doji",
        "hammer",
        "gainers_1d",
        "losers_1d",
        "gainers_1w",
        "gainers_1m"
    ]

    params: Optional[Dict[str, Any]] = None
    strategy_id: Optional[str] = None  # For custom_strategy filter


class ScreenerRequest(BaseModel):
    """Stock screener request"""
    universe_type: str = "ALL"
    filters: List[ScreenerFilter]
    date: Optional[str] = None  # Specific date or "latest"


class ScreenerResult(BaseModel):
    """Screened stock result"""
    symbol: str
    name: str
    price: float
    volume: float
    matched_filters: List[str]
    indicator_values: Dict[str, Any]


class StockData(BaseModel):
    """Stock price data"""
    symbol: str
    data: List[Dict[str, Any]]  # OHLCV data with indicators
