// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Switch } from '@/components/ui/switch';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
// import {
//   Plus, Trash2, Play, Save, ChevronDown, ChevronUp,
//   Info, Zap, TrendingUp, Shield, Settings2, AlertCircle
// } from 'lucide-react';
// import { toast } from 'sonner';
// import { useNavigate } from 'react-router-dom';

// const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// // ─── Indicator Definitions ──────────────────────────────────────────────────────
// // All param keys match exactly what backtest.py reads from condition.params
// const INDICATORS = {
//   MA_CROSS: {
//     name: 'MA Crossover',
//     description: 'Fast MA crosses Slow MA — the classic trend signal',
//     defaultParams: { fast_period: 9, slow_period: 21, ma_type: 'EMA', source: 'Close' },
//     params: [
//       { key: 'fast_period', label: 'Fast Period', type: 'int',    min: 2,   max: 200, default: 9   },
//       { key: 'slow_period', label: 'Slow Period', type: 'int',    min: 3,   max: 500, default: 21  },
//       { key: 'ma_type',     label: 'MA Type',     type: 'select', options: ['SMA','EMA'], default: 'EMA' },
//       { key: 'source',      label: 'Source',      type: 'select', options: ['Close','Open','High','Low'], default: 'Close' },
//     ],
//     conditions: [
//       { value: 'crossover',       label: 'Fast crosses above Slow  (Golden Cross — Buy)' },
//       { value: 'crossunder',      label: 'Fast crosses below Slow  (Death Cross — Sell)' },
//       { value: 'fast_above_slow', label: 'Fast MA is above Slow MA' },
//       { value: 'fast_below_slow', label: 'Fast MA is below Slow MA' },
//     ],
//   },

//   MA: {
//     name: 'Price vs MA',
//     description: 'Price relationship to a single Moving Average',
//     defaultParams: { period: 20, ma_type: 'EMA', source: 'Close' },
//     params: [
//       { key: 'period',  label: 'Period',  type: 'int',    min: 2, max: 500, default: 20 },
//       { key: 'ma_type', label: 'MA Type', type: 'select', options: ['SMA','EMA'], default: 'EMA' },
//       { key: 'source',  label: 'Source',  type: 'select', options: ['Close','Open','High','Low'], default: 'Close' },
//     ],
//     conditions: [
//       { value: 'crossover',     label: 'Price crosses above MA  (Bullish crossover)' },
//       { value: 'crossunder',    label: 'Price crosses below MA  (Bearish crossunder)' },
//       { value: 'above',         label: 'Price is above MA' },
//       { value: 'below',         label: 'Price is below MA' },
//       { value: 'ma_slope_up',   label: 'MA is sloping upward' },
//       { value: 'ma_slope_down', label: 'MA is sloping downward' },
//     ],
//   },

//   RSI: {
//     name: 'RSI',
//     description: 'Relative Strength Index — momentum oscillator 0–100',
//     defaultParams: { period: 14, source: 'Close' },
//     params: [
//       { key: 'period', label: 'Period', type: 'int',    min: 2, max: 100, default: 14 },
//       { key: 'source', label: 'Source', type: 'select', options: ['Close','Open','High','Low'], default: 'Close' },
//     ],
//     conditions: [
//       { value: 'crossover',  label: 'RSI crosses above threshold  (momentum turning up)' },
//       { value: 'crossunder', label: 'RSI crosses below threshold  (momentum turning down)' },
//       { value: 'above',      label: 'RSI is above threshold' },
//       { value: 'below',      label: 'RSI is below threshold' },
//       { value: 'overbought', label: 'RSI Overbought  (> 70)' },
//       { value: 'oversold',   label: 'RSI Oversold  (< 30)' },
//     ],
//     needsValue: true,
//     valueLabel: 'Threshold',
//     valuePlaceholder: '30–70',
//     defaultValue: 50,
//   },

//   MACD: {
//     name: 'MACD',
//     description: 'Moving Average Convergence / Divergence',
//     defaultParams: { fast_period: 12, slow_period: 26, signal_period: 9, source: 'Close' },
//     params: [
//       { key: 'fast_period',   label: 'Fast',   type: 'int', min: 2,  max: 100, default: 12 },
//       { key: 'slow_period',   label: 'Slow',   type: 'int', min: 5,  max: 200, default: 26 },
//       { key: 'signal_period', label: 'Signal', type: 'int', min: 2,  max: 50,  default: 9  },
//       { key: 'source', label: 'Source', type: 'select', options: ['Close','Open',], default: 'Close' },
//     ],
//     conditions: [
//       { value: 'crossover',          label: 'MACD crosses above Signal  (Buy)' },
//       { value: 'crossunder',         label: 'MACD crosses below Signal  (Sell)' },
//       { value: 'above_signal',       label: 'MACD is above Signal line' },
//       { value: 'below_signal',       label: 'MACD is below Signal line' },
//       { value: 'above_zero',         label: 'MACD is above zero' },
//       { value: 'below_zero',         label: 'MACD is below zero' },
//       { value: 'histogram_positive', label: 'Histogram positive & growing' },
//       { value: 'histogram_negative', label: 'Histogram negative & falling' },
//     ],
//   },

//   Supertrend: {
//     name: 'Supertrend',
//     description: 'ATR-based trailing stop trend indicator',
//     defaultParams: { period: 10, multiplier: 3.0 },
//     params: [
//       { key: 'period',     label: 'ATR Period',     type: 'int',   min: 3,   max: 100, default: 10  },
//       { key: 'multiplier', label: 'ATR Multiplier', type: 'float', min: 0.5, max: 10,  step: 0.1, default: 3.0 },
//     ],
//     conditions: [
//       { value: 'crossover',  label: 'Price crosses above Supertrend  (switches Bullish — Buy)' },
//       { value: 'crossunder', label: 'Price crosses below Supertrend  (switches Bearish — Sell)' },
//       { value: 'bullish',    label: 'Supertrend is Bullish  (price above line)' },
//       { value: 'bearish',    label: 'Supertrend is Bearish  (price below line)' },
//     ],
//   },

//   VWAP: {
//     name: 'VWAP',
//     description: 'Volume Weighted Average Price — intraday fair value reference',
//     defaultParams: { std_dev_bands: false, std_dev: 1.0 },
//     params: [
//       { key: 'std_dev_bands', label: 'Std Dev Bands', type: 'bool',  default: false },
//       { key: 'std_dev',       label: 'Std Dev ×',     type: 'float', min: 0.5, max: 3, step: 0.1, default: 1.0 },
//     ],
//     conditions: [
//       { value: 'crossover',        label: 'Price crosses above VWAP  (Bullish)' },
//       { value: 'crossunder',       label: 'Price crosses below VWAP  (Bearish)' },
//       { value: 'above',            label: 'Price is above VWAP' },
//       { value: 'below',            label: 'Price is below VWAP' },
//       { value: 'above_upper_band', label: 'Price above VWAP Upper Band' },
//       { value: 'below_lower_band', label: 'Price below VWAP Lower Band' },
//     ],
//   },

//   Bollinger: {
//     name: 'Bollinger Bands',
//     description: 'Volatility bands ± N std deviations from SMA',
//     defaultParams: { period: 20, std_dev: 2.0, source: 'Close' },
//     params: [
//       { key: 'period',  label: 'Period',   type: 'int',   min: 5,   max: 200, default: 20  },
//       { key: 'std_dev', label: 'Std Dev ×', type: 'float', min: 0.5, max: 5,  step: 0.1, default: 2.0 },
//       { key: 'source',  label: 'Source',   type: 'select', options: ['Close','HL2','HLC3'], default: 'Close' },
//     ],
//     conditions: [
//       { value: 'breakout_upper',   label: 'Price crosses above Upper Band  (breakout)' },
//       { value: 'breakout_lower',   label: 'Price crosses below Lower Band  (breakdown)' },
//       { value: 'above_upper',      label: 'Price is above Upper Band' },
//       { value: 'below_lower',      label: 'Price is below Lower Band' },
//       { value: 'above_middle',     label: 'Price is above Middle Band (SMA)' },
//       { value: 'below_middle',     label: 'Price is below Middle Band (SMA)' },
//       { value: 'squeeze',          label: 'Bands in squeeze  (low volatility)' },
//       { value: 'squeeze_breakout', label: 'Squeeze breakout  (volatility expanding)' },
//     ],
//   },

