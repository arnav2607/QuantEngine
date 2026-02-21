import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from 'sonner';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import StrategyBuilder from '@/pages/StrategyBuilder';
import SavedStrategies from '@/pages/SavedStrategies';
import StockScreener from '@/pages/StockScreener';
import IndicatorsPage from '@/pages/IndicatorsPage';
import BacktestResults from '@/pages/BacktestResults';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/builder" element={<StrategyBuilder />} />
            <Route path="/strategies" element={<SavedStrategies />} />
            <Route path="/screener" element={<StockScreener />} />
            <Route path="/indicators" element={<IndicatorsPage />} />
            <Route path="/results" element={<BacktestResults />} />
          </Routes>
        </Layout>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
