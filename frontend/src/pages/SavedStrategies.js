import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Play, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SavedStrategies = () => {
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      const response = await axios.get(`${API}/strategies`);
      setStrategies(response.data);
    } catch (error) {
      toast.error('Failed to load strategies');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteStrategy = async (id) => {
    try {
      await axios.delete(`${API}/strategies/${id}`);
      toast.success('Strategy deleted');
      fetchStrategies();
    } catch (error) {
      toast.error('Failed to delete strategy');
    }
  };

  const runBacktest = async (strategy) => {
    try {
      toast.loading('Running backtest...');
      const response = await axios.post(`${API}/backtest`, strategy);
      toast.success('Backtest completed!');
      navigate('/results', { state: { result: response.data } });
    } catch (error) {
      toast.error('Backtest failed');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading strategies...</div>;
  }

  return (
    <div className="space-y-6" data-testid="saved-strategies">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Rajdhani']">Saved Strategies</h1>
          <p className="text-muted-foreground">Manage and backtest your strategies</p>
        </div>
        <Button onClick={() => navigate('/builder')} data-testid="create-new-strategy-btn">
          Create New Strategy
        </Button>
      </div>

      {strategies.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">No strategies saved yet</p>
            <Button onClick={() => navigate('/builder')}>Create Your First Strategy</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {strategies.map((strategy) => (
            <Card key={strategy.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{strategy.name}</CardTitle>
                    <CardDescription>{strategy.description || 'No description'}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteStrategy(strategy.id)}
                    data-testid={`delete-strategy-${strategy.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">Stock</div>
                    <div className="font-mono">{strategy.stocks[0]}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Timeframe</div>
                    <div className="font-semibold">{strategy.timeframe}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Capital</div>
                    <div className="font-semibold">₹{strategy.initial_capital.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Type</div>
                    <div className="capitalize">{strategy.strategy_type.replace('_', ' ')}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{strategy.start_date} to {strategy.end_date}</span>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-sm mb-2">
                    <span className="text-muted-foreground">Entry Conditions: </span>
                    <span className="font-semibold">{strategy.entry_rules.conditions.length}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Exit Conditions: </span>
                    <span className="font-semibold">{strategy.exit_rules.conditions.length}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => runBacktest(strategy)}
                  data-testid={`run-backtest-${strategy.id}`}
                >
                  <Play className="w-4 h-4 mr-2" /> Run Backtest
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedStrategies;