//   Volume: {
//     name: 'Volume',
//     description: 'Volume relative to its moving average',
//     defaultParams: { period: 20, multiplier: 1.5 },
//     params: [
//       { key: 'period',     label: 'MA Period',        type: 'int',   min: 2,   max: 100, default: 20  },
//       { key: 'multiplier', label: 'Spike Multiplier', type: 'float', min: 1.0, max: 10,  step: 0.1, default: 1.5 },
//     ],
//     conditions: [
//       { value: 'above_avg',  label: 'Volume above average' },
//       { value: 'spike',      label: 'Volume spike  (above multiplier × avg)' },
//       { value: 'increasing', label: 'Volume increasing  (3 consecutive bars)' },
//       { value: 'decreasing', label: 'Volume decreasing  (3 consecutive bars)' },
//     ],
//   },
// };

// // yfinance-valid intervals only
// const TIMEFRAMES = [
//   { value: '1m',  label: '1 Minute',   note: 'max 7 days'   },
//   { value: '5m',  label: '5 Minutes',  note: 'max 60 days'  },
//   { value: '15m', label: '15 Minutes', note: 'max 60 days'  },
//   { value: '30m', label: '30 Minutes', note: 'max 60 days'  },
//   { value: '1h',  label: '1 Hour',     note: 'max 730 days' },
//   { value: '1d',  label: '1 Day',      note: 'unlimited'    },
//   { value: '1wk', label: '1 Week',     note: 'unlimited'    },
//   { value: '1mo', label: '1 Month',    note: 'unlimited'    },
// ];

// // ─── Param Input ────────────────────────────────────────────────────────────────
// const ParamInput = ({ param, value, onChange }) => {
//   if (param.type === 'select') {
//     return (
//       <Select value={String(value ?? param.default)} onValueChange={onChange}>
//         <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
//         <SelectContent>
//           {param.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
//         </SelectContent>
//       </Select>
//     );
//   }
//   if (param.type === 'bool') {
//     return (
//       <div className="flex items-center h-8 gap-2">
//         <Switch checked={!!value} onCheckedChange={onChange} />
//         <span className="text-xs text-muted-foreground">{value ? 'On' : 'Off'}</span>
//       </div>
//     );
//   }
//   return (
//     <Input
//       type="number"
//       className="h-8 text-sm"
//       step={param.step ?? (param.type === 'float' ? 0.1 : 1)}
//       min={param.min}
//       max={param.max}
//       value={value ?? param.default}
//       onChange={e => {
//         const v = param.type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value);
//         onChange(isNaN(v) ? param.default : v);
//       }}
//     />
//   );
// };

// // ─── Condition Row ──────────────────────────────────────────────────────────────
// const ConditionRow = ({ condition, index, onUpdate, onRemove }) => {
//   const [open, setOpen] = useState(true);
//   const def = INDICATORS[condition.indicator];

//   const changeIndicator = (key) => {
//     const d = INDICATORS[key];
//     onUpdate(condition.id, {
//       indicator: key,
//       params: { ...d.defaultParams },
//       condition: d.conditions[0].value,
//       value: d.needsValue ? (d.defaultValue ?? null) : null,
//     });
//   };

//   const changeParam = (key, val) =>
//     onUpdate(condition.id, { params: { ...condition.params, [key]: val } });

//   const showThreshold = def?.needsValue &&
//     !['overbought', 'oversold'].includes(condition.condition);

//   return (
//     <div className="border border-border rounded-xl overflow-hidden bg-card/50 hover:border-primary/30 transition-colors">
//       {/* Header row */}
//       <div className="flex items-center gap-2 p-3 bg-muted/20 flex-wrap">
//         <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
//           {index + 1}
//         </span>

//         <div className="flex-shrink-0 w-44">
//           <Select value={condition.indicator} onValueChange={changeIndicator}>
//             <SelectTrigger className="h-8 text-sm font-medium border-0 bg-transparent focus:ring-0 px-1">
//               <SelectValue />
//             </SelectTrigger>
//             <SelectContent>
//               {Object.entries(INDICATORS).map(([key, d]) => (
//                 <SelectItem key={key} value={key}>{d.name}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         <div className="flex-1 min-w-[220px]">
//           <Select value={condition.condition} onValueChange={v => onUpdate(condition.id, { condition: v })}>
//             <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
//             <SelectContent className="max-w-sm">
//               {def?.conditions.map(c => (
//                 <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         {showThreshold && (
//           <div className="flex-shrink-0 w-24">
//             <Input
//               type="number"
//               className="h-8 text-sm text-center"
//               placeholder={def?.valuePlaceholder || 'value'}
//               value={condition.value ?? ''}
//               onChange={e => onUpdate(condition.id, { value: parseFloat(e.target.value) || null })}
//             />
//           </div>
//         )}

//         <button onClick={() => setOpen(o => !o)} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
//           {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
//         </button>
//         <button onClick={() => onRemove(condition.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
//           <Trash2 className="w-4 h-4" />
//         </button>
//       </div>

//       {/* Params panel */}
//       {open && def?.params?.length > 0 && (
//         <div className="px-4 pb-4 pt-3 bg-muted/5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
//           <p className="col-span-full text-xs text-muted-foreground font-medium uppercase tracking-wider">
//             {def.description}
//           </p>
//           {def.params.map(param => (
//             <div key={param.key} className="space-y-1">
//               <Label className="text-xs text-muted-foreground">{param.label}</Label>
//               <ParamInput
//                 param={param}
//                 value={condition.params[param.key]}
//                 onChange={v => changeParam(param.key, v)}
//               />
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// // ─── Condition Block (Entry / Exit) ─────────────────────────────────────────────
// const ConditionBlock = ({ type, title, icon: Icon, rules, onUpdate }) => {
//   const isEntry = type === 'entry_rules';

//   const addCondition = () => {
//     const key = 'MA_CROSS';
//     const def = INDICATORS[key];
//     onUpdate(type, {
//       conditions: [...rules.conditions, {
//         id: `${Date.now()}-${Math.random()}`,
//         indicator: key,
//         params: { ...def.defaultParams },
//         condition: def.conditions[0].value,
//         value: null,
//       }],
//     });
//   };

//   const removeCondition = id =>
//     onUpdate(type, { conditions: rules.conditions.filter(c => c.id !== id) });

//   const updateCondition = (id, changes) =>
//     onUpdate(type, { conditions: rules.conditions.map(c => c.id === id ? { ...c, ...changes } : c) });

//   return (
//     <Card className="border-border">
//       <CardHeader className="pb-3">
//         <div className="flex items-center justify-between flex-wrap gap-2">
//           <div className="flex items-center gap-3">
//             <div className={`p-2 rounded-lg ${isEntry ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
//               <Icon className={`w-4 h-4 ${isEntry ? 'text-emerald-400' : 'text-red-400'}`} />
//             </div>
//             <div>
//               <CardTitle className="text-base">{title}</CardTitle>
//               <CardDescription className="text-xs">
//                 {rules.conditions.length} condition{rules.conditions.length !== 1 ? 's' : ''}
//                 {rules.conditions.length > 1 && ` — matched with ${rules.logic}`}
//               </CardDescription>
//             </div>
//           </div>
//           <div className="flex items-center gap-2">
//             {rules.conditions.length > 1 && (
//               <div className="flex bg-muted/40 rounded-lg p-1 gap-1">
//                 {['AND', 'OR'].map(l => (
//                   <button key={l}
//                     onClick={() => onUpdate(type, { logic: l })}
//                     className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
//                       rules.logic === l
//                         ? 'bg-primary text-primary-foreground shadow'
//                         : 'text-muted-foreground hover:text-foreground'
//                     }`}
//                   >{l}</button>
//                 ))}
//               </div>
//             )}
//             <Button size="sm" onClick={addCondition} data-testid={`add-${type}-condition`}>
//               <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Condition
//             </Button>
//           </div>
//         </div>
//       </CardHeader>
//       <CardContent className="space-y-2">
//         {rules.conditions.length === 0 ? (
//           <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
//             <p className="text-muted-foreground text-sm mb-3">No conditions yet</p>
//             <Button variant="outline" size="sm" onClick={addCondition}>
//               <Plus className="w-3.5 h-3.5 mr-1.5" /> Add First Condition
//             </Button>
//           </div>
//         ) : (
//           rules.conditions.map((cond, idx) => (
//             <React.Fragment key={cond.id}>
//               <ConditionRow condition={cond} index={idx} onUpdate={updateCondition} onRemove={removeCondition} />
//               {idx < rules.conditions.length - 1 && (
//                 <div className="flex items-center gap-2 px-3">
//                   <div className="h-px flex-1 bg-border/50" />
//                   <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
//                     rules.logic === 'AND'
//                       ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
//                       : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
//                   }`}>{rules.logic}</span>
//                   <div className="h-px flex-1 bg-border/50" />
//                 </div>
//               )}
//             </React.Fragment>
//           ))
//         )}
//       </CardContent>
//     </Card>
//   );
// };

