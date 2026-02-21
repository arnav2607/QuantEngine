import React from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Activity, Target, Percent } from 'lucide-react';

const BacktestResults = () => {
  const location = useLocation();
  const result = location.state?.result;

  if (!result) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No backtest results available</p>
      </div>
    );
  }

  const { metrics, trades, equity_curve } = result;

  const metricCards = [
    { label: 'Total Return', value: `${metrics.total_return}%`, icon: TrendingUp, color: metrics.total_return > 0 ? 'text-emerald-500' : 'text-red-500' },
    { label: 'Buy & Hold', value: `${metrics.buy_hold_return}%`, icon: Activity, color: 'text-blue-500' },
    { label: 'Sharpe Ratio', value: metrics.sharpe_ratio, icon: Target, color: 'text-purple-500' },
    { label: 'Max Drawdown', value: `${metrics.max_drawdown}%`, icon: TrendingDown, color: 'text-orange-500' },
    { label: 'Win Rate', value: `${metrics.win_rate}%`, icon: Percent, color: 'text-cyan-500' },
    { label: 'Total Trades', value: metrics.total_trades, icon: Activity, color: 'text-pink-500' },
  ];

  return (
    <div className="space-y-6" data-testid="backtest-results">
      <div>
        <h1 className="text-3xl font-bold font-['Rajdhani']">Backtest Results</h1>
        <p className="text-muted-foreground">Performance analysis for {result.symbol}</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metricCards.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>{metric.label}</CardDescription>
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold font-['JetBrains_Mono'] ${metric.color}`}>
                  {metric.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Winning Trades</div>
              <div className="text-xl font-semibold text-emerald-500">{metrics.winning_trades}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Losing Trades</div>
              <div className="text-xl font-semibold text-red-500">{metrics.losing_trades}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Avg Win</div>
              <div className="text-xl font-semibold">₹{metrics.avg_win.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Avg Loss</div>
              <div className="text-xl font-semibold">₹{metrics.avg_loss.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Profit Factor</div>
              <div className="text-xl font-semibold">{metrics.profit_factor.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Sortino Ratio</div>
              <div className="text-xl font-semibold">{metrics.sortino_ratio.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Expectancy</div>
              <div className="text-xl font-semibold">₹{metrics.expectancy.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Avg Holding</div>
              <div className="text-xl font-semibold">{metrics.avg_holding_period.toFixed(1)} bars</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trade History */}
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
          <CardDescription>{trades.length} trades executed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry Date</TableHead>
                  <TableHead>Exit Date</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Exit Price</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>Return %</TableHead>
                  <TableHead>Holding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.slice(0, 20).map((trade, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">{trade.entry_date.split('T')[0]}</TableCell>
                    <TableCell className="font-mono text-sm">{trade.exit_date.split('T')[0]}</TableCell>
                    <TableCell>₹{trade.entry_price.toFixed(2)}</TableCell>
                    <TableCell>₹{trade.exit_price.toFixed(2)}</TableCell>
                    <TableCell className={trade.pnl > 0 ? 'text-emerald-500 font-semibold' : 'text-red-500 font-semibold'}>
                      ₹{trade.pnl.toFixed(2)}
                    </TableCell>
                    <TableCell className={trade.pnl_percent > 0 ? 'text-emerald-500' : 'text-red-500'}>
                      {trade.pnl_percent.toFixed(2)}%
                    </TableCell>
                    <TableCell>{trade.holding_period} bars</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {trades.length > 20 && (
            <p className="text-sm text-muted-foreground mt-2">Showing 20 of {trades.length} trades</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BacktestResults;
