from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone
import uuid


class IndicatorCondition(BaseModel):
    """Single indicator condition for entry/exit"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    indicator: str  # MA, Donchian, ATR, ADX, Volume, RSI, MACD, Bollinger, Supertrend, VWAP
    params: Dict[str, Any]  # indicator-specific parameters
    condition: str  # e.g., "crossover", "above", "below", "breakout"
    value: Optional[float] = None


class StrategyRules(BaseModel):
    """Entry or Exit rules with AND/OR logic"""
    conditions: List[IndicatorCondition]
    logic: Literal["AND", "OR"] = "AND"


class StrategyCreate(BaseModel):
    """Strategy creation model"""
    name: str
    description: Optional[str] = None
    stocks: List[str]  # e.g., ["RELIANCE.NS", "TCS.NS"]
    timeframe: str  # 1m, 3m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo
    start_date: str
    end_date: str
    initial_capital: float
    strategy_type: Literal["long_only", "long_short"] = "long_only"
    position_sizing: Literal["fixed", "percent", "atr_risk"] = "percent"
    position_size_value: float = 100.0  # % or fixed amount
    entry_rules: StrategyRules
    exit_rules: StrategyRules
    stop_loss_atr_multiplier: Optional[float] = None
    trailing_stop: Optional[bool] = False


class Strategy(StrategyCreate):
    """Saved strategy with metadata"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Trade(BaseModel):
    """Individual trade record"""
    entry_date: str
    exit_date: str
    symbol: str
    entry_price: float
    exit_price: float
    position_type: Literal["long", "short"]
    quantity: float
    pnl: float
    pnl_percent: float
    holding_period: int  # in bars/candles


class BacktestMetrics(BaseModel):
    """Performance metrics from backtest"""
    total_return: float
    buy_hold_return: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown: float
    max_drawdown_duration: int
    win_rate: float
    profit_factor: float
    avg_win: float
    avg_loss: float
    expectancy: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    avg_holding_period: float


class BacktestResult(BaseModel):
    """Complete backtest result"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    strategy_id: str
    symbol: str
    metrics: BacktestMetrics
    trades: List[Trade]
    equity_curve: List[Dict[str, Any]]  # [{date, equity, drawdown}]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ScreenerFilter(BaseModel):
    """Stock screener filter criteria"""
    filter_type: Literal[
        "ath_breakout", 
        "52w_high", 
        "high_volume", 
        "strong_adx",
        "custom_strategy"
    ]
    params: Optional[Dict[str, Any]] = None
    strategy_id: Optional[str] = None  # For custom_strategy filter


class ScreenerRequest(BaseModel):
    """Stock screener request"""
    universe: List[str]  # List of stock symbols to screen
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
