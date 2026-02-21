# QuantEdge - Professional Strategy Backtester & Stock Screener

A production-grade web application for backtesting trading strategies and screening stocks in Indian markets (NSE/BSE). Build, test, and optimize trading strategies without writing code.

## 🚀 Features

### Core Functionality

#### 1. **No-Code Strategy Builder**
- Visual strategy creation with modular conditions
- 10+ technical indicators with full customization
- Add/remove entry and exit rules dynamically
- AND/OR logic for combining conditions
- Multiple timeframes (1m to 1 month)
- Position sizing options (fixed, %, ATR-based)

#### 2. **Powerful Backtesting Engine**
- Vectorized calculations using pandas/numpy
- Comprehensive performance metrics:
  - Total Return & Buy-Hold Comparison
  - Sharpe Ratio & Sortino Ratio
  - Maximum Drawdown & Duration
  - Win Rate & Profit Factor
  - Average Win/Loss & Expectancy
- Detailed trade history with P&L
- Equity curve visualization

#### 3. **Stock Screener**
- 52-Week High Breakout detection
- High Relative Volume filter
- Strong ADX Trend identification
- Real-time filtering across 20+ NSE/BSE stocks

#### 4. **Technical Indicators Encyclopedia**
Complete documentation with formulas:
- Moving Average, Donchian Channel, ATR
- ADX, Volume MA, RSI, MACD
- Bollinger Bands, Supertrend, VWAP

#### 5. **Professional UI/UX**
- Dark/Light theme toggle
- Responsive design
- Professional quant aesthetic

## 🛠️ Tech Stack

**Backend**: FastAPI, MongoDB, yfinance, pandas, numpy
**Frontend**: React 19, Tailwind CSS, Shadcn/UI, Lightweight Charts

## 🎯 Usage Guide

### Creating a Strategy
1. Navigate to Strategy Builder
2. Configure basic settings (stock, timeframe, capital)
3. Add entry conditions with indicators
4. Add exit conditions
5. Save or Run Backtest

### Stock Screener
1. Navigate to Stock Screener
2. Select filters (52W high, volume, ADX)
3. Click "Run Screener"
4. View matched stocks

## 📊 API Endpoints

- `GET /api/stocks/popular` - Popular Indian stocks
- `POST /api/strategies` - Create strategy
- `POST /api/backtest` - Run backtest
- `POST /api/screener` - Screen stocks
- `GET /api/indicators/info` - Indicator details

## 🚧 Roadmap

**Completed**: Strategy Builder, Backtesting, Screener, Dark/Light theme

**Future**: Live charting, PDF reports, Walk-forward testing, Monte Carlo simulation, Parameter optimization

## 📝 Notes

- Uses Yahoo Finance (free, 15-min delayed data)
- Intraday data limited to 60 days
- Educational purposes only

Built with ❤️ for the trading community
