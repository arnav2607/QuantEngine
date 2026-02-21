import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, TrendingUp, Volume2, Activity } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StockScreener = () => {
  const [stocks, setStocks] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [filters, setFilters] = useState({
    '52w_high': false,
    'high_volume': false,
    'strong_adx': false
  });

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await axios.get(`${API}/stocks/popular`);
      setStocks(response.data);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    }
  };

  const runScreener = async () => {
    const activeFilters = Object.entries(filters)
      .filter(([_, enabled]) => enabled)
      .map(([type, _]) => ({ filter_type: type }));

    if (activeFilters.length === 0) {
      toast.error('Please select at least one filter');
      return;
    }

    setLoading(true);
    try {
      const universe = stocks.map(s => s.symbol);
      const response = await axios.post(`${API}/screener`, {
        universe,
        filters: activeFilters,
        date: null
      });
      
      setResults(response.data);
      toast.success(`Found ${response.data.length} matching stocks`);
    } catch (error) {
      toast.error('Screener failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterOptions = [
    {
      id: '52w_high',
      label: '52-Week High Breakout',
      description: 'Stocks near or at 52-week highs',
      icon: TrendingUp,
      color: 'text-emerald-500'
    },
    {
      id: 'high_volume',
      label: 'High Relative Volume',
      description: 'Volume above 1.5x average',
      icon: Volume2,
      color: 'text-blue-500'
    },
    {
      id: 'strong_adx',
      label: 'Strong Trend (ADX > 25)',
      description: 'Stocks in strong trending phase',
      icon: Activity,
      color: 'text-purple-500'
    }
  ];

  return (
    <div className="space-y-6" data-testid="stock-screener">
      <div>
        <h1 className="text-3xl font-bold font-['Rajdhani']">Stock Screener</h1>
        <p className="text-muted-foreground">Find trading opportunities with technical filters</p>
      </div>

      {/* Filter Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Screening Filters</CardTitle>
          <CardDescription>Select criteria to scan stocks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filterOptions.map((filter) => {
              const Icon = filter.icon;
              return (
                <div
                  key={filter.id}
                  className="p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => setFilters({ ...filters, [filter.id]: !filters[filter.id] })}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={filters[filter.id]}
                      onCheckedChange={(checked) => setFilters({ ...filters, [filter.id]: checked })}
                      data-testid={`filter-${filter.id}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-5 h-5 ${filter.color}`} />
                        <div className="font-semibold">{filter.label}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">{filter.description}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            onClick={runScreener}
            disabled={loading}
            className="w-full md:w-auto"
            data-testid="run-screener-btn"
          >
            <Search className="w-4 h-4 mr-2" />
            {loading ? 'Screening...' : 'Run Screener'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Screening Results</CardTitle>
            <CardDescription>{results.length} stocks matched your criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((stock, idx) => (
                <div key={idx} className="p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-mono text-lg font-semibold text-blue-500">{stock.symbol}</div>
                      <div className="text-sm text-muted-foreground">{stock.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">₹{stock.price.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Vol: {(stock.volume / 1000).toFixed(0)}K</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {stock.matched_filters.map((filter, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-blue-500/10 text-blue-500 text-xs font-medium rounded-md"
                      >
                        {filter.replace('_', ' ').toUpperCase()}
                      </span>
                    ))}
                  </div>

                  {Object.keys(stock.indicator_values).length > 0 && (
                    <div className="mt-2 pt-2 border-t text-sm">
                      {Object.entries(stock.indicator_values).map(([key, value], i) => (
                        <span key={i} className="text-muted-foreground mr-3">
                          {key}: <span className="font-semibold">{typeof value === 'number' ? value.toFixed(2) : value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {results.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            Select filters and click "Run Screener" to find stocks
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StockScreener;
