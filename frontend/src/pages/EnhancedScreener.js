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

  return (\n    <div className=\"space-y-6\" data-testid=\"enhanced-screener\">\n      <div>\n        <h1 className=\"text-3xl font-bold font-['Rajdhani']\">Advanced Stock Screener</h1>\n        <p className=\"text-muted-foreground\">28 professional filters across 6 categories - {stocks.length} stocks available</p>\n      </div>\n\n      <Tabs defaultValue=\"filters\" className=\"space-y-4\">\n        <TabsList>\n          <TabsTrigger value=\"filters\">\n            <Filter className=\"w-4 h-4 mr-2\" />\n            Filters ({Object.values(filters).filter(Boolean).length})\n          </TabsTrigger>\n          <TabsTrigger value=\"results\">\n            <Search className=\"w-4 h-4 mr-2\" />\n            Results ({results.length})\n          </TabsTrigger>\n        </TabsList>\n\n        <TabsContent value=\"filters\" className=\"space-y-4\">\n          {/* Quick Actions */}\n          <Card>\n            <CardContent className=\"pt-6\">\n              <div className=\"flex items-center justify-between\">\n                <div className=\"flex gap-2\">\n                  <Button onClick={runScreener} disabled={loading} data-testid=\"run-screener-btn\">\n                    <Search className=\"w-4 h-4 mr-2\" />\n                    {loading ? 'Screening...' : 'Run Screener'}\n                  </Button>\n                  <Button variant=\"outline\" onClick={() => setFilters({})}>\n                    Clear All\n                  </Button>\n                </div>\n                <select\n                  value={selectedIndex}\n                  onChange={(e) => setSelectedIndex(e.target.value)}\n                  className=\"px-3 py-2 rounded-md border border-border bg-background\"\n                >\n                  <option value=\"all\">All Stocks ({stocks.length})</option>\n                  <option value=\"Nifty 50\">Nifty 50</option>\n                  <option value=\"Nifty Bank\">Nifty Bank</option>\n                  <option value=\"Nifty Next 50\">Nifty Next 50</option>\n                  <option value=\"NSE 500\">NSE 500</option>\n                </select>\n              </div>\n            </CardContent>\n          </Card>\n\n          {/* Filter Categories */}\n          <Accordion type=\"multiple\" className=\"space-y-2\">\n            {filterCategories.map((category) => {\n              const Icon = category.icon;\n              const categoryFilters = availableFilters[category.id] || [];\n              const selectedCount = categoryFilters.filter(f => filters[f.id]).length;\n\n              return (\n                <AccordionItem key={category.id} value={category.id} className=\"border rounded-lg px-4\">\n                  <AccordionTrigger>\n                    <div className=\"flex items-center gap-3\">\n                      <Icon className={`w-5 h-5 ${category.color}`} />\n                      <span className=\"font-semibold\">{category.name}</span>\n                      {selectedCount > 0 && (\n                        <span className=\"px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full\">\n                          {selectedCount}\n                        </span>\n                      )}\n                    </div>\n                  </AccordionTrigger>\n                  <AccordionContent>\n                    <div className=\"grid grid-cols-1 md:grid-cols-2 gap-3 pt-4\">\n                      {categoryFilters.map((filter) => (\n                        <div\n                          key={filter.id}\n                          className=\"flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer\"\n                          onClick={() => toggleFilter(filter.id)}\n                        >\n                          <Checkbox\n                            checked={filters[filter.id] || false}\n                            onCheckedChange={() => toggleFilter(filter.id)}\n                            data-testid={`filter-${filter.id}`}\n                          />\n                          <div className=\"flex-1\">\n                            <div className=\"font-medium text-sm\">{filter.name}</div>\n                            <div className=\"text-xs text-muted-foreground mt-0.5\">\n                              {filter.description}\n                            </div>\n                          </div>\n                        </div>\n                      ))}\n                    </div>\n                  </AccordionContent>\n                </AccordionItem>\n              );\n            })}\n          </Accordion>\n        </TabsContent>\n\n        <TabsContent value=\"results\" className=\"space-y-4\">\n          {results.length === 0 ? (\n            <Card>\n              <CardContent className=\"text-center py-12 text-muted-foreground\">\n                No results yet. Select filters and click \"Run Screener\"\n              </CardContent>\n            </Card>\n          ) : (\n            <div className=\"space-y-3\">\n              {results.map((stock, idx) => (\n                <Card key={idx} className=\"hover:shadow-md transition-shadow\">\n                  <CardContent className=\"pt-6\">\n                    <div className=\"flex items-center justify-between mb-3\">\n                      <div>\n                        <div className=\"font-mono text-lg font-bold text-blue-500\">{stock.symbol}</div>\n                        <div className=\"text-sm text-muted-foreground\">{stock.name}</div>\n                      </div>\n                      <div className=\"text-right\">\n                        <div className=\"text-xl font-bold\">₹{stock.price.toFixed(2)}</div>\n                        <div className=\"text-sm text-muted-foreground\">\n                          Vol: {(stock.volume / 1000).toFixed(0)}K\n                        </div>\n                      </div>\n                    </div>\n\n                    <div className=\"flex flex-wrap gap-2 mb-3\">\n                      {stock.matched_filters.map((filter, i) => (\n                        <span\n                          key={i}\n                          className=\"px-2.5 py-1 bg-blue-500/10 text-blue-500 text-xs font-medium rounded-md border border-blue-500/20\"\n                        >\n                          {filter.replace('_', ' ').toUpperCase()}\n                        </span>\n                      ))}\n                    </div>\n\n                    {Object.keys(stock.indicator_values).length > 0 && (\n                      <div className=\"pt-3 border-t text-sm grid grid-cols-2 md:grid-cols-4 gap-2\">\n                        {Object.entries(stock.indicator_values).map(([key, value], i) => (\n                          <div key={i}>\n                            <span className=\"text-muted-foreground\">{key}: </span>\n                            <span className=\"font-semibold\">\n                              {typeof value === 'number' ? value.toFixed(2) : value}\n                            </span>\n                          </div>\n                        ))}\n                      </div>\n                    )}\n                  </CardContent>\n                </Card>\n              ))}\n            </div>\n          )}\n        </TabsContent>\n      </Tabs>\n    </div>\n  );\n};\n\nexport default EnhancedScreener;