// // ─── Main StrategyBuilder ────────────────────────────────────────────────────────
// const StrategyBuilder = () => {
//   const navigate = useNavigate();
//   const [stocks, setStocks] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [selectedStock, setSelectedStock] = useState('');

//   const [strategy, setStrategy] = useState({
//     name: '',
//     description: '',
//     stocks: [],
//     timeframe: '1d',
//     start_date: '2022-01-01',
//     end_date: new Date().toISOString().split('T')[0],
//     initial_capital: 100000,
//     strategy_type: 'long_only',
//     position_sizing: 'percent',
//     position_size_value: 10,
//     entry_rules: { conditions: [], logic: 'AND' },
//     exit_rules:  { conditions: [], logic: 'OR'  },
//     stop_loss_pct: null,
//     take_profit_pct: null,
//     stop_loss_atr_multiplier: null,
//     take_profit_atr_multiplier: null,
//     trailing_stop: false,
//     trailing_stop_pct: null,
//     max_open_trades: 1,
//     slippage_percent: 0.05,
//   });

//   useEffect(() => { fetchStocks(); }, []);

//   const fetchStocks = async () => {
//     try {
//       const res = await axios.get(`${API}/stocks/popular`);
//       setStocks(res.data);
//     } catch { /* silent */ }
//   };

//   const set = (key, val) => setStrategy(s => ({ ...s, [key]: val }));
//   const updateRules = (type, changes) =>
//     setStrategy(prev => ({ ...prev, [type]: { ...prev[type], ...changes } }));

//   const validate = (needsExit = true) => {
//     if (!strategy.name.trim()) { toast.error('Strategy name is required'); return false; }
//     if (!strategy.stocks.length) { toast.error('Select a stock symbol'); return false; }
//     if (!strategy.entry_rules.conditions.length) { toast.error('Add at least one entry condition'); return false; }
//     if (needsExit && !strategy.exit_rules.conditions.length) { toast.error('Add at least one exit condition'); return false; }
//     return true;
//   };

//   const handleSave = async () => {
//     if (!validate(false)) return;
//     try {
//       await axios.post(`${API}/strategies`, strategy);
//       toast.success('Strategy saved!');
//       navigate('/strategies');
//     } catch (e) {
//       toast.error('Save failed: ' + (e.response?.data?.detail || e.message));
//     }
//   };

//   const handleBacktest = async () => {
//     if (!validate(true)) return;
//     try {
//       setLoading(true);
//       const toastId = toast.loading('Running backtest…');
//       const res = await axios.post(`${API}/backtest`, strategy);
//       toast.dismiss(toastId);
//       toast.success('Backtest complete!');
//       navigate('/results', { state: { result: res.data } });
//     } catch (e) {
//       toast.error('Backtest failed: ' + (e.response?.data?.detail || e.message));
//     } finally {
//       setLoading(false);
//     }
//   };

//   const selectedTF = TIMEFRAMES.find(t => t.value === strategy.timeframe);

//   return (
//     <TooltipProvider>
//       <div className="space-y-6 pb-12" data-testid="strategy-builder">

//         {/* Header */}
//         <div className="flex items-start justify-between flex-wrap gap-3">
//           <div>
//             <h1 className="text-3xl font-bold font-['Rajdhani'] tracking-tight">Strategy Builder</h1>
//             <p className="text-muted-foreground text-sm mt-0.5">
//               Configure entry &amp; exit conditions, risk management, then run a backtest
//             </p>
//           </div>
//           <div className="flex gap-2">
//             <Button variant="outline" onClick={handleSave} data-testid="save-strategy-btn">
//               <Save className="w-4 h-4 mr-2" /> Save
//             </Button>
//             <Button onClick={handleBacktest} disabled={loading} data-testid="run-backtest-btn">
//               <Play className="w-4 h-4 mr-2" />
//               {loading ? 'Running…' : 'Run Backtest'}
//             </Button>
//           </div>
//         </div>

//         {/* Strategy Configuration */}
//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center gap-2 text-base">
//               <Settings2 className="w-4 h-4 text-muted-foreground" /> Strategy Configuration
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

//               <div className="space-y-1.5">
//                 <Label>Strategy Name *</Label>
//                 <Input placeholder="e.g. EMA Cross + RSI Filter"
//                   value={strategy.name} onChange={e => set('name', e.target.value)}
//                   data-testid="strategy-name-input" />
//               </div>

//               <div className="space-y-1.5">
//                 <Label>Description</Label>
//                 <Input placeholder="Optional"
//                   value={strategy.description} onChange={e => set('description', e.target.value)} />
//               </div>

//               <div className="space-y-1.5">
//                 <Label>Stock Symbol *</Label>
//                 <Select value={selectedStock} onValueChange={v => { setSelectedStock(v); set('stocks', [v]); }}>
//                   <SelectTrigger data-testid="stock-select"><SelectValue placeholder="Select stock" /></SelectTrigger>
//                   <SelectContent>
//                     {stocks.map(s => (
//                       <SelectItem key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div className="space-y-1.5">
//                 <div className="flex items-center gap-2">
//                   <Label>Timeframe</Label>
//                   {selectedTF?.note && (
//                     <span className="text-xs text-amber-500/80">({selectedTF.note})</span>
//                   )}
//                 </div>
//                 <Select value={strategy.timeframe} onValueChange={v => set('timeframe', v)}>
//                   <SelectTrigger><SelectValue /></SelectTrigger>
//                   <SelectContent>
//                     {TIMEFRAMES.map(tf => (
//                       <SelectItem key={tf.value} value={tf.value}>
//                         {tf.label}
//                         <span className="ml-2 text-xs text-muted-foreground">— {tf.note}</span>
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div className="space-y-1.5">
//                 <Label>Start Date</Label>
//                 <Input type="date" value={strategy.start_date} onChange={e => set('start_date', e.target.value)} />
//               </div>

//               <div className="space-y-1.5">
//                 <Label>End Date</Label>
//                 <Input type="date" value={strategy.end_date} onChange={e => set('end_date', e.target.value)} />
//               </div>

//               <div className="space-y-1.5">
//                 <Label>Initial Capital (₹)</Label>
//                 <Input type="number" value={strategy.initial_capital}
//                   onChange={e => set('initial_capital', parseFloat(e.target.value) || 0)} />
//               </div>

//               <div className="space-y-1.5">
//                 <Label>Strategy Type</Label>
//                 <Select value={strategy.strategy_type} onValueChange={v => set('strategy_type', v)}>
//                   <SelectTrigger><SelectValue /></SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="long_only">Long Only</SelectItem>
//                     <SelectItem value="short_only">Long &amp; Short</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div className="space-y-1.5">
//                 <Label>Position Sizing</Label>
//                 <Select value={strategy.position_sizing} onValueChange={v => set('position_sizing', v)}>
//                   <SelectTrigger><SelectValue /></SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="percent">% of Capital per trade</SelectItem>
//                     <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
//                     <SelectItem value="atr_risk">ATR Risk-Based</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div className="space-y-1.5">
//                 <Label>
//                   {strategy.position_sizing === 'percent' ? 'Position Size (%)' :
//                    strategy.position_sizing === 'fixed'   ? 'Fixed Amount (₹)' : 'Risk per Trade (₹)'}
//                 </Label>
//                 <Input type="number" value={strategy.position_size_value}
//                   onChange={e => set('position_size_value', parseFloat(e.target.value) || 0)} />
//               </div>

