import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  TrendingUp, TrendingDown, Activity, Target, Percent, ArrowLeft,
  BarChart2, Calendar, DollarSign, Zap, ShieldAlert, Trophy, Clock,
  Search,
  TextSearchIcon,
  LucideTextSearch
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, ComposedChart, Scatter
} from 'recharts';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import { useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;


// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
const fmtPct = (v) => `${Number(v).toFixed(2)}%`;
const fmtNum = (v, d = 2) => Number(v).toFixed(d);
const color = (v) => v >= 0 ? '#10b981' : '#ef4444';

// ─── Metric Card ─────────────────────────────────────────────────────────────
const MetricCard = ({ label, value, icon: Icon, colorClass, sub, badge }) => (
  <Card className="relative overflow-hidden">
    <CardContent className="pt-5 pb-4">
      <div className="flex items-start justify-between mb-2">
        <div className="text-sm text-muted-foreground font-medium">{label}</div>
        <Icon className={`w-4 h-4 ${colorClass}`} />
      </div>
      <div className={`text-2xl font-bold font-mono ${colorClass}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      {badge && (
        <Badge variant="outline" className={`mt-2 text-xs ${colorClass}`}>{badge}</Badge>
      )}
    </CardContent>
  </Card>
);

// ─── Monthly Returns Heatmap ──────────────────────────────────────────────────
const MonthlyHeatmap = ({ trades }) => {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const monthlyData = useMemo(() => {
    const map = {};
    trades.forEach(t => {
      const d = new Date(t.exit_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!map[key]) map[key] = { year: d.getFullYear(), month: d.getMonth(), pnl: 0, trades: 0 };
      map[key].pnl += t.pnl_percent;
      map[key].trades += 1;
    });
    return map;
  }, [trades]);

  const years = [...new Set(Object.values(monthlyData).map(d => d.year))].sort();

  const cellColor = (pnl) => {
    if (pnl === undefined) return 'bg-muted/20 text-muted-foreground/30';
    if (pnl > 5) return 'bg-emerald-500 text-white';
    if (pnl > 2) return 'bg-emerald-500/60 text-white';
    if (pnl > 0) return 'bg-emerald-500/30 text-emerald-300';
    if (pnl > -2) return 'bg-red-500/30 text-red-300';
    if (pnl > -5) return 'bg-red-500/60 text-white';
    return 'bg-red-500 text-white';
  };

  return (
    
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          Monthly Returns Heatmap
        </CardTitle>
        <CardDescription>Return % per month (green = profit, red = loss)</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left pb-2 pr-3 font-medium text-muted-foreground">Year</th>
              {MONTHS.map(m => (
                <th key={m} className="text-center pb-2 px-0.5 font-medium text-muted-foreground w-10">{m}</th>
              ))}
              <th className="text-center pb-2 px-2 font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {years.map(yr => {
              const yearTotal = MONTHS.reduce((sum, _, mi) => {
                const d = monthlyData[`${yr}-${mi}`];
                return sum + (d?.pnl || 0);
              }, 0);
              return (
                <tr key={yr}>
                  <td className="pr-3 py-0.5 font-mono text-muted-foreground">{yr}</td>
                  {MONTHS.map((_, mi) => {
                    const d = monthlyData[`${yr}-${mi}`];
                    return (
                      <td key={mi} className="px-0.5 py-0.5">
                        <div className={`h-8 w-10 rounded flex items-center justify-center text-xs font-mono ${cellColor(d?.pnl)}`}>
                          {d ? `${d.pnl > 0 ? '+' : ''}${fmtNum(d.pnl, 1)}` : '—'}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-2 py-0.5">
                    <div className={`h-8 w-14 rounded flex items-center justify-center text-xs font-bold font-mono ${cellColor(yearTotal)}`}>
                      {yearTotal > 0 ? '+' : ''}{fmtNum(yearTotal, 1)}%
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

// ─── Trade Distribution Chart ─────────────────────────────────────────────────
const TradeDistribution = ({ trades }) => {
  const { buckets, maxCount } = useMemo(() => {
    if (!trades.length) return { buckets: [], maxCount: 1 };
    const vals = trades.map(t => t.pnl_percent);
    const min = Math.floor(Math.min(...vals));
    const max = Math.ceil(Math.max(...vals));
    const bucketSize = Math.max(0.5, (max - min) / 20);
    const map = {};
    vals.forEach(v => {
      const key = Math.floor(v / bucketSize) * bucketSize;
      const label = `${key.toFixed(1)}`;
      map[label] = (map[label] || 0) + 1;
    });
    const bkts = Object.entries(map)
      .map(([k, cnt]) => ({ range: `${k}%`, value: parseFloat(k), count: cnt }))
      .sort((a, b) => a.value - b.value);
    return { buckets: bkts, maxCount: Math.max(...bkts.map(b => b.count)) };
  }, [trades]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-muted-foreground" />
          Trade Return Distribution
        </CardTitle>
        <CardDescription>Frequency of trade returns by range</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer>
            <BarChart data={buckets} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="range" fontSize={10} interval={2} stroke="#888" />
              <YAxis fontSize={10} stroke="#888" />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                formatter={(v) => [v, 'Trades']}
              />
              <ReferenceLine x="0.0%" stroke="#888" strokeDasharray="4 4" />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {buckets.map((b, i) => (
                  <Cell key={i} fill={b.value >= 0 ? '#10b981' : '#ef4444'} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Drawdown Chart ───────────────────────────────────────────────────────────
const DrawdownChart = ({ equity_curve }) => {
  const ddData = useMemo(() => {
    let peak = equity_curve[0]?.equity || 0;
    return equity_curve.map(p => {
      peak = Math.max(peak, p.equity);
      const dd = peak > 0 ? ((p.equity - peak) / peak) * 100 : 0;
      return { date: p.date, drawdown: parseFloat(dd.toFixed(2)) };
    });
  }, [equity_curve]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-muted-foreground" />
          Drawdown Over Time
        </CardTitle>
        <CardDescription>Percentage decline from equity peak</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer>
            <AreaChart data={ddData} margin={{ left: -10, right: 10 }}>
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tickFormatter={v => v.split(' ')[0]} minTickGap={40} fontSize={10} stroke="#888" />
              <YAxis tickFormatter={v => `${v.toFixed(0)}%`} fontSize={10} stroke="#888" />
              <Tooltip
                formatter={(v) => [`${fmtNum(v)}%`, 'Drawdown']}
                labelFormatter={l => l.split(' ')[0]}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
              />
              <ReferenceLine y={0} stroke="#888" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={1.5} fill="url(#ddGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Consecutive Stats ────────────────────────────────────────────────────────
const consecutiveStats = (trades) => {
  let maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0;
  trades.forEach(t => {
    if (t.pnl > 0) { curWin++; curLoss = 0; maxWin = Math.max(maxWin, curWin); }
    else { curLoss++; curWin = 0; maxLoss = Math.max(maxLoss, curLoss); }
  });
  return { maxWin, maxLoss };
};

// ─── Rolling Returns ──────────────────────────────────────────────────────────
const RollingReturns = ({ equity_curve }) => {
  const data = useMemo(() => {
    const window = 20;
    return equity_curve.slice(window).map((p, i) => {
      const prev = equity_curve[i];
      const ret = prev.equity > 0 ? ((p.equity - prev.equity) / prev.equity) * 100 : 0;
      return { date: p.date, return: parseFloat(ret.toFixed(2)) };
    });
  }, [equity_curve]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          Rolling 20-Period Returns
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tickFormatter={v => v.split(' ')[0]} minTickGap={40} fontSize={10} stroke="#888" />
              <YAxis tickFormatter={v => `${v.toFixed(0)}%`} fontSize={10} stroke="#888" />
              <Tooltip
                formatter={(v) => [`${fmtNum(v)}%`, 'Return']}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
              />
              <ReferenceLine y={0} stroke="#888" />
              <Bar dataKey="return" radius={[2, 2, 0, 0]}>
                {data.map((d, i) => <Cell key={i} fill={d.return >= 0 ? '#10b981' : '#ef4444'} opacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const BacktestResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [strategyData, setStrategyData] = useState(location.state?.strategyData);
  const [result, setResult] = useState(location.state?.result);
  
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState("");
  const [stocks, setStocks]= useState([]);


  useEffect(() => {
    axios.get(`${API}/stocks/all`)
      .then(res => setStocks(res.data))
      .catch(e => console.error("fetchStocks failed:", e));
  }, []);

  const handleSelect = async (stock) => {

    if (!strategyData) {
      toast.error("Strategy not loaded.");
      return;
    }
  
    // const clean = stock.symbol.replace(/\.NS$/, "").toUpperCase();
  
    
    setSearch("");
  
    const loading = toast.loading("Running backtest...");
  
    try {
      const updatedStrategy = {
        ...strategyData,
        stocks: [stock.symbol]
      };
  
      console.log("Sending strategy:", updatedStrategy);
  
      // Use Promise.all to ensure a minimum 3-second delay
      const [response] = await Promise.all([
        axios.post(`${API}/backtest`, updatedStrategy),
        new Promise(resolve => setTimeout(resolve, 3000))
      ]);
  
      setStrategyData(updatedStrategy);
      setResult(response.data);
  
      toast.dismiss(loading);
      toast.success("Backtest completed!");
  
    } catch (error) {
      console.error(error.response?.data);
      toast.dismiss(loading);
      toast.error("Backtest failed");
    }
  };

  const filteredStocks = [...new Map(stocks.map(s => [s.symbol, s])).values()]
  .filter(s =>
    s.symbol.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase())
  );
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && search.trim()) {
  
      const clean = search.toUpperCase()+".NS";

  
      handleSelect({ symbol: clean , name: clean });
  
      setSearch("");
    }
  };

  if (!result) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">No backtest results available.</p>
        <Button onClick={() => navigate('/builder')}>Go to Strategy Builder</Button>
      </div>
    );
  }

  const { metrics, trades, equity_curve, symbol } = result;
  const { maxWin, maxLoss } = consecutiveStats(trades);

  const winTrades = trades.filter(t => t.pnl > 0);
  const lossTrades = trades.filter(t => t.pnl <= 0);
  const avgWinHold = winTrades.length ? winTrades.reduce((s, t) => s + t.holding_period, 0) / winTrades.length : 0;
  const avgLossHold = lossTrades.length ? lossTrades.reduce((s, t) => s + t.holding_period, 0) / lossTrades.length : 0;
  const maxSingleWin = trades.reduce((m, t) => Math.max(m, t.pnl), -Infinity);
  const maxSingleLoss = trades.reduce((m, t) => Math.min(m, t.pnl), Infinity);
  const grossProfit = winTrades.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(lossTrades.reduce((s, t) => s + t.pnl, 0));

  const returnRating = (r) => {
    if (r > 50) return { label: 'Exceptional', color: 'text-emerald-400' };
    if (r > 20) return { label: 'Strong', color: 'text-emerald-400' };
    if (r > 0) return { label: 'Positive', color: 'text-blue-400' };
    return { label: 'Negative', color: 'text-red-400' };
  };
  const rating = returnRating(metrics.total_return);

  return (
    <div className="space-y-6 pb-12" data-testid="backtest-results">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold font-['Rajdhani'] tracking-tight">Backtest Results</h1>
            <Badge variant="outline" className={`${rating.color} border-current`}>{rating.label}</Badge>
          </div>
          <p className="text-muted-foreground ml-8">
            {symbol} · {trades.length} trades · {equity_curve.length} bars analyzed
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/builder', { state: { strategy: strategyData } })}>
          <Zap className="w-4 h-4 mr-2" /> Modify Strategy
        </Button>
        <div className="relative w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or symbol (e.g. RELIANCE, TCS)…"
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
          </div>
          {search && (
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {filteredStocks.length === 0
                ? <div className="px-4 py-3 text-sm text-muted-foreground">No stocks found</div>
                : filteredStocks.slice(0, 10).map((stock) => (
                    <div key={stock.symbol}
                      className="px-4 py-2 cursor-pointer hover:bg-muted flex items-center justify-between"
                      onClick={() => handleSelect(stock)}
                    >
                      <span>
                        <span className="font-semibold font-mono">{stock.symbol.replace(/\.NS$/, "")}</span>
                        <span className="text-muted-foreground ml-2 text-sm">{stock.name}</span>
                      </span>
                      <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                    </div>
                  ))
              }
            </div>
          )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="trades">Trade Log</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* KPI Row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard label="Total Return" value={fmtPct(metrics.total_return)} icon={TrendingUp}
              colorClass={metrics.total_return > 0 ? 'text-emerald-400' : 'text-red-400'}
              sub={`vs B&H ${fmtPct(metrics.buy_hold_return)}`} />
            <MetricCard label="Sharpe Ratio" value={fmtNum(metrics.sharpe_ratio)} icon={Target}
              colorClass={metrics.sharpe_ratio > 1 ? 'text-emerald-400' : metrics.sharpe_ratio > 0 ? 'text-amber-400' : 'text-red-400'}
              sub={metrics.sharpe_ratio > 1 ? 'Good' : metrics.sharpe_ratio > 0 ? 'Acceptable' : 'Poor'} />
            <MetricCard label="Max Drawdown" value={fmtPct(metrics.max_drawdown)} icon={TrendingDown}
              colorClass="text-red-400"
              sub={`${metrics.max_drawdown_duration} bars duration`} />
            <MetricCard label="Win Rate" value={fmtPct(metrics.win_rate)} icon={Percent}
              colorClass={metrics.win_rate > 55 ? 'text-emerald-400' : metrics.win_rate > 45 ? 'text-amber-400' : 'text-red-400'}
              sub={`${metrics.winning_trades}W / ${metrics.losing_trades}L`} />
            <MetricCard label="Profit Factor" value={fmtNum(metrics.profit_factor)} icon={BarChart2}
              colorClass={metrics.profit_factor > 1.5 ? 'text-emerald-400' : metrics.profit_factor > 1 ? 'text-amber-400' : 'text-red-400'}
              sub={metrics.profit_factor > 1.5 ? 'Strong edge' : metrics.profit_factor > 1 ? 'Slight edge' : 'No edge'} />
            <MetricCard label="Expectancy" value={fmt(metrics.expectancy)} icon={DollarSign}
              colorClass={metrics.expectancy > 0 ? 'text-emerald-400' : 'text-red-400'}
              sub="Per trade expected" />
          </div>

          {/* Equity Curve */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                Equity Curve
              </CardTitle>
              <CardDescription>Portfolio value over time vs Buy & Hold</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer>
                  <AreaChart data={equity_curve} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="date" tickFormatter={v => v.split(' ')[0]} minTickGap={40} fontSize={10} stroke="#888" />
                    <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} fontSize={10} stroke="#888" />
                    <Tooltip
                      formatter={(v, n) => [fmt(v), n === 'equity' ? 'Strategy' : 'Buy & Hold']}
                      labelFormatter={l => l.split(' ')[0]}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    />
                    {equity_curve[0]?.buy_hold && (
                      <Line type="monotone" dataKey="buy_hold" stroke="#6366f1" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
                    )}
                    <Area type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} fill="url(#eqGrad)" dot={false} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DrawdownChart equity_curve={equity_curve} />
            <TradeDistribution trades={trades} />
          </div>
        </TabsContent>

        {/* ── ANALYSIS TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="analysis" className="space-y-6 mt-4">
          {/* Detailed stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Sortino Ratio', value: fmtNum(metrics.sortino_ratio), sub: 'Downside risk-adjusted return' },
              { label: 'Avg Holding Period', value: `${fmtNum(metrics.avg_holding_period, 1)} bars`, sub: 'Per trade average' },
              { label: 'Avg Win Hold', value: `${fmtNum(avgWinHold, 1)} bars`, sub: 'Winning trade hold time' },
              { label: 'Avg Loss Hold', value: `${fmtNum(avgLossHold, 1)} bars`, sub: 'Losing trade hold time' },
              { label: 'Max Consec. Wins', value: maxWin, sub: 'Consecutive winning trades', color: 'text-emerald-400' },
              { label: 'Max Consec. Losses', value: maxLoss, sub: 'Consecutive losing trades', color: 'text-red-400' },
              { label: 'Best Trade', value: fmt(maxSingleWin), sub: 'Largest single win', color: 'text-emerald-400' },
              { label: 'Worst Trade', value: fmt(maxSingleLoss), sub: 'Largest single loss', color: 'text-red-400' },
              { label: 'Avg Win', value: fmt(metrics.avg_win), sub: 'Average profit per win', color: 'text-emerald-400' },
              { label: 'Avg Loss', value: fmt(metrics.avg_loss), sub: 'Average loss per loss', color: 'text-red-400' },
              { label: 'Gross Profit', value: fmt(grossProfit), sub: 'Total profit from wins', color: 'text-emerald-400' },
              { label: 'Gross Loss', value: fmt(-grossLoss), sub: 'Total loss from losses', color: 'text-red-400' },
            ].map((s, i) => (
              <Card key={i} className="p-4">
                <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                <div className={`text-xl font-bold font-mono ${s.color || 'text-foreground'}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
              </Card>
            ))}
          </div>

          <RollingReturns equity_curve={equity_curve} />
          <MonthlyHeatmap trades={trades} />

          {/* Win/Loss ratio visual */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-muted-foreground" />
                Win vs Loss Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Win Rate</span>
                    <span>{fmtPct(metrics.win_rate)}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${metrics.win_rate}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-emerald-400">Winning Trades</div>
                    <div className="text-3xl font-bold font-mono text-emerald-400">{metrics.winning_trades}</div>
                    <div className="text-xs text-muted-foreground">Gross profit: {fmt(grossProfit)}</div>
                    <div className="text-xs text-muted-foreground">Avg: {fmt(metrics.avg_win)} · {fmtNum(avgWinHold, 1)} bars hold</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-red-400">Losing Trades</div>
                    <div className="text-3xl font-bold font-mono text-red-400">{metrics.losing_trades}</div>
                    <div className="text-xs text-muted-foreground">Gross loss: {fmt(-grossLoss)}</div>
                    <div className="text-xs text-muted-foreground">Avg: {fmt(metrics.avg_loss)} · {fmtNum(avgLossHold, 1)} bars hold</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TRADES TAB ───────────────────────────────────────────────────── */}
        <TabsContent value="trades" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Trade Log
                </CardTitle>
                <CardDescription>{trades.length} total trades</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Entry Date</TableHead>
                      <TableHead>Exit Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Entry ₹</TableHead>
                      <TableHead>Exit ₹</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>P&L ₹</TableHead>
                      <TableHead>Return %</TableHead>
                      <TableHead>Hold</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((t, i) => (
                      <TableRow key={i} className={t.pnl > 0 ? 'bg-emerald-500/3' : 'bg-red-500/3'}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{t.entry_date.split('T')[0]}</TableCell>
                        <TableCell className="font-mono text-xs">{t.exit_date.split('T')[0]}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={t.position_type === 'long' ? 'text-emerald-400 border-emerald-500/30' : 'text-red-400 border-red-500/30'}>
                            {t.position_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">₹{fmtNum(t.entry_price)}</TableCell>
                        <TableCell className="font-mono text-sm">₹{fmtNum(t.exit_price)}</TableCell>
                        <TableCell className="font-mono text-sm">{fmtNum(t.quantity, 0)}</TableCell>
                        <TableCell className={`font-mono font-bold text-sm ${color(t.pnl)}`}>
                          {t.pnl > 0 ? '+' : ''}₹{fmtNum(t.pnl)}
                        </TableCell>
                        <TableCell className={`font-mono text-sm ${color(t.pnl_percent)}`}>
                          {t.pnl_percent > 0 ? '+' : ''}{fmtNum(t.pnl_percent)}%
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.holding_period}b</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── REPORT TAB ───────────────────────────────────────────────────── */}
        <TabsContent value="report" className="mt-4 space-y-4">
          {/* QuantStats-style full report */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance Summary Report</CardTitle>
              <CardDescription>QuantStats-style comprehensive metrics for {symbol}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
                {[
                  ['Strategy', result.strategy_name || 'Custom Strategy'],
                  ['Symbol', symbol],
                  ['Period', `${trades[0]?.entry_date?.split('T')[0]} — ${trades[trades.length - 1]?.exit_date?.split('T')[0]}`],
                  ['Total Return', fmtPct(metrics.total_return)],
                  ['Buy & Hold Return', fmtPct(metrics.buy_hold_return)],
                  ['Annualized Return', fmtPct((Math.pow(1 + metrics.total_return / 100, 252 / equity_curve.length) - 1) * 100)],
                  ['Sharpe Ratio', fmtNum(metrics.sharpe_ratio)],
                  ['Sortino Ratio', fmtNum(metrics.sortino_ratio)],
                  ['Calmar Ratio', metrics.max_drawdown !== 0 ? fmtNum(metrics.total_return / Math.abs(metrics.max_drawdown)) : 'N/A'],
                  ['Max Drawdown', fmtPct(metrics.max_drawdown)],
                  ['Max Drawdown Duration', `${metrics.max_drawdown_duration} bars`],
                  ['Win Rate', fmtPct(metrics.win_rate)],
                  ['Profit Factor', fmtNum(metrics.profit_factor)],
                  ['Expectancy', fmt(metrics.expectancy)],
                  ['Total Trades', metrics.total_trades],
                  ['Winning Trades', metrics.winning_trades],
                  ['Losing Trades', metrics.losing_trades],
                  ['Avg Win', fmt(metrics.avg_win)],
                  ['Avg Loss', fmt(metrics.avg_loss)],
                  ['Win/Loss Ratio', fmtNum(Math.abs(metrics.avg_win / (metrics.avg_loss || 1)))],
                  ['Avg Holding Period', `${fmtNum(metrics.avg_holding_period, 1)} bars`],
                  ['Max Consec. Wins', maxWin],
                  ['Max Consec. Losses', maxLoss],
                  ['Best Trade', fmt(maxSingleWin)],
                  ['Worst Trade', fmt(maxSingleLoss)],
                  ['Gross Profit', fmt(grossProfit)],
                  ['Gross Loss', fmt(-grossLoss)],
                  ['Net Profit', fmt(grossProfit - grossLoss)],
                ].map(([label, val], i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className={`text-sm font-mono font-medium ${
                      ['Total Return','Annualized Return','Net Profit','Gross Profit','Avg Win','Best Trade','Expectancy'].includes(label)
                        ? parseFloat(String(val).replace(/[₹,%]/g,'').replace(/,/g,'')) >= 0 ? 'text-emerald-400' : 'text-red-400'
                        : ['Max Drawdown','Gross Loss','Avg Loss','Worst Trade'].includes(label)
                        ? 'text-red-400'
                        : 'text-foreground'
                    }`}>{val}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {result.quantstats_report_url && (
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold mb-1">Full QuantStats HTML Report</div>
                    <div className="text-sm text-muted-foreground">Comprehensive tearsheet with all metrics</div>
                  </div>
                  <Button asChild>
                    <a href={result.quantstats_report_url} target="_blank" rel="noopener noreferrer">
                      Open Report ↗
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BacktestResults;