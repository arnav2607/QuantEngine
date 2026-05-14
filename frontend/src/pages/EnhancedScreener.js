import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, Filter, TrendingUp, Activity, Zap, BarChart3, Target, QrCodeIcon, Info, X, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ─── Pattern Info Modal ────────────────────────────────────────────────────────

const PATTERN_INFO = {
  bullish_engulfing: {
    name: "Bullish Engulfing",
    description: "A two-candle reversal pattern where a large green candle completely engulfs the previous red candle's body. Signals a potential bullish reversal after a downtrend.",
    conditions: ["Previous candle is bearish (red)", "Current candle is bullish (green)", "Current candle opens below or at previous close", "Current candle closes above or at previous open"],
    signal: "bullish",
    svgPath: (
      <svg viewBox="0 0 120 100" className="w-full h-28">
        {/* Previous bearish candle */}
        <rect x="28" y="20" width="14" height="45" fill="#ef4444" rx="1"/>
        <line x1="35" y1="10" x2="35" y2="20" stroke="#ef4444" strokeWidth="2"/>
        <line x1="35" y1="65" x2="35" y2="80" stroke="#ef4444" strokeWidth="2"/>
        {/* Current bullish engulfing candle */}
        <rect x="68" y="12" width="18" height="65" fill="#22c55e" rx="1"/>
        <line x1="77" y1="5" x2="77" y2="12" stroke="#22c55e" strokeWidth="2"/>
        <line x1="77" y1="77" x2="77" y2="88" stroke="#22c55e" strokeWidth="2"/>
        {/* Labels */}
        <text x="35" y="96" textAnchor="middle" fontSize="9" fill="#888">Bearish</text>
        <text x="77" y="96" textAnchor="middle" fontSize="9" fill="#888">Engulfs</text>
        {/* Arrow */}
        <path d="M50 45 L62 45" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none"/>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#22c55e"/>
          </marker>
        </defs>
      </svg>
    )
  },
  bearish_engulfing: {
    name: "Bearish Engulfing",
    description: "A two-candle reversal pattern where a large red candle completely engulfs the previous green candle's body. Signals a potential bearish reversal after an uptrend.",
    conditions: ["Previous candle is bullish (green)", "Current candle is bearish (red)", "Current candle opens above or at previous close", "Current candle closes below or at previous open"],
    signal: "bearish",
    svgPath: (
      <svg viewBox="0 0 120 100" className="w-full h-28">
        <rect x="28" y="25" width="14" height="40" fill="#22c55e" rx="1"/>
        <line x1="35" y1="12" x2="35" y2="25" stroke="#22c55e" strokeWidth="2"/>
        <line x1="35" y1="65" x2="35" y2="78" stroke="#22c55e" strokeWidth="2"/>
        <rect x="68" y="12" width="18" height="65" fill="#ef4444" rx="1"/>
        <line x1="77" y1="4" x2="77" y2="12" stroke="#ef4444" strokeWidth="2"/>
        <line x1="77" y1="77" x2="77" y2="88" stroke="#ef4444" strokeWidth="2"/>
        <text x="35" y="96" textAnchor="middle" fontSize="9" fill="#888">Bullish</text>
        <text x="77" y="96" textAnchor="middle" fontSize="9" fill="#888">Engulfs</text>
        <path d="M50 45 L62 45" stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#arrowB)" fill="none"/>
        <defs>
          <marker id="arrowB" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#ef4444"/>
          </marker>
        </defs>
      </svg>
    )
  },
  doji: {
    name: "Doji",
    description: "A candle with nearly equal open and close prices, forming a cross or plus shape. Represents market indecision and often signals a potential reversal or continuation pause.",
    conditions: ["Open ≈ Close (body < 10% of candle range)", "Can have upper and lower wicks of any size"],
    signal: "neutral",
    svgPath: (
      <svg viewBox="0 0 120 100" className="w-full h-28">
        {/* Doji */}
        <line x1="60" y1="10" x2="60" y2="88" stroke="#22c55e" strokeWidth="2"/>
        <rect x="48" y="47" width="24" height="3" fill="#ef4444" rx="1"/>
        <text x="60" y="96" textAnchor="middle" fontSize="9" fill="#ef4444">Open ≈ Close</text>
        {/* Annotation */}
        <text x="74" y="30" fontSize="8" fill="#64748b">Upper</text>
        <text x="74" y="38" fontSize="8" fill="#64748b">Wick</text>
        <text x="74" y="65" fontSize="8" fill="#64748b">Lower</text>
        <text x="74" y="73" fontSize="8" fill="#64748b">Wick</text>
      </svg>
    )
  },
  hammer: {
    name: "Hammer",
    description: "A bullish reversal candle with a small body near the top and a long lower wick (at least 2x the body). Appears at the bottom of downtrends, indicating buyers stepped in strongly.",
    conditions: ["Small real body (open/close near top)", "Lower wick ≥ 2× the body size", "Little to no upper wick", "Usually appears after a downtrend"],
    signal: "bullish",
    svgPath: (
      <svg viewBox="0 0 120 100" className="w-full h-28">
        {/* Hammer */}
        <rect x="50" y="18" width="20" height="18" fill="#22c55e" rx="1"/>
        <line x1="60" y1="10" x2="60" y2="18" stroke="#22c55e" strokeWidth="2"/>
        <line x1="60" y1="36" x2="60" y2="85" stroke="#22c55e" strokeWidth="2"/>
        {/* Annotations */}
        <text x="78" y="27" fontSize="8" fill="#64748b">Small body</text>
        <text x="78" y="60" fontSize="8" fill="#64748b">Long lower</text>
        <text x="78" y="69" fontSize="8" fill="#64748b">wick (2×+)</text>
        <text x="60" y="96" textAnchor="middle" fontSize="9" fill="#888">Hammer</text>
        {/* Arrows */}
        <line x1="76" y1="27" x2="72" y2="27" stroke="#64748b" strokeWidth="1"/>
        <line x1="76" y1="60" x2="68" y2="58" stroke="#64748b" strokeWidth="1"/>
      </svg>
    )
  }
};