//               <div className="space-y-1.5">
//                 <Label>Max Open Trades</Label>
//                 <Input type="number" min={1} max={10} value={strategy.max_open_trades}
//                   onChange={e => set('max_open_trades', parseInt(e.target.value) || 1)} />
//               </div>

//               <div className="space-y-1.5">
//                 <Label>slippage (%)</Label>
//                 <Input type="number" step="0.01" min={0} max={2} value={strategy.slippage_percent}
//                   onChange={e => set('slippage_percent', parseFloat(e.target.value) || 0)} />
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Risk Management */}
//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center gap-2 text-base">
//               <Shield className="w-4 h-4 text-muted-foreground" /> Risk Management
//             </CardTitle>
//             <CardDescription>
//               Fires in addition to exit conditions — first trigger wins
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

//               <div className="space-y-1.5">
//                 <div className="flex items-center gap-1.5">
//                   <Label>Stop Loss (%)</Label>
//                   <Tooltip>
//                     <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
//                     <TooltipContent>Exit if price falls X% below entry. e.g. 2 = −2%</TooltipContent>
//                   </Tooltip>
//                 </div>
//                 <Input type="number" step="0.1" min={0.1} max={50} placeholder="e.g. 2.0 (optional)"
//                   value={strategy.stop_loss_pct ?? ''}
//                   onChange={e => set('stop_loss_pct', e.target.value ? parseFloat(e.target.value) : null)} />
//               </div>

//               <div className="space-y-1.5">
//                 <div className="flex items-center gap-1.5">
//                   <Label>Take Profit (%)</Label>
//                   <Tooltip>
//                     <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
//                     <TooltipContent>Exit when price rises X% above entry. e.g. 5 = +5%</TooltipContent>
//                   </Tooltip>
//                 </div>
//                 <Input type="number" step="0.1" min={0.1} max={200} placeholder="e.g. 5.0 (optional)"
//                   value={strategy.take_profit_pct ?? ''}
//                   onChange={e => set('take_profit_pct', e.target.value ? parseFloat(e.target.value) : null)} />
//               </div>

//               <div className="space-y-1.5">
//                 <div className="flex items-center gap-1.5">
//                   <Label>Stop Loss (ATR ×)</Label>
//                   <Tooltip>
//                     <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
//                     <TooltipContent>Dynamic stop: entry − multiplier × ATR(14)</TooltipContent>
//                   </Tooltip>
//                 </div>
//                 <Input type="number" step="0.1" min={0.5} max={10} placeholder="e.g. 2.0 (optional)"
//                   value={strategy.stop_loss_atr_multiplier ?? ''}
//                   onChange={e => set('stop_loss_atr_multiplier', e.target.value ? parseFloat(e.target.value) : null)} />
//               </div>

//               <div className="space-y-1.5">
//                 <div className="flex items-center gap-1.5">
//                   <Label>Take Profit (ATR ×)</Label>
//                   <Tooltip>
//                     <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
//                     <TooltipContent>Target: entry + multiplier × ATR(14)</TooltipContent>
//                   </Tooltip>
//                 </div>
//                 <Input type="number" step="0.1" min={0.5} max={20} placeholder="e.g. 3.0 (optional)"
//                   value={strategy.take_profit_atr_multiplier ?? ''}
//                   onChange={e => set('take_profit_atr_multiplier', e.target.value ? parseFloat(e.target.value) : null)} />
//               </div>

//               <div className="space-y-1.5 md:col-span-2">
//                 <Label>Trailing Stop</Label>
//                 <div className="flex items-center h-9 gap-3">
//                   <Switch checked={!!strategy.trailing_stop} onCheckedChange={v => set('trailing_stop', v)} />
//                   <span className="text-sm text-muted-foreground">
//                     {strategy.trailing_stop ? 'Enabled — trails highest price reached' : 'Disabled'}
//                   </span>
//                 </div>
//               </div>

//               {strategy.trailing_stop && (
//                 <div className="space-y-1.5">
//                   <div className="flex items-center gap-1.5">
//                     <Label>Trail Distance (%)</Label>
//                     <Tooltip>
//                       <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
//                       <TooltipContent>Exit when price drops X% from the highest close since entry</TooltipContent>
//                     </Tooltip>
//                   </div>
//                   <Input type="number" step="0.1" min={0.1} max={50} placeholder="e.g. 3.0"
//                     value={strategy.trailing_stop_pct ?? ''}
//                     onChange={e => set('trailing_stop_pct', e.target.value ? parseFloat(e.target.value) : null)} />
//                 </div>
//               )}
//             </div>
//           </CardContent>
//         </Card>

//         {/* Entry Rules */}
//         <ConditionBlock type="entry_rules" title="Entry Conditions" icon={TrendingUp}
//           rules={strategy.entry_rules} onUpdate={updateRules} />

//         {/* Exit Rules */}
//         <ConditionBlock type="exit_rules" title="Exit Conditions" icon={Zap}
//           rules={strategy.exit_rules} onUpdate={updateRules} />

//         {/* Footer */}
//         <div className="flex items-center justify-between pt-2 border-t border-border flex-wrap gap-3">
//           <div className="flex items-center gap-2 text-sm text-muted-foreground">
//             <AlertCircle className="w-4 h-4" />
//             <span>
//               {strategy.entry_rules.conditions.length} entry · {strategy.exit_rules.conditions.length} exit condition
//               {strategy.exit_rules.conditions.length !== 1 ? 's' : ''}
//             </span>
//           </div>
//           <div className="flex gap-2">
//             <Button variant="outline" onClick={handleSave} data-testid="save-strategy-btn-bottom">
//               <Save className="w-4 h-4 mr-2" /> Save Strategy
//             </Button>
//             <Button onClick={handleBacktest} disabled={loading} size="lg" data-testid="run-backtest-btn-bottom">
//               <Play className="w-4 h-4 mr-2" />
//               {loading ? 'Running Backtest…' : 'Run Backtest'}
//             </Button>
//           </div>
//         </div>

//       </div>
//     </TooltipProvider>
//   );
// };

// export default StrategyBuilder;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Plus, Trash2, Play, Save, ChevronDown, ChevronUp,
  Info, Zap, TrendingUp, Shield, Settings2, AlertCircle,
  TrendingDownIcon,LogOut,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ─── Indicator Definitions ────────────────────────────────────────────────────
