import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createChart } from 'lightweight-charts';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ChartsPage = () => {
  const [stocks, setStocks] = useState([]);
  const [selectedStocks, setSelectedStocks] = useState([]);
  const [timeframe, setTimeframe] = useState('1d');
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRefs = useRef([]);

  useEffect(() => {
    fetchStocks();
  }, []);

  useEffect(() => {
    if (selectedStocks.length > 0) {
      loadChartData();
    }
  }, [selectedStocks, timeframe]);

  const fetchStocks = async () => {
    try {
      const response = await axios.get(`${API}/stocks/all`);
      setStocks(response.data.slice(0, 100)); // Show first 100 for dropdown
    } catch (error) {
      console.error('Error fetching stocks:', error);
    }
  };

  const loadChartData = async () => {
    try {
      if (!chartContainerRef.current) return;

      // Clear existing chart
      if (chartRef.current) {
        chartRef.current.remove();
      }

      // Create new chart
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 500,
        layout: {
          background: { color: 'transparent' },
          textColor: '#d1d5db',
        },
        grid: {
          vertLines: { color: '#374151' },
          horzLines: { color: '#374151' },
        },
        timeScale: {
          borderColor: '#4b5563',
        },
        rightPriceScale: {
          borderColor: '#4b5563',
        },
      });

      chartRef.current = chart;
      seriesRefs.current = [];

      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

      // Load data for each selected stock
      for (let i = 0; i < selectedStocks.length; i++) {
        const symbol = selectedStocks[i];
        const color = colors[i % colors.length];

        try {
          const endDate = new Date().toISOString().split('T')[0];
          const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          const response = await axios.get(
            `${API}/stocks/${symbol}/data?start_date=${startDate}&end_date=${endDate}&timeframe=${timeframe}`
          );

          if (response.data && response.data.data) {
            const candlestickSeries = chart.addCandlestickSeries({
              upColor: color,
              downColor: '#ef4444',
              borderVisible: false,
              wickUpColor: color,
              wickDownColor: '#ef4444',
            });

            const chartData = response.data.data.map(d => ({
              time: new Date(d.Date).getTime() / 1000,
              open: d.Open,
              high: d.High,
              low: d.Low,
              close: d.Close,
            }));

            candlestickSeries.setData(chartData);
            seriesRefs.current.push(candlestickSeries);
          }
        } catch (error) {
          console.error(`Error loading ${symbol}:`, error);
        }
      }

      chart.timeScale().fitContent();
    } catch (error) {
      toast.error('Failed to load chart data');
      console.error(error);
    }
  };

  const addStock = (symbol) => {
    if (selectedStocks.length >= 5) {
      toast.error('Maximum 5 stocks can be compared');
      return;
    }
    if (!selectedStocks.includes(symbol)) {
      setSelectedStocks([...selectedStocks, symbol]);
    }
  };

  const removeStock = (symbol) => {
    setSelectedStocks(selectedStocks.filter(s => s !== symbol));
  };

  return (
    <div className="space-y-6" data-testid="charts-page">
      <div>
        <h1 className="text-3xl font-bold font-['Rajdhani']">Live Charts & Analysis</h1>
        <p className="text-muted-foreground">Interactive price charts with technical indicators</p>
      </div>

      {/* Stock Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Selection</CardTitle>
          <CardDescription>Compare up to 5 stocks simultaneously</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select onValueChange={addStock}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Add stock to compare" />
              </SelectTrigger>
              <SelectContent>
                {stocks.map(stock => (
                  <SelectItem key={stock.symbol} value={stock.symbol}>
                    {stock.symbol} - {stock.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Daily</SelectItem>
                <SelectItem value="1wk">Weekly</SelectItem>
                <SelectItem value="1mo">Monthly</SelectItem>
                <SelectItem value="1h">Hourly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selected Stocks */}
          {selectedStocks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedStocks.map((symbol, idx) => (
                <div
                  key={symbol}
                  className="px-3 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center gap-2"
                >
                  <span className="font-mono text-sm">{symbol}</span>
                  <button
                    onClick={() => removeStock(symbol)}
                    className="text-xs hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Price Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedStocks.length === 0 ? (
            <div className="h-[500px] flex items-center justify-center text-muted-foreground">
              Select stocks to view charts
            </div>
          ) : (
            <div ref={chartContainerRef} className="w-full" />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartsPage;