function PatternInfoModal({ pattern, onClose }) {
  if (!pattern) return null;
  const info = PATTERN_INFO[pattern];
  if (!info) return null;

  const signalColor = info.signal === 'bullish' ? 'text-green-400 bg-green-400/10 border-green-400/30'
    : info.signal === 'bearish' ? 'text-red-400 bg-red-400/10 border-red-400/30'
    : 'text-slate-400 bg-slate-400/10 border-slate-400/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg font-['Rajdhani']">{info.name}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-muted/30 rounded-lg p-3 mb-3">
          {info.svgPath}
        </div>

        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border mb-3 ${signalColor}`}>
          {info.signal.toUpperCase()} SIGNAL
        </span>

        <p className="text-sm text-muted-foreground mb-3">{info.description}</p>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Conditions</p>
          <ul className="space-y-1">
            {info.conditions.map((c, i) => (
              <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                <span className="text-blue-400 mt-0.5">•</span> {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Filter Parameter Controls ─────────────────────────────────────────────────

const FILTER_PARAMS_CONFIG = {
  new_high:{
    period: { label: "Lookback Period", min: 5, max:750, default: 252, step: 1, unit: "days" }
  },
  new_low: {
    period: { label: "Lookback Period", min: 5, max:750, default: 252, step: 1, unit: "days" }
  },
  price_above_ma: {
    period: { label: "MA Period", min: 5, max: 500, default: 9, step: 1, unit: "days" }
  },
  high_volume: {
    period: { label: "Lookback Period", min: 5, max: 60, default: 20, step: 1, unit: "days" },
    multiplier: { label: "Volume Multiplier", min: 1.0, max: 10.0, default: 1.5, step: 0.1, unit: "×" }
  },
  strong_adx: {
    threshold: { label: "ADX Threshold", min: 10, max: 50, default: 25, step: 1, unit: "" }
  },
  rsi_oversold: {
    threshold: { label: "RSI Level", min: 10, max: 40, default: 30, step: 1, unit: "" }
  },
  rsi_overbought: {
    threshold: { label: "RSI Level", min: 60, max: 90, default: 70, step: 1, unit: "" }
  },
  gainers_1d: {
    min_gain: { label: "Min Gain", min: 0.5, max: 20, default: 2, step: 0.5, unit: "%" }
  },
  losers_1d: {
    min_loss: { label: "Min Loss", min: 0.5, max: 20, default: 2, step: 0.5, unit: "%" }
  },
  gainers_1w: {
    min_gain: { label: "Min Gain", min: 1, max: 30, default: 5, step: 0.5, unit: "%" }
  },
  gainers_1m: {
    min_gain: { label: "Min Gain", min: 2, max: 50, default: 10, step: 1, unit: "%" }
  }
};

function ParamControl({ filterId, paramKey, config, value, onChange }) {
  return (
    <div className="mt-2 px-1" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-muted-foreground">{config.label}</span>
        <span className="text-xs font-bold text-blue-400">
          {value ?? config.default}{config.unit}
        </span>
      </div>
      <input
        type="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={value ?? config.default}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-blue-500"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
        <span>{config.min}{config.unit}</span>
        <span>{config.max}{config.unit}</span>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

const EnhancedScreener = () => {
  const [stocks, setStocks] = useState([]);
  const [filters, setFilters] = useState({});
  const [filterParams, setFilterParams] = useState({});
  const [availableFilters, setAvailableFilters] = useState({});
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState("");
  const [patternModal, setPatternModal] = useState(null);
  const [visibleCount, setVisibleCount] = useState(50);  // pagination window

  const filteredResults = useMemo(() => {
    return results.filter((stock) =>
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [results, searchTerm]);

  // Only render the first `visibleCount` rows — keeps the DOM light when the
  // screener returns 500+ matches. "Show more" reveals the rest in batches.
  const visibleResults = useMemo(
    () => filteredResults.slice(0, visibleCount),
    [filteredResults, visibleCount]
  );

  // Reset pagination whenever the underlying result set changes
  useEffect(() => { setVisibleCount(50); }, [results, searchTerm]);

  useEffect(() => {
    fetchStocks();
    fetchFilters();
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await axios.get(`${API}/stocks/all`);
      setStocks(response.data);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    }
  };

  const fetchFilters = async () => {
    try {
      const response = await axios.get(`${API}/screener/filters`);
      setAvailableFilters(response.data);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const toggleFilter = (filterId) => {
    setFilters(prev => ({ ...prev, [filterId]: !prev[filterId] }));
  };

  const updateParam = (filterId, paramKey, value) => {
    setFilterParams(prev => ({
      ...prev,
      [filterId]: { ...(prev[filterId] || {}), [paramKey]: value }
    }));
  };

  const buildActiveFilters = () => {
    return Object.entries(filters)
      .filter(([_, enabled]) => enabled)
      .map(([type]) => {
        const paramConfig = FILTER_PARAMS_CONFIG[type];
        if (!paramConfig) return { filter_type: type };

        const params = {};
        Object.entries(paramConfig).forEach(([key, cfg]) => {
          params[key] = filterParams[type]?.[key] ?? cfg.default;
        });
        return { filter_type: type, params };
      });
  };

  const runScreener = async () => {
    const activeFilters = buildActiveFilters();
    setLoading(true);

    try {
      if (activeFilters.length === 0) {
        const response = await axios.get(`${API}/indices`, {
          params: { universe_type: selectedIndex, filters: activeFilters, date: null }
        });
        setResults(response.data);
        toast.success(`Showing ${response.data.length} stocks`);
        return;
      }
      console.log("Running screener with:", { universe_type: selectedIndex, filters: activeFilters })

      const response = await axios.post(`${API}/screener`, {
        universe_type: selectedIndex,
        filters: activeFilters,
        date: null,
      
      });

      setResults(response.data);
      toast.success(`Found ${response.data.length} matching stocks`);
    } catch (error) {
      toast.error("Screener failed");
      console.error(error);
    } finally {
      setLoading(false)
    }
  };

  const filterCategories = [
    { id: 'price_action', name: 'Price Action', icon: TrendingUp, color: 'text-blue-500' },
    { id: 'volume', name: 'Volume', icon: BarChart3, color: 'text-green-500' },
    { id: 'momentum', name: 'Momentum', icon: Activity, color: 'text-purple-500' },
    { id: 'volatility', name: 'Volatility', icon: Zap, color: 'text-orange-500' },
    { id: 'patterns', name: 'Patterns', icon: QrCodeIcon, color: 'text-pink-500' },
    { id: 'performance', name: 'Performance', icon: Target, color: 'text-cyan-500' }
  ];

  return (
    <div className="space-y-6" data-testid="enhanced-screener">
      <PatternInfoModal pattern={patternModal} onClose={() => setPatternModal(null)} />

      <div>
        <h1 className="text-3xl font-bold font-['Rajdhani']">Advanced Stock Screener</h1>
        <p className="text-muted-foreground">
          28 professional filters across 6 categories — {stocks.length} stocks available
        </p>
      </div>

      <Tabs defaultValue="filters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="filters">
            <Filter className="w-4 h-4 mr-2" />
            Filters ({Object.values(filters).filter(Boolean).length})
          </TabsTrigger>
          <TabsTrigger value="results">
            <Search className="w-4 h-4 mr-2" />
            Results ({results.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="filters" className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button onClick={runScreener} disabled={loading} data-testid="run-screener-btn">
                    <Search className="w-4 h-4 mr-2" />
                    {loading ? "Screening..." : "Run Screener"}
                  </Button>
                  <Button variant="outline" onClick={() => { setFilters({}); setFilterParams({}); }}>
                    Clear All
                  </Button>
                </div>
                <select
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(e.target.value)}
                  className="px-3 py-2 rounded-md border border-border bg-background"
                >
                  <option value="ALL">All Stocks</option>
                  <optgroup label="Indices">
                    <option value="NIFTY50">Nifty 50</option>
                    <option value="NIFTYNEXT50">Nifty Next 50</option>
                    <option value="NIFTY200">Nifty 200</option>
                    <option value="NIFTY500">Nifty 500</option>
                    <option value="NIFTYTOTALMARKET">Nifty Total Market</option>
                  </optgroup>
                  <optgroup label="Sectors">
                    <option value="NIFTY_IT">IT</option>
                    <option value="NIFTY_BANK">Banking</option>
                    <option value="NIFTY_AUTO">Auto</option>
                    <option value="NIFTY_FMCG">FMCG</option>
                    <option value="NIFTY_METAL">Metal</option>
                  </optgroup>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Filter Categories */}
          <Accordion type="multiple" className="space-y-2">
            {filterCategories.map((category) => {
              const Icon = category.icon;
              const categoryFilters = availableFilters[category.id] || [];
              const selectedCount = categoryFilters.filter((f) => filters[f.id]).length;
              const isPatternCategory = category.id === 'patterns';

              return (
                <AccordionItem
                  key={category.id}
                  value={category.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${category.color}`} />
                      <span className="font-semibold">{category.name}</span>
                      {selectedCount > 0 && (
                        <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                          {selectedCount}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                      {categoryFilters.map((filter) => {
                        const hasParams = !!FILTER_PARAMS_CONFIG[filter.id];
                        const isPattern = isPatternCategory && !!PATTERN_INFO[filter.id];
                        const isChecked = filters[filter.id] || false;

                        return (
                          <div
                            key={filter.id}
                            className={`flex flex-col p-3 rounded-lg border transition-colors cursor-pointer
                              ${isChecked ? 'border-blue-500/50 bg-blue-500/5' : 'border-border hover:bg-accent'}`}
                            onClick={() => toggleFilter(filter.id)}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleFilter(filter.id)}
                                data-testid={`filter-${filter.id}`}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-sm">{filter.name}</span>
                                  {isPattern && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setPatternModal(filter.id); }}
                                      className="text-muted-foreground hover:text-blue-400 transition-colors flex-shrink-0"
                                      title="Learn about this pattern"
                                    >
                                      <Info className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">{filter.description}</div>
                              </div>
                            </div>

                            {/* Parameter Controls — shown when filter is enabled */}
                            {isChecked && hasParams && (
                              <div className="mt-3 pt-3 border-t border-border/60 space-y-3">
                                {Object.entries(FILTER_PARAMS_CONFIG[filter.id]).map(([paramKey, config]) => (
                                  <ParamControl
                                    key={paramKey}
                                    filterId={filter.id}
                                    paramKey={paramKey}
                                    config={config}
                                    value={filterParams[filter.id]?.[paramKey]}
                                    onChange={(val) => updateParam(filter.id, paramKey, val)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
            <div className="space-y-3">
              <div className="w-full flex items-center justify-between gap-3">
                <input
                  type="text"
                  placeholder="Search by symbol or company name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid="results-count">
                  Showing {visibleResults.length} of {filteredResults.length}
                </span>
              </div>
              {visibleResults.map((stock, idx) => (
                // <Link to={`/charts/${stock.symbol}`} key={idx}>
                  <Card className="hover:shadow-md transition-shadow" key={idx}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-mono text-lg font-bold text-blue-500">
                            {stock.symbol}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {stock.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">
                            ₹{stock.price.toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Vol: {(stock.volume / 1000).toFixed(0)}K
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {stock.matched_filters.map((filter, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-blue-500/10 text-blue-500 text-xs font-medium rounded-md border border-blue-500/20"
                          >
                            {filter.replace("_", " ").toUpperCase()}
                          </span>
                        ))}
                      </div>

                      {Object.keys(stock.indicator_values).length > 0 && (
                        <div className="pt-3 border-t text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(stock.indicator_values).map(
                            ([key, value], i) => (
                              <div key={i}>
                                <span className="text-muted-foreground">
                                  {key}:{" "}
                                </span>
                                <span className="font-semibold">
                                  {typeof value === "number"
                                    ? value.toFixed(2)
                                    : value}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                // </Link>
              ))}
              {visibleCount < filteredResults.length && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount(v => v + 50)}
                    data-testid="show-more-results-btn"
                  >
                    Show more ({filteredResults.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </div>
          
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedScreener;