const INDICATORS = {
  MA_CROSS: {
    name: 'MA Crossover',
    description: 'Fast MA crosses Slow MA — the classic trend signal',
    defaultParams: { fast_period: 9, slow_period: 21, ma_type: 'EMA', source: 'Close' },
    params: [
      { key: 'fast_period', label: 'Fast Period', type: 'int',    min: 2,   max: 200, default: 9   },
      { key: 'slow_period', label: 'Slow Period', type: 'int',    min: 3,   max: 500, default: 21  },
      { key: 'ma_type',     label: 'MA Type',     type: 'select', options: ['SMA','EMA'], default: 'EMA' },
      { key: 'source',      label: 'Source',      type: 'select', options: ['Close','Open','High','Low'], default: 'Close' },
    ],
    conditions: [
      { value: 'crossover',       label: 'Fast crosses above Slow  (Golden Cross — Buy)' },
      { value: 'crossunder',      label: 'Fast crosses below Slow  (Death Cross — Sell)' },
      { value: 'fast_above_slow', label: 'Fast MA is above Slow MA' },
      { value: 'fast_below_slow', label: 'Fast MA is below Slow MA' },
    ],
  },
  Breakout:{
    name: 'Breakout',
    description: 'Price breaks above resistance or below support level for timeframe`',
    defaultParams: { period: 20, source: 'Close'},
    params: [
      { key: 'period', label: 'Lookback Period', type: 'int', min: 2, max: 200, default: 20 },
      { key: 'source', label: 'Source', type: 'select', options: ['Close','Open','High','Low'], default: 'Close' },
    ],
    conditions: [
      { value: 'breakout_upper', label: 'Price is above recent high' },
      { value: 'breakout_lower',    label: 'Price is below recent low' },
    ],

  },

  MA: {
    name: 'Price vs MA',
    description: 'Price relationship to a single Moving Average',
    defaultParams: { period: 20, ma_type: 'EMA', source: 'Close' },
    params: [
      { key: 'period',  label: 'Period',  type: 'int',    min: 2, max: 500, default: 20 },
      { key: 'ma_type', label: 'MA Type', type: 'select', options: ['SMA','EMA'], default: 'EMA' },
      { key: 'source',  label: 'Source',  type: 'select', options: ['Close','Open','High','Low'], default: 'Close' },
    ],
    conditions: [
      { value: 'crossover',     label: 'Price crosses above MA  (Bullish crossover)' },
      { value: 'crossunder',    label: 'Price crosses below MA  (Bearish crossunder)' },
      { value: 'above',         label: 'Price is above MA' },
      { value: 'below',         label: 'Price is below MA' },
      { value: 'ma_slope_up',   label: 'MA is sloping upward' },
      { value: 'ma_slope_down', label: 'MA is sloping downward' },
    ],
  },

  RSI: {
    name: 'RSI',
    description: 'Relative Strength Index — momentum oscillator 0–100',
    defaultParams: { period: 14, source: 'Close' },
    params: [
      { key: 'period', label: 'Period', type: 'int',    min: 2, max: 100, default: 14 },
      { key: 'source', label: 'Source', type: 'select', options: ['Close','Open','High','Low'], default: 'Close' },
    ],
    conditions: [
      { value: 'crossover',  label: 'RSI crosses above threshold  (momentum turning up)' },
      { value: 'crossunder', label: 'RSI crosses below threshold  (momentum turning down)' },
      { value: 'above',      label: 'RSI is above threshold' },
      { value: 'below',      label: 'RSI is below threshold' },
      { value: 'overbought', label: 'RSI Overbought  (> 70)' },
      { value: 'oversold',   label: 'RSI Oversold  (< 30)' },
    ],
    needsValue: true,
    valueLabel: 'Threshold',
    valuePlaceholder: '30–70',
    defaultValue: 50,
  },

  MACD: {
    name: 'MACD',
    description: 'Moving Average Convergence / Divergence',
    defaultParams: { fast_period: 12, slow_period: 26, signal_period: 9, source: 'Close' },
    params: [
      { key: 'fast_period',   label: 'Fast',   type: 'int', min: 2,  max: 100, default: 12 },
      { key: 'slow_period',   label: 'Slow',   type: 'int', min: 5,  max: 200, default: 26 },
      { key: 'signal_period', label: 'Signal', type: 'int', min: 2,  max: 50,  default: 9  },
      { key: 'source', label: 'Source', type: 'select', options: ['Close','Open'], default: 'Close' },
    ],
    conditions: [
      { value: 'crossover',          label: 'MACD crosses above Signal  (Buy)' },
      { value: 'crossunder',         label: 'MACD crosses below Signal  (Sell)' },
      { value: 'above_signal',       label: 'MACD is above Signal line' },
      { value: 'below_signal',       label: 'MACD is below Signal line' },
      { value: 'above_zero',         label: 'MACD is above zero' },
      { value: 'below_zero',         label: 'MACD is below zero' },
      { value: 'histogram_positive', label: 'Histogram positive & growing' },
      { value: 'histogram_negative', label: 'Histogram negative & falling' },
    ],
  },

  Supertrend: {
    name: 'Supertrend',
    description: 'ATR-based trailing stop trend indicator',
    defaultParams: { period: 10, multiplier: 3.0 },
    params: [
      { key: 'period',     label: 'ATR Period',     type: 'int',   min: 3,   max: 100, default: 10  },
      { key: 'multiplier', label: 'ATR Multiplier', type: 'float', min: 0.5, max: 10,  step: 0.1, default: 3.0 },
    ],
    conditions: [
      { value: 'crossover',  label: 'Price crosses above Supertrend  (switches Bullish — Buy)' },
      { value: 'crossunder', label: 'Price crosses below Supertrend  (switches Bearish — Sell)' },
      { value: 'bullish',    label: 'Supertrend is Bullish  (price above line)' },
      { value: 'bearish',    label: 'Supertrend is Bearish  (price below line)' },
    ],
  },

  VWAP: {
    name: 'VWAP',
    description: 'Volume Weighted Average Price — intraday fair value reference',
    defaultParams: { std_dev_bands: false, std_dev: 1.0 },
    params: [
      { key: 'std_dev_bands', label: 'Std Dev Bands', type: 'bool',  default: false },
      { key: 'std_dev',       label: 'Std Dev ×',     type: 'float', min: 0.5, max: 3, step: 0.1, default: 1.0 },
    ],
    conditions: [
      { value: 'crossover',        label: 'Price crosses above VWAP  (Bullish)' },
      { value: 'crossunder',       label: 'Price crosses below VWAP  (Bearish)' },
      { value: 'above',            label: 'Price is above VWAP' },
      { value: 'below',            label: 'Price is below VWAP' },
      { value: 'above_upper_band', label: 'Price above VWAP Upper Band' },
      { value: 'below_lower_band', label: 'Price below VWAP Lower Band' },
    ],
  },

  Bollinger: {
    name: 'Bollinger Bands',
    description: 'Volatility bands ± N std deviations from SMA',
    defaultParams: { period: 20, std_dev: 2.0, source: 'Close' },
    params: [
      { key: 'period',  label: 'Period',    type: 'int',   min: 5,   max: 200, default: 20  },
      { key: 'std_dev', label: 'Std Dev ×', type: 'float', min: 0.5, max: 5,   step: 0.1, default: 2.0 },
      { key: 'source',  label: 'Source',    type: 'select', options: ['Close','HL2','HLC3'], default: 'Close' },
    ],
    conditions: [
      { value: 'breakout_upper',   label: 'Price crosses above Upper Band  (breakout)' },
      { value: 'breakout_lower',   label: 'Price crosses below Lower Band  (breakdown)' },
      { value: 'above_upper',      label: 'Price is above Upper Band' },
      { value: 'below_lower',      label: 'Price is below Lower Band' },
      { value: 'above_middle',     label: 'Price is above Middle Band (SMA)' },
      { value: 'below_middle',     label: 'Price is below Middle Band (SMA)' },
      { value: 'squeeze',          label: 'Bands in squeeze  (low volatility)' },
      { value: 'squeeze_breakout', label: 'Squeeze breakout  (volatility expanding)' },
    ],
  },

  Volume: {
    name: 'Volume',
    description: 'Volume relative to its moving average',
    defaultParams: { period: 20, multiplier: 1.5 },
    params: [
      { key: 'period',     label: 'MA Period',        type: 'int',   min: 2,   max: 100, default: 20  },
      { key: 'multiplier', label: 'Spike Multiplier', type: 'float', min: 1.0, max: 10,  step: 0.1, default: 1.5 },
    ],
    conditions: [
      { value: 'above_avg',  label: 'Volume above average' },
      { value: 'spike',      label: 'Volume spike  (above multiplier × avg)' },
      { value: 'increasing', label: 'Volume increasing  (3 consecutive bars)' },
      { value: 'decreasing', label: 'Volume decreasing  (3 consecutive bars)' },
    ],
  },
};

const TIMEFRAMES = [
  { value: '1m',  label: '1 Minute',   note: 'max 7 days'   },
  { value: '5m',  label: '5 Minutes',  note: 'max 60 days'  },
  { value: '15m', label: '15 Minutes', note: 'max 60 days'  },
  { value: '30m', label: '30 Minutes', note: 'max 60 days'  },
  { value: '1h',  label: '1 Hour',     note: 'max 730 days' },
  { value: '1d',  label: '1 Day',      note: 'unlimited'    },
  { value: '1wk', label: '1 Week',     note: 'unlimited'    },
  { value: '1mo', label: '1 Month',    note: 'unlimited'    },
];

