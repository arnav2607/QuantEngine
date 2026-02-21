import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, Filter, TrendingUp, Volume2, Activity, Zap, BarChart3, Target } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EnhancedScreener = () => {
  const [stocks, setStocks] = useState([]);
  const [filters, setFilters] = useState({});
  const [availableFilters, setAvailableFilters] = useState({});
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState('all');

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
    setFilters(prev => ({
      ...prev,
      [filterId]: !prev[filterId]
    }));
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
      let universe = stocks.map(s => s.symbol);
      
      // Filter by index if selected
      if (selectedIndex !== 'all') {
        const indexStocks = stocks.filter(s => s.index === selectedIndex);
        universe = indexStocks.map(s => s.symbol);
      }

      const response = await axios.post(`${API}/screener`, {
        universe: universe.slice(0, 100), // Limit to 100 for performance
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

  const filterCategories = [
    { id: 'price_action', name: 'Price Action', icon: TrendingUp, color: 'text-blue-500' },
    { id: 'volume', name: 'Volume', icon: Volume2, color: 'text-green-500' },
    { id: 'momentum', name: 'Momentum', icon: Activity, color: 'text-purple-500' },
    { id: 'volatility', name: 'Volatility', icon: Zap, color: 'text-orange-500' },
    { id: 'patterns', name: 'Patterns', icon: BarChart3, color: 'text-pink-500' },
    { id: 'performance', name: 'Performance', icon: Target, color: 'text-cyan-500' },
  ];

  return (
    <div className="space-y-6" data-testid="enhanced-screener">
      <div>
        <h1 className="text-3xl font-bold font-['Rajdhani']">Advanced Stock Screener</h1>
        <p className="text-muted-foreground">28 professional filters across 6 categories - {stocks.length} stocks available</p>
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
                    {loading ? 'Screening...' : 'Run Screener'}
                  </Button>
                  <Button variant="outline" onClick={() => setFilters({})}>
                    Clear All
                  </Button>
                </div>
                <select
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(e.target.value)}
                  className="px-3 py-2 rounded-md border border-border bg-background"
                >
                  <option value="all">All Stocks ({stocks.length})</option>
                  <option value="Nifty 50">Nifty 50</option>
                  <option value="Nifty Bank">Nifty Bank</option>
                  <option value="Nifty Next 50">Nifty Next 50</option>
                  <option value="NSE 500">NSE 500</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Filter Categories */}
          <Accordion type="multiple" className="space-y-2">
            {filterCategories.map((category) => {
              const Icon = category.icon;
              const categoryFilters = availableFilters[category.id] || [];
              const selectedCount = categoryFilters.filter(f => filters[f.id]).length;

              return (
                <AccordionItem key={category.id} value={category.id} className="border rounded-lg px-4">
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
                      {categoryFilters.map((filter) => (
                        <div
                          key={filter.id}
                          className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer"
                          onClick={() => toggleFilter(filter.id)}
                        >
                          <Checkbox
                            checked={filters[filter.id] || false}
                            onCheckedChange={() => toggleFilter(filter.id)}
                            data-testid={`filter-${filter.id}`}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{filter.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {filter.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {results.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                No results yet. Select filters and click "Run Screener"
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {results.map((stock, idx) => (
                <Card key={idx} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-mono text-lg font-bold text-blue-500">{stock.symbol}</div>
                        <div className="text-sm text-muted-foreground">{stock.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">₹{stock.price.toFixed(2)}</div>
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
                          {filter.replace('_', ' ').toUpperCase()}
                        </span>
                      ))}
                    </div>

                    {Object.keys(stock.indicator_values).length > 0 && (
                      <div className="pt-3 border-t text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(stock.indicator_values).map(([key, value], i) => (
                          <div key={i}>
                            <span className="text-muted-foreground">{key}: </span>
                            <span className="font-semibold">
                              {typeof value === 'number' ? value.toFixed(2) : value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedScreener;
