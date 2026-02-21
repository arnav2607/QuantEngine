import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Activity, Target, BarChart3, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalStrategies: 0,
    popularStocks: [],
    templates: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [strategiesRes, stocksRes, templatesRes] = await Promise.all([
        axios.get(`${API}/strategies`),
        axios.get(`${API}/stocks/popular`),
        axios.get(`${API}/strategies/templates`)
      ]);

      setStats({
        totalStrategies: strategiesRes.data.length,
        popularStocks: stocksRes.data.slice(0, 6),
        templates: templatesRes.data
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const features = [
    {
      icon: Activity,
      title: 'Strategy Builder',
      description: 'Create no-code trading strategies with 10+ technical indicators',
      color: 'from-blue-500 to-cyan-500',
      link: '/builder'
    },
    {
      icon: BarChart3,
      title: 'Backtesting Engine',
      description: 'Test your strategies with historical data and performance metrics',
      color: 'from-emerald-500 to-teal-500',
      link: '/builder'
    },
    {
      icon: Target,
      title: 'Stock Screener',
      description: 'Find opportunities with advanced filtering and technical scans',
      color: 'from-purple-500 to-pink-500',
      link: '/screener'
    },
    {
      icon: TrendingUp,
      title: 'Live Analytics',
      description: 'Real-time charts with indicator overlays and signal detection',
      color: 'from-orange-500 to-red-500',
      link: '/indicators'
    }
  ];

  return (
    <div className="space-y-8" data-testid="dashboard">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-emerald-600 p-8 text-white">
        <div className="relative z-10">
          <h1 className="text-4xl sm:text-5xl font-bold font-['Rajdhani'] mb-4">
            Welcome to QuantEdge
          </h1>
          <p className="text-lg text-blue-100 mb-6 max-w-2xl">
            Professional strategy backtester and stock screener for Indian markets (NSE/BSE).
            Build, test, and optimize your trading strategies without writing code.
          </p>
          <div className="flex gap-4">
            <Link to="/builder">
              <Button size="lg" variant="secondary" data-testid="create-strategy-btn">
                Create Strategy <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link to="/screener">
              <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/10" data-testid="screen-stocks-btn">
                Screen Stocks
              </Button>
            </Link>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Strategies</CardDescription>
            <CardTitle className="text-3xl font-['JetBrains_Mono']">{stats.totalStrategies}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Saved strategies ready to backtest</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Available Stocks</CardDescription>
            <CardTitle className="text-3xl font-['JetBrains_Mono']">20+</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">NSE & BSE top stocks + indices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Indicators</CardDescription>
            <CardTitle className="text-3xl font-['JetBrains_Mono']">10</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Technical indicators with full customization</p>
          </CardContent>
        </Card>
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="text-2xl font-bold font-['Rajdhani'] mb-6">Platform Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Link key={idx} to={feature.link}>
                <Card className="group hover:shadow-lg transition-all cursor-pointer h-full">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Popular Stocks */}
      <Card>
        <CardHeader>
          <CardTitle>Popular NSE Stocks</CardTitle>
          <CardDescription>Top Indian stocks available for backtesting</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.popularStocks.map((stock, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-border hover:bg-accent transition-colors">
                <div className="font-mono text-sm text-blue-500 mb-1">{stock.symbol}</div>
                <div className="text-sm text-muted-foreground">{stock.name}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strategy Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Famous Strategy Templates</CardTitle>
          <CardDescription>7 pre-built strategies ready to backtest</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.templates.map((template, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-semibold text-blue-500">{template.name}</div>
                  <span className="px-2 py-1 bg-purple-500/10 text-purple-500 text-xs rounded-md">
                    {template.category}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mb-2">{template.description}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{template.timeframe}</span>
                  <span>•</span>
                  <span>{template.entry_rules.conditions.length} entry conditions</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