// ─── Param Input ──────────────────────────────────────────────────────────────
// FIX: use explicit null/undefined check instead of ?? to avoid falsy 0 snapping back to default
const ParamInput = ({ param, value, onChange }) => {
  const displayValue = (value !== undefined && value !== null) ? value : param.default;

  if (param.type === 'select') {
    return (
      <Select value={String(displayValue)} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          {param.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }

  if (param.type === 'bool') {
    return (
      <div className="flex items-center h-8 gap-2">
        <Switch checked={!!displayValue} onCheckedChange={onChange} />
        <span className="text-xs text-muted-foreground">{displayValue ? 'On' : 'Off'}</span>
      </div>
    );
  }

  return (
    <Input
      type="number"
      className="h-8 text-sm"
      step={param.step ?? (param.type === 'float' ? 0.1 : 1)}
      min={param.min}
      max={param.max}
      value={displayValue}
      onChange={e => {
        const raw = param.type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
        onChange(isNaN(raw) ? param.default : raw);
      }}
    />
  );
};

// ─── Condition Row ────────────────────────────────────────────────────────────
const ConditionRow = ({ condition, index, onUpdate, onRemove }) => {
  const [open, setOpen] = useState(true);
  const def = INDICATORS[condition.indicator];

  const changeIndicator = (key) => {
    const d = INDICATORS[key];
    onUpdate(condition.id, {
      indicator: key,
      // FIX: always reset to fresh defaultParams when switching indicator
      // so stale keys from the previous indicator don't bleed through
      params: { ...d.defaultParams },
      condition: d.conditions[0].value,
      value: d.needsValue ? (d.defaultValue ?? null) : null,
    });
  };

  const changeParam = (key, val) =>
    onUpdate(condition.id, { params: { ...condition.params, [key]: val } });

  const showThreshold = def?.needsValue &&
    !['overbought', 'oversold'].includes(condition.condition);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card/50 hover:border-primary/30 transition-colors">
      {/* Header row */}
      <div className="flex items-center gap-2 p-3 bg-muted/20 flex-wrap">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
          {index + 1}
        </span>

        <div className="flex-shrink-0 w-44">
          <Select value={condition.indicator} onValueChange={changeIndicator}>
            <SelectTrigger className="h-8 text-sm font-medium border-0 bg-transparent focus:ring-0 px-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INDICATORS).map(([key, d]) => (
                <SelectItem key={key} value={key}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[220px]">
          <Select value={condition.condition} onValueChange={v => onUpdate(condition.id, { condition: v })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="max-w-sm">
              {def?.conditions.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showThreshold && (
          <div className="flex-shrink-0 w-24">
            <Input
              type="number"
              className="h-8 text-sm text-center"
              placeholder={def?.valuePlaceholder || 'value'}
              value={condition.value ?? ''}
              onChange={e => {
                const v = parseFloat(e.target.value);
                onUpdate(condition.id, { value: isNaN(v) ? null : v });
              }}
            />
          </div>
        )}

        <button onClick={() => setOpen(o => !o)} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button onClick={() => onRemove(condition.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Params panel */}
      {open && def?.params?.length > 0 && (
        <div className="px-4 pb-4 pt-3 bg-muted/5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <p className="col-span-full text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {def.description}
          </p>
          {def.params.map(param => (
            <div key={param.key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{param.label}</Label>
              <ParamInput
                param={param}
                value={condition.params[param.key]}
                onChange={v => changeParam(param.key, v)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Condition Block (Entry / Exit) ──────────────────────────────────────────
const ConditionBlock = ({ type, title, icon: Icon, rules, onUpdate }) => {
  const isEntry = type === 'entry_rules';

  const addCondition = () => {
    const key = 'MA_CROSS';
    const def = INDICATORS[key];
    onUpdate(type, {
      conditions: [...rules.conditions, {
        id: `${Date.now()}-${Math.random()}`,
        indicator: key,
        params: { ...def.defaultParams },
        condition: def.conditions[0].value,
        value: null,
      }],
    });
  };

  const removeCondition = id =>
    onUpdate(type, { conditions: rules.conditions.filter(c => c.id !== id) });

  const updateCondition = (id, changes) =>
    onUpdate(type, {
      conditions: rules.conditions.map(c =>
        c.id === id ? { ...c, ...changes, params: changes.params ?? c.params } : c
      ),
    });

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isEntry ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <Icon className={`w-4 h-4 ${isEntry ? 'text-emerald-400' : 'text-red-400'}`} />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-xs">
                {rules.conditions.length} condition{rules.conditions.length !== 1 ? 's' : ''}
                {rules.conditions.length > 1 && ` — matched with ${rules.logic}`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {rules.conditions.length > 1 && (
              <div className="flex bg-muted/40 rounded-lg p-1 gap-1">
                {['AND', 'OR'].map(l => (
                  <button key={l}
                    onClick={() => onUpdate(type, { logic: l })}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      rules.logic === l
                        ? 'bg-primary text-primary-foreground shadow'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >{l}</button>
                ))}
              </div>
            )}
            <Button size="sm" onClick={addCondition} data-testid={`add-${type}-condition`}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Condition
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {rules.conditions.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
            <p className="text-muted-foreground text-sm mb-3">No conditions yet</p>
            <Button variant="outline" size="sm" onClick={addCondition}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add First Condition
            </Button>
          </div>
        ) : (
          rules.conditions.map((cond, idx) => (
            <React.Fragment key={cond.id}>
              <ConditionRow
                condition={cond}
                index={idx}
                onUpdate={updateCondition}
                onRemove={removeCondition}
              />
              {idx < rules.conditions.length - 1 && (
                <div className="flex items-center gap-2 px-3">
                  <div className="h-px flex-1 bg-border/50" />
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                    rules.logic === 'AND'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>{rules.logic}</span>
                  <div className="h-px flex-1 bg-border/50" />
                </div>
              )}
            </React.Fragment>
          ))
        )}
      </CardContent>
    </Card>
  );
};

// ─── Main StrategyBuilder ─────────────────────────────────────────────────────
const StrategyBuilder = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeframe,setTimeframe] =useState("1d");


const [search, setSearch]               = useState("");


  // FIX: separate state for custom symbol input
  const location = useLocation();                              // ← ADD
  const existing = location.state?.strategy ?? null; 
  const [selectedStock, setSelectedStock] = useState(
    existing?.stocks?.[0] ?? ''                               // ← CHANGED
  );         // ← ADD
  const [customSymbol, setCustomSymbol] = useState('');

  const [strategy, setStrategy] = useState({
    name:                       existing?.name                       ?? '',
    description:                existing?.description                ?? '',
    stocks:                     existing?.stocks                     ?? [],
    timeframe:                  existing?.timeframe                  ?? '1d',
    start_date:                 existing?.start_date                 ?? '2022-01-01',
    end_date:                   existing?.end_date                   ?? new Date().toISOString().split('T')[0],
    initial_capital:            existing?.initial_capital            ?? 100000,
    strategy_type:              existing?.strategy_type              ?? 'long_only',
    position_sizing:            existing?.position_sizing            ?? 'percent',
    position_size_value:        existing?.position_size_value        ?? 10,
    entry_rules:                existing?.entry_rules                ?? { conditions: [], logic: 'AND' },
    exit_rules:                 existing?.exit_rules                 ?? { conditions: [], logic: 'OR'  },
    stop_loss_pct:              existing?.stop_loss_pct              ?? null,
    take_profit_pct:            existing?.take_profit_pct            ?? null,
    stop_loss_atr_multiplier:   existing?.stop_loss_atr_multiplier   ?? null,
    take_profit_atr_multiplier: existing?.take_profit_atr_multiplier ?? null,
    time_based_exit_bars:     existing?.time_based_exit_bars     ?? null,
    trailing_stop:              existing?.trailing_stop              ?? true,
    trailing_stop_pct:          existing?.trailing_stop_pct          ?? null,
    max_open_trades:            existing?.max_open_trades            ?? 1,
    slippage_percent:         existing?.slippage_percent         ?? 1,
    leverage:                    existing?.leverage                    ?? 1,
    mtf:                         existing?.mtf                         ?? false,
    breakdown_exit_pct:         existing?.breakdown_exit_pct         ?? null, 
    additional_exit_conditions : existing?.additional_exit_conditions ??  false,
  });

  useEffect(() => { fetchStocks(); }, []);

  const fetchStocks = async () => {
    try {
      const res = await axios.get(`${API}/stocks/popular`);
      setStocks(res.data);
    } catch { /* silent */ }
  };

  const set = (key, val) => setStrategy(s => ({ ...s, [key]: val }));

  const get = key => strategy[key];


  const updateRules = (type, changes) =>
    setStrategy(prev => ({ ...prev, [type]: { ...prev[type], ...changes } }));

  // FIX: apply custom symbol on blur/enter
  const applyCustomSymbol = () => {
    const v = customSymbol.trim().toUpperCase();
    if (v) {
      setSelectedStock(v);
      set('stocks', [v]);
    }
  };

  // FIX: full validation including date range check
  const validate = (needsExit = true) => {
    if (!strategy.name.trim()) {
      toast.error('Strategy name is required');
      return false;
    }
    if (!strategy.stocks.length || !strategy.stocks[0]) {
      toast.error('Select or enter a stock symbol');
      return false;
    }
    if (strategy.start_date >= strategy.end_date) {
      toast.error('Start date must be before end date');
      return false;
    }
    if (!strategy.entry_rules.conditions.length) {
      toast.error('Add at least one entry condition');
      return false;
    }
    if (needsExit && !strategy.exit_rules.conditions.length) {
      toast.error('Add at least one exit condition');
      return false;
    }
    // FIX: warn if no risk management at all (no exit conditions covered this case above,
    // but also no stop loss — soft warning only, not blocking)
    if (
      needsExit &&
      !strategy.stop_loss_pct &&
      !strategy.stop_loss_atr_multiplier &&
      !strategy.trailing_stop
    ) {
      toast.warning('No stop loss configured — consider adding one for risk management');
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate(false)) return;
    try {
      await axios.post(`${API}/strategies`, strategy);
      toast.success('Strategy saved!');
      navigate('/strategies');
    } catch (e) {
      toast.error('Save failed: ' + (e.response?.data?.detail || e.message));
    }
  };

  const handleBacktest = async () => {
    if (!validate(true)) return;
    try {
      setLoading(true);
      const toastId = toast.loading('Running backtest…');
      
      // Use Promise.all to ensure a minimum 3-second delay
      const [res] = await Promise.all([
        axios.post(`${API}/backtest`, strategy),
        new Promise(resolve => setTimeout(resolve, 3000))
      ]);

      toast.dismiss(toastId);
      toast.success('Backtest complete!');
      navigate('/results', { state: { result: res.data, strategyData: strategy } });
    } catch (e) {
      toast.error('Backtest failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  };

  const selectedTF = TIMEFRAMES.find(t => t.value === strategy.timeframe);

  // FIX: correct label for atr_risk position sizing
  const positionSizeLabel = {
    percent: 'Position Size (% of capital)',
    fixed:   'Fixed Amount (₹)',
    atr_risk: 'Risk Amount per Trade (₹)',
  }[strategy.position_sizing] || 'Position Size';
  const filteredStocks = [...new Map(stocks.map(s => [s.symbol, s])).values()]
  .filter(s =>
    s.symbol.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const positionSizeTooltip = {
    percent: 'e.g. 10 = use 10% of current equity per trade',
    fixed:   'Fixed rupee amount to invest per trade',
    atr_risk: 'Max rupees you are willing to risk per trade. Position size = risk ÷ (ATR × multiplier)',
  }[strategy.position_sizing];

  return (
    <TooltipProvider>
      <div className="space-y-6 pb-12" data-testid="strategy-builder">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold font-['Rajdhani'] tracking-tight">Strategy Builder</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Configure entry &amp; exit conditions, risk management, then run a backtest
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} data-testid="save-strategy-btn">
              <Save className="w-4 h-4 mr-2" /> Save
            </Button>
            <Button onClick={handleBacktest} disabled={loading} data-testid="run-backtest-btn">
              <Play className="w-4 h-4 mr-2" />
              {loading ? 'Running…' : 'Run Backtest'}
            </Button>
          </div>
        </div>

        {/* Strategy Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="w-4 h-4 text-muted-foreground" /> Strategy Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              <div className="space-y-1.5">
                <Label>Strategy Name *</Label>
                <Input
                  placeholder="e.g. EMA Cross + RSI Filter"
                  value={strategy.name}
                  onChange={e => set('name', e.target.value)}
                  data-testid="strategy-name-input"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  placeholder="Optional"
                  value={strategy.description}
                  onChange={e => set('description', e.target.value)}
                />
              </div>


              {/* FIX: stock selector with custom symbol fallback input */}
              <div className="space-y-1.5">
  <Label>Stock Symbol *</Label>

  <div className="relative w-full">
    <Input
      placeholder="Search stock (e.g. RELIANCE, TCS)…"
      value={search}
      onChange={(e) => setSearch(e.target.value.toUpperCase())}
      onKeyDown={(e) => {
        if (e.key === "Enter" && search.trim()) {
          const clean = search.replace(/\.NS$/, "").toUpperCase();
          set("stocks", [clean]);
          setSearch("");
        }
      }}
    />

    {/* 🔥 FLOATING DROPDOWN */}
    {search && filteredStocks.length > 0 && (
      <div className="absolute top-full left-0 w-full mt-1 border rounded-lg max-h-48 overflow-y-auto bg-background shadow-lg z-50">
        {filteredStocks.map((stock) => (
          <div
            key={stock.symbol}
            className="px-3 py-2 cursor-pointer hover:bg-muted flex justify-between"
            onClick={() => {
              const clean = stock.symbol.toUpperCase();
              console.log("Selected stock:", clean);
              set("stocks", [clean]);
              setSearch("");
            }}
          >
            <span>
              <span className="font-mono font-semibold">
                {stock.symbol.replace(/\.NS$/, "")}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                {stock.name}
              </span>
            </span>
          </div>
        ))}
      </div>
    )}
  </div>

  {/* Active */}
  {strategy.stocks?.[0] && (
    <p className="text-xs text-emerald-500">
      Active: <span className="font-bold">{strategy.stocks[0]}</span>
    </p>
  )}
</div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label>Timeframe</Label>
                  {selectedTF?.note && (
                    <span className="text-xs text-amber-500/80">({selectedTF.note})</span>
                  )}
                </div>
                <Select value={strategy.timeframe} onValueChange={v => set('timeframe', v)}>
                  
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEFRAMES.map(tf => (
                      <SelectItem key={tf.value} value={tf.value}>
                        {tf.label}
                        <span className="ml-2 text-xs text-muted-foreground">— {tf.note}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* FIX: start_date validated against end_date in validate() */}
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={strategy.start_date}
                  max={strategy.end_date}
                  onChange={e => set('start_date', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={strategy.end_date}
                  min={strategy.start_date}
                  onChange={e => set('end_date', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Initial Capital (₹)</Label>
                <Input
                  type="number"
                  min={1000}
                  value={strategy.initial_capital}
                  onChange={e => set('initial_capital', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Strategy Type</Label>
                <Select value={strategy.strategy_type} onValueChange={v => set('strategy_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long_only">Long Only</SelectItem>
                    <SelectItem value="short_only">Short Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Position Sizing</Label>
                <Select value={strategy.position_sizing} onValueChange={v => set('position_sizing', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">% of Capital per trade</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                    <SelectItem value="atr_risk">ATR Risk-Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* FIX: correct label + tooltip that matches backend behaviour */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label>{positionSizeLabel}</Label>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>{positionSizeTooltip}</TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={strategy.position_size_value}
                  onChange={e => set('position_size_value', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Max Open Trades</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={strategy.max_open_trades}
                  onChange={e => set('max_open_trades', parseInt(e.target.value, 10) || 1)}
                />
              </div>
              {/* MTF — Margin Trading Facility */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id="mtf-checkbox"
                    className="w-4 h-4 cursor-pointer accent-primary"
                    checked={strategy.mtf}
                    onChange={e => {
                      set('mtf', e.target.checked);
                      if (!e.target.checked) set('leverage', 1);
                    }}
                  />
                  <Label htmlFor="mtf-checkbox" className="cursor-pointer select-none">MTF</Label>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Margin Trading Facility — borrow capital from broker to increase your position size. Multiplies both gains and losses.</TooltipContent>
                  </Tooltip>
                </div>

                {strategy.mtf && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Leverage (×)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      step={1}
                      value={strategy.leverage}
                      onChange={e => set('leverage', Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                  </div>
                )}
              </div>

              {/* FIX: add max guard on slippage */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label>Slippage (%)</Label>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Applied on both entry and exit. 1% Includes comission also = 1 % per leg.</TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={2}
                  value={strategy.slippage_percent}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    set('slippage_percent', isNaN(v) ? 0 : Math.min(v, 2));
                  }}
                />
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Risk Management
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4 text-muted-foreground" /> Risk Management
            </CardTitle>
            <CardDescription>
              Fires in addition to exit conditions — first trigger wins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label>Stop Loss (%)</Label>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Exit if price falls X% below entry. e.g. 2 = −2%</TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="number"
                  step="0.1"
                  min={0.1}
                  max={50}
                  placeholder="e.g. 2.0 (optional)"
                  value={strategy.stop_loss_pct ?? ''}
                  onChange={e => set('stop_loss_pct', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label>Take Profit (%)</Label>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Exit when price rises X% above entry. e.g. 5 = +5%</TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="number"
                  step="0.1"
                  min={0.1}
                  max={200}
                  placeholder="e.g. 5.0 (optional)"
                  value={strategy.take_profit_pct ?? ''}
                  onChange={e => set('take_profit_pct', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label>Stop Loss (ATR ×)</Label>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Dynamic stop: entry − multiplier × ATR(14)</TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="number"
                  step="0.1"
                  min={0.5}
                  max={10}
                  placeholder="e.g. 2.0 (optional)"
                  value={strategy.stop_loss_atr_multiplier ?? ''}
                  onChange={e => set('stop_loss_atr_multiplier', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label>Take Profit (ATR ×)</Label>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Target: entry + multiplier × ATR(14)</TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="number"
                  step="0.1"
                  min={0.5}
                  max={20}
                  placeholder="e.g. 3.0 (optional)"
                  value={strategy.take_profit_atr_multiplier ?? ''}
                  onChange={e => set('take_profit_atr_multiplier', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
         */}
        {/* Entry Rules */}
    
        <ConditionBlock
          type="entry_rules"
          title="Entry Conditions"
          icon={TrendingUp}
          rules={strategy.entry_rules}
          onUpdate={updateRules}
        />
            <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 shadow-sm">
  <div className="text-blue-500 mt-0.5">
    ℹ️
  </div>

  <p className="text-sm text-blue-900 leading-relaxed">
    <span className="font-semibold">Note:</span> The periods below are based on your selected timeframe 
    <span className="font-semibold"> ({strategy.timeframe})</span>. 
    For example, if you choose a <span className="font-medium">1-day timeframe</span>, 
    a period of <span className="font-medium">14</span> means <span className="font-medium">14 days</span>.
  </p>
</div>

        {/* Exit Rules */}
        <ConditionBlock
          type="exit_rules"
          title="Exit Conditions"
          icon={Zap}
          rules={strategy.exit_rules}
          onUpdate={updateRules}
        />
      
            <div className="px-4 py-2 bg-muted/20 border-b border-border">
  <Switch
    checked={strategy.additional_exit_conditions}
    onCheckedChange={v => set('additional_exit_conditions', v)}
  />
  <span className="ml-2 text-sm">Additional Exit Conditions</span>
</div>

{strategy.additional_exit_conditions && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">
        <LogOut className="w-4 h-4" />
        Additional Exit Conditions
      </CardTitle>
      <CardDescription>
        Additional rules that trigger while a trade is open — evaluated alongside exit conditions
      </CardDescription>
    </CardHeader>

    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">

      <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Switch
              checked={strategy.trailing_stop_pct !== null}
              onCheckedChange={v =>
                set('trailing_stop_pct', v ? 3.0 : null)
              }
            />
            <Label className={!strategy.trailing_stop_pct ? "text-muted-foreground" : ""}>
              Trailing StopLoss(%)
            </Label>
          </div>

          <Input
            type="number"
            step="0.1"
            disabled={strategy.trailing_stop_pct === null}
            value={strategy.trailing_stop_pct ?? ''}
            onChange={e =>
              set(
                'trailing_stop_pct',
                e.target.value ? parseFloat(e.target.value) : null
              )
            }
          />
        </div>

        {/* STOP LOSS % */}
        {/* <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Switch
              checked={strategy.stop_loss_pct !== null}
              onCheckedChange={v =>
                set('stop_loss_pct', v ? 2.0 : null)
              }
            />
            <Label className={!strategy.stop_loss_pct ? "text-muted-foreground" : ""}>
              Stop Loss (%)
            </Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                Exit if price falls X% below entry
              </TooltipContent>
            </Tooltip>
          </div>

          <Input
            type="number"
            step="0.1"
            disabled={strategy.stop_loss_pct === null}
            value={strategy.stop_loss_pct ?? ''}
            onChange={e =>
              set(
                'stop_loss_pct',
                e.target.value ? parseFloat(e.target.value) : null
              )
            }
          />
        </div> */}

        {/* TARGET % */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Switch
              checked={strategy.take_profit_pct !== null}
              onCheckedChange={v =>
                set('take_profit_pct', v ? 5.0 : null)
              }
            />
            <Label className={!strategy.take_profit_pct ? "text-muted-foreground" : ""}>
              Target (%)
            </Label>
          </div>

          <Input
            type="number"
            step="0.1"
            disabled={strategy.take_profit_pct === null}
            value={strategy.take_profit_pct ?? ''}
            onChange={e =>
              set(
                'take_profit_pct',
                e.target.value ? parseFloat(e.target.value) : null
              )
            }
          />
        </div>

        {/* ATR STOP LOSS */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Switch
              checked={strategy.stop_loss_atr_multiplier !== null}
              onCheckedChange={v =>
                set('stop_loss_atr_multiplier', v ? 2.0 : null)
              }
            />
            <Label className={!strategy.stop_loss_atr_multiplier ? "text-muted-foreground" : ""}>
              Stop Loss (ATR ×)
            </Label>
          </div>

          <Input
            type="number"
            step="0.1"
            disabled={strategy.stop_loss_atr_multiplier === null}
            value={strategy.stop_loss_atr_multiplier ?? ''}
            onChange={e =>
              set(
                'stop_loss_atr_multiplier',
                e.target.value ? parseFloat(e.target.value) : null
              )
            }
          />
        </div>

        {/* ATR TARGET */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Switch
              checked={strategy.take_profit_atr_multiplier !== null}
              onCheckedChange={v =>
                set('take_profit_atr_multiplier', v ? 3.0 : null)
              }
            />
            <Label className={!strategy.take_profit_atr_multiplier ? "text-muted-foreground" : ""}>
              Target (ATR ×)
            </Label>
          </div>

          <Input
            type="number"
            step="0.1"
            disabled={strategy.take_profit_atr_multiplier === null}
            value={strategy.take_profit_atr_multiplier ?? ''}
            onChange={e =>
              set(
                'take_profit_atr_multiplier',
                e.target.value ? parseFloat(e.target.value) : null
              )
            }
          />
        </div>

        {/* TIME EXIT */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Switch
              checked={strategy.time_based_exit_bars !== null}
              onCheckedChange={v =>
                set('time_based_exit_bars', v ? 10 : null)
              }
            />
            <Label className={!strategy.time_based_exit_bars ? "text-muted-foreground" : ""}>
              Time-Based Exit Bars
            </Label>
          </div>

          <Input
            type="number"
            disabled={strategy.time_based_exit_bars === null}
            value={strategy.time_based_exit_bars ?? ''}
            onChange={e =>
              set(
                'time_based_exit_bars',
                e.target.value ? parseInt(e.target.value, 10) : null
              )
            }
          />
        </div>

        {/* TRAILING STOP */}
       

      </div>
    </CardContent>
  </Card>
)}


        
       
        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span>
              {strategy.entry_rules.conditions.length} entry ·{' '}
              {strategy.exit_rules.conditions.length} exit condition
              {strategy.exit_rules.conditions.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} data-testid="save-strategy-btn-bottom">
              <Save className="w-4 h-4 mr-2" /> Save Strategy
            </Button>
            <Button
              onClick={handleBacktest}
              disabled={loading}
              size="lg"
              data-testid="run-backtest-btn-bottom"
            >
              <Play className="w-4 h-4 mr-2" />
              {loading ? 'Running Backtest…' : 'Run Backtest'}
            </Button>
          </div>
        </div>

      </div>
    </TooltipProvider>
  );
};

export default StrategyBuilder;