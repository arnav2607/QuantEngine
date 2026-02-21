import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Code2, TrendingUp } from 'lucide-react';

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
                      <code>{`# ${indicator.name} Implementation\n# Using pandas and numpy\n\nimport pandas as pd\nimport numpy as np\n\n# Example calculation (vectorized)\n# See backend/services/indicators.py for full implementation`}</code>
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
