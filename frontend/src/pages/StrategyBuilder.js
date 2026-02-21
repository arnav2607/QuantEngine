import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Play, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StrategyBuilder = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [indicators, setIndicators] = useState({});
  
  const [strategy, setStrategy] = useState({
    name: '',
    description: '',
    stocks: [],
    timeframe: '1d',
    start_date: '2024-01-01',
    end_date: new Date().toISOString().split('T')[0],
    initial_capital: 100000,
    strategy_type: 'long_only',
    position_sizing: 'percent',
    position_size_value: 100,
    entry_rules: {
      conditions: [],
      logic: 'AND'
    },
    exit_rules: {
      conditions: [],
      logic: 'AND'
    },
    stop_loss_atr_multiplier: null,
    trailing_stop: false
  });

  const [selectedStock, setSelectedStock] = useState('');

  useEffect(() => {
    fetchStocks();
    fetchIndicators();
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await axios.get(`${API}/stocks/popular`);
      setStocks(response.data);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    }
  };

  const fetchIndicators = async () => {
    try {
      const response = await axios.get(`${API}/indicators/info`);
      setIndicators(response.data);
    } catch (error) {
      console.error('Error fetching indicators:', error);
    }
  };

  const addCondition = (type) => {
    const newCondition = {
      id: Date.now().toString(),
      indicator: 'MA',
      params: { period: 20, type: 'SMA', source: 'Close' },
      condition: 'crossover',
      value: null
    };

    setStrategy(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        conditions: [...prev[type].conditions, newCondition]
      }
    }));
  };

  const removeCondition = (type, id) => {
    setStrategy(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        conditions: prev[type].conditions.filter(c => c.id !== id)
      }
    }));
  };

  const updateCondition = (type, id, field, value) => {
    setStrategy(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        conditions: prev[type].conditions.map(c =>
          c.id === id ? { ...c, [field]: value } : c
        )
      }
    }));
  };

  const handleSave = async () => {
    if (!strategy.name || strategy.stocks.length === 0) {
      toast.error('Please provide strategy name and select at least one stock');
      return;
    }

    if (strategy.entry_rules.conditions.length === 0) {
      toast.error('Please add at least one entry condition');
      return;
    }

    try {
      await axios.post(`${API}/strategies`, strategy);
      toast.success('Strategy saved successfully!');
      navigate('/strategies');
    } catch (error) {
      toast.error('Failed to save strategy');
      console.error(error);
    }
  };

  const handleBacktest = async () => {
    if (!strategy.name || strategy.stocks.length === 0) {
      toast.error('Please provide strategy name and select a stock');
      return;
    }

    if (strategy.entry_rules.conditions.length === 0 || strategy.exit_rules.conditions.length === 0) {
      toast.error('Please add entry and exit conditions');
      return;
    }

    try {
      toast.loading('Running backtest...');
      const response = await axios.post(`${API}/backtest`, strategy);
      toast.success('Backtest completed!');
      navigate('/results', { state: { result: response.data } });
    } catch (error) {
      toast.error('Backtest failed: ' + (error.response?.data?.detail || error.message));
      console.error(error);
    }
  };

  const renderConditionBuilder = (type, title) => {
    const rules = strategy[type];

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>Define conditions for {title.toLowerCase()}</CardDescription>
            </div>
            <Button onClick={() => addCondition(type)} size="sm" data-testid={`add-${type}-condition`}>
              <Plus className="w-4 h-4 mr-2" /> Add Condition
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.conditions.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Label>Logic:</Label>
              <Select
                value={rules.logic}
                onValueChange={(value) => setStrategy(prev => ({
                  ...prev,
                  [type]: { ...prev[type], logic: value }
                }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {rules.conditions.map((condition, idx) => (
            <div key={condition.id} className="p-4 border border-border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Condition {idx + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCondition(type, condition.id)}
                  data-testid={`remove-${type}-condition-${idx}`}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Indicator</Label>
                  <Select
                    value={condition.indicator}
                    onValueChange={(value) => updateCondition(type, condition.id, 'indicator', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(indicators).map(ind => (
                        <SelectItem key={ind} value={ind}>{indicators[ind].name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Condition</Label>
                  <Select
                    value={condition.condition}
                    onValueChange={(value) => updateCondition(type, condition.id, 'condition', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crossover">Crossover</SelectItem>
                      <SelectItem value="crossunder">Crossunder</SelectItem>
                      <SelectItem value="above">Above</SelectItem>
                      <SelectItem value="below">Below</SelectItem>
                      <SelectItem value="breakout_upper">Breakout Upper</SelectItem>
                      <SelectItem value="breakout_lower">Breakout Lower</SelectItem>
                      <SelectItem value="high_volume">High Volume</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Period</Label>
                  <Input
                    type="number"
                    value={condition.params.period || 20}
                    onChange={(e) => updateCondition(type, condition.id, 'params', {
                      ...condition.params,
                      period: parseInt(e.target.value)
                    })}
                  />
                </div>
              </div>
            </div>
          ))}

          {rules.conditions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No conditions added. Click "Add Condition" to get started.
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6" data-testid="strategy-builder">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Rajdhani']">Strategy Builder</h1>
          <p className="text-muted-foreground">Create and test your trading strategy</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} variant="outline" data-testid="save-strategy-btn">
            <Save className="w-4 h-4 mr-2" /> Save
          </Button>
          <Button onClick={handleBacktest} data-testid="run-backtest-btn">
            <Play className="w-4 h-4 mr-2" /> Run Backtest
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy Configuration</CardTitle>
          <CardDescription>Basic settings for your strategy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Strategy Name *</Label>
              <Input
                placeholder="e.g., MA Crossover Strategy"
                value={strategy.name}
                onChange={(e) => setStrategy({ ...strategy, name: e.target.value })}
                data-testid="strategy-name-input"
              />
            </div>

            <div>
              <Label>Stock Symbol *</Label>
              <Select
                value={selectedStock}
                onValueChange={(value) => {
                  setSelectedStock(value);
                  setStrategy({ ...strategy, stocks: [value] });
                }}
              >
                <SelectTrigger data-testid="stock-select">
                  <SelectValue placeholder="Select stock" />
                </SelectTrigger>
                <SelectContent>
                  {stocks.map(stock => (
                    <SelectItem key={stock.symbol} value={stock.symbol}>
                      {stock.symbol} - {stock.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Timeframe</Label>
              <Select
                value={strategy.timeframe}
                onValueChange={(value) => setStrategy({ ...strategy, timeframe: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">1 Day</SelectItem>
                  <SelectItem value="1wk">1 Week</SelectItem>
                  <SelectItem value="1mo">1 Month</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Initial Capital (₹)</Label>
              <Input
                type="number"
                value={strategy.initial_capital}
                onChange={(e) => setStrategy({ ...strategy, initial_capital: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={strategy.start_date}
                onChange={(e) => setStrategy({ ...strategy, start_date: e.target.value })}
              />
            </div>

            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={strategy.end_date}
                onChange={(e) => setStrategy({ ...strategy, end_date: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entry Rules */}
      {renderConditionBuilder('entry_rules', 'Entry Rules')}

      {/* Exit Rules */}
      {renderConditionBuilder('exit_rules', 'Exit Rules')}
    </div>
  );
};

export default StrategyBuilder;
