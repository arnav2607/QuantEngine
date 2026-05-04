import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Code, Code2, TrendingUp } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/prism';


const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const IndicatorsPage = () => {
  
  const [indicators, setIndicators] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIndicators();
  }, []);

  const fetchIndicators = async () => {
    try {
      const response = await axios.get(`${API}/indicators/info`);
      setIndicators(response.data);
    } catch (error) {
      console.error('Error fetching indicators:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading indicators...</div>;
  }
const MAcode=`#Moving Average (MA)\n\ndef moving_average(prices, window_size):\n    \"\"\"\n    Calculate the Moving Average (MA) of a price series.\n\n    Parameters:\n    prices (list or np.array): A list or array of price values.\n    window_size (int): The number of periods to calculate the average over.\n\n    Returns:\n    np.array: An array of the moving average values.\n    \"\"\"\n    if len(prices) < window_size:\n        raise ValueError(\"Window size must be less than or equal to the length of the price series.\")\n\n    ma_values = np.convolve(prices, np.ones(window_size)/window_size, mode='valid')\n    return ma_values`;
const RSIcode=`#Relative Strength Index (RSI)\n\ndef relative_strength_index(prices, window_size):\n    \"\"\"\n    Calculate the Relative Strength Index (RSI) of a price series.\n\n    Parameters:\n    prices (list or np.array): A list or array of price values.\n    window_size (int): The number of periods to calculate the RSI over.\n\n    Returns:\n    np.array: An array of the RSI values.\n    \"\"\"\n    deltas = np.diff(prices)\n    gains = np.where(deltas > 0, deltas, 0)\n    losses = np.where(deltas < 0, -deltas, 0)\n\n    avg_gain = np.convolve(gains, np.ones(window_size)/window_size, mode='valid')\n    avg_loss = np.convolve(losses, np.ones(window_size)/window_size, mode='valid')\n\n    rs = avg_gain / avg_loss\n    rsi_values = 100 - (100 / (1 + rs))\n    return rsi_values`;
const MACDcode=`#Moving Average Convergence Divergence (MACD)\n\ndef macd(prices, fast_window=12, slow_window=26, signal_window=9):\n    \"\"\"\n    Calculate the Moving Average Convergence Divergence (MACD) of a price series.\n\n    Parameters:\n    prices (list or np.array): A list or array of price values.\n    fast_window (int): The number of periods for the fast EMA.\n    slow_window (int): The number of periods for the slow EMA.\n    signal_window (int): The number of periods for the signal line EMA.\n\n    Returns:\n    tuple: A tuple containing three arrays: (macd_line, signal_line, histogram)\n    \"\"\"\n    ema_fast = exponential_moving_average(prices, fast_window)\n    ema_slow = exponential_moving_average(prices, slow_window)\n\n    macd_line = ema_fast - ema_slow\n    signal_line = exponential_moving_average(macd_line, signal_window)\n    histogram = macd_line - signal_line\n\n    return macd_line, signal_line, histogram`;
const BollingerCode=`#Bollinger Bands\n\ndef bollinger_bands(prices, window_size=20, num_std_dev=2):\n    \"\"\"\n    Calculate the Bollinger Bands of a price series.\n\n    Parameters:\n    prices (list or np.array): A list or array of price values.\n    window_size (int): The number of periods to calculate the moving average and standard deviation over.\n    num_std_dev (int): The number of standard deviations to determine the width of the bands.\n\n    Returns:\n    tuple: A tuple containing three arrays: (middle_band, upper_band, lower_band)\n    \"\"\"\n    middle_band = moving_average(prices, window_size)\n    std_dev = np.std(prices[-window_size:])\n\n    upper_band = middle_band + (num_std_dev * std_dev)\n    lower_band = middle_band - (num_std_dev * std_dev)\n\n    return middle_band, upper_band, lower_band`;
const ADXcode=`#Average Directional Index (ADX)\n\ndef average_directional_index(highs, lows, closes, window_size=14):\n    \"\"\"\n    Calculate the Average Directional Index (ADX) of a price series.\n\n    Parameters:\n    highs (list or np.array): A list or array of high price values.\n    lows (list or np.array): A list or array of low price values.\n    closes (list or np.array): A list or array of close price values.\n    window_size (int): The number of periods to calculate the ADX over.\n\n    Returns:\n    np.array: An array of the ADX values.\n    \"\"\"\n    plus_dm = np.where((highs[1:] - highs[:-1]) > (lows[:-1] - lows[1:]), highs[1:] - highs[:-1], 0)\n    minus_dm = np.where((lows[:-1] - lows[1:]) > (highs[1:] - highs[:-1]), lows[:-1] - lows[1:], 0)\n\n    tr = np.maximum.reduce([highs[1:] - lows[1:], np.abs(highs[1:] - closes[:-1]), np.abs(lows[1:] - closes[:-1])])\n\n    plus_di = 100 * (plus_dm / tr)\n    minus_di = 100 * (minus_dm / tr)\n\n    dx = 100 * (np.abs(plus_di - minus_di) / (plus_di + minus_di))\n    adx_values = moving_average(dx, window_size)\n\n    return adx_values`;
const DonchianCode=`#Donchian Channels\n\ndef donchian_channels(prices, window_size=20):\n    \"\"\"\n    Calculate the Donchian Channels of a price series.\n\n    Parameters:\n    prices (list or np.array): A list or array of price values.\n    window_size (int): The number of periods to calculate the channels over.\n\n    Returns:\n    tuple: A tuple containing three arrays: (upper_channel, lower_channel, middle_channel)\n    \"\"\"\n    upper_channel = np.max(prices[-window_size:])\n    lower_channel = np.min(prices[-window_size:])\n    middle_channel = (upper_channel + lower_channel) / 2\n\n    return upper_channel, lower_channel, middle_channel`;
const ATRcode=`#Average True Range (ATR)\n\ndef average_true_range(highs, lows, closes, window_size=14):\n    \"\"\"\n    Calculate the Average True Range (ATR) of a price series.\n\n    Parameters:\n    highs (list or np.array): A list or array of high price values.\n    lows (list or np.array): A list or array of low price values.\n    closes (list or np.array): A list or array of close price values.\n    window_size (int): The number of periods to calculate the ATR over.\n\n    Returns:\n    np.array: An array of the ATR values.\n    \"\"\"\n    tr = np.maximum.reduce([highs[1:] - lows[1:], np.abs(highs[1:] - closes[:-1]), np.abs(lows[1:] - closes[:-1])])\n    atr_values = moving_average(tr, window_size)\n\n    return atr_values`;
const SuperTrendcode=`#SuperTrend\n\ndef supertrend(prices, highs, lows, window_size=10, multiplier=3):\n    \"\"\"\n    Calculate the SuperTrend of a price series.\n\n    Parameters:\n    prices (list or np.array): A list or array of price values.\n    highs (list or np.array): A list or array of high price values.\n    lows (list or np.array): A list or array of low price values.\n    window_size (int): The number of periods to calculate the ATR over.\n    multiplier (int): The multiplier for the ATR to determine the SuperTrend bands.\n\n    Returns:\n    tuple: A tuple containing two arrays: (supertrend_line, direction)\n    \"\"\"\n    atr_values = average_true_range(highs, lows, prices, window_size)\n\n    upper_band = ((highs + lows) / 2) + (multiplier * atr_values)\n    lower_band = ((highs + lows) / 2) - (multiplier * atr_values)\n\n    supertrend_line = np.where(prices > upper_band, lower_band, upper_band)\n    direction = np.where(prices > supertrend_line, 1, -1)\n\n    return supertrend_line, direction`;
const VWAPcode=`#Volume Weighted Average Price (VWAP)\n\ndef vwap(prices, volumes):\n    \"\"\"\n    Calculate the Volume Weighted Average Price (VWAP) of a price series.\n\n    Parameters:\n    prices (list or np.array): A list or array of price values.\n    volumes (list or np.array): A list or array of volume values corresponding to the prices.\n\n    Returns:\n    np.array: An array of the VWAP values.\n    \"\"\"\n    cumulative_volume = np.cumsum(volumes)\n    cumulative_price_volume = np.cumsum(prices * volumes)\n\n    vwap_values = cumulative_price_volume / cumulative_volume\n    return vwap_values`;

  const getIndicatorCode = (name) => {
    const codeSnippets = {
      'Moving Average': MAcode,
      'Relative Strength Index': RSIcode,
      'MACD': MACDcode,
      'Bollinger Bands': BollingerCode,
      'Average Directional Index': ADXcode,
      'Donchian Channel': DonchianCode,
      'Average True Range': ATRcode,
      'SuperTrend': SuperTrendcode,
      'VWAP': VWAPcode
    };

      return codeSnippets[name] || '# Code snippet not available';
    };

  const getCategoryColor = (category) => {
    const colors = {
      'Trend': 'bg-blue-500/10 text-blue-500',
      'Breakout': 'bg-emerald-500/10 text-emerald-500',
      'Volatility': 'bg-purple-500/10 text-purple-500',
      'Momentum': 'bg-orange-500/10 text-orange-500',
      'Participation': 'bg-cyan-500/10 text-cyan-500',
      'Trend Strength': 'bg-pink-500/10 text-pink-500',
      'Momentum Expansion': 'bg-amber-500/10 text-amber-500',
      'Institutional Benchmark': 'bg-indigo-500/10 text-indigo-500'
    };
    return colors[category] || 'bg-gray-500/10 text-gray-500';
  };

  return (
    <div className="space-y-6" data-testid="indicators-page">
      <div>
        <h1 className="text-3xl font-bold font-['Rajdhani']">Technical Indicators Encyclopedia</h1>
        <p className="text-muted-foreground">Learn about all supported indicators, their formulas, and usage</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {Object.entries(indicators).map(([key, indicator]) => (
          <Card key={key}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle>{indicator.name}</CardTitle>
                    <Badge className={getCategoryColor(indicator.category)}>
                      {indicator.category}
                    </Badge>
                  </div>
                  <CardDescription>{indicator.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="formula" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="formula">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Formula
                  </TabsTrigger>
                  <TabsTrigger value="parameters">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Parameters
                  </TabsTrigger>
                  <TabsTrigger value="code">
                    <Code2 className="w-4 h-4 mr-2" />
                    Python Code
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="formula" className="space-y-3">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="font-mono text-sm">{indicator.formula}</div>
                  </div>
                </TabsContent>

                <TabsContent value="parameters" className="space-y-3">
                  {Object.keys(indicator.parameters).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(indicator.parameters).map(([paramName, paramDetails]) => (
                        <div key={paramName} className="p-3 border border-border rounded-lg">
                          <div className="font-semibold mb-1 capitalize">{paramName.replace('_', ' ')}</div>
                          <div className="text-sm text-muted-foreground">
                            Type: <span className="font-mono">{paramDetails.type}</span>
                          </div>
                          {paramDetails.default && (
                            <div className="text-sm text-muted-foreground">
                              Default: <span className="font-semibold">{paramDetails.default}</span>
                            </div>
                          )}
                          {paramDetails.range && (
                            <div className="text-sm text-muted-foreground">
                              Range: [{paramDetails.range.join(', ')}]
                            </div>
                          )}
                          {paramDetails.options && (
                            <div className="text-sm text-muted-foreground">
                              Options: {paramDetails.options.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No configurable parameters</div>
                  )}
                </TabsContent>

                <TabsContent value="code" className="space-y-3">
                  <div className="p-4 bg-muted rounded-lg">
                    <pre className="text-sm font-mono overflow-x-auto">
                    <code className="w-4 h-4 mr-2">
                    {getIndicatorCode(indicator.name)}
                    </code>

                      
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default IndicatorsPage;
