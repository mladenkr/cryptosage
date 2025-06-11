import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { ThemeProvider } from './contexts/ThemeContext';
import { useTheme } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CoinDetailPage from './components/CoinDetailPage';
import AIRecommendations from './components/AIRecommendations';
import InteractiveCharts from './components/InteractiveCharts';
import SimpleTest from './components/SimpleTest';

// App content component that uses the theme
const AppContent: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Header />
          <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/test" element={<SimpleTest />} />
              <Route path="/coin/:id" element={<CoinDetailPage />} />
              <Route path="/ai-recommendations" element={<AIRecommendations />} />
              <Route path="/charts/:coinId/:coinSymbol" element={<InteractiveChartsWrapper />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </MuiThemeProvider>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// Wrapper component to extract URL parameters for InteractiveCharts
const InteractiveChartsWrapper: React.FC = () => {
  const { coinId, coinSymbol } = useParams<{ coinId: string; coinSymbol: string }>();
  
  if (!coinId || !coinSymbol) {
    return <Navigate to="/" replace />;
  }
  
  return <InteractiveCharts coinId={coinId} coinSymbol={coinSymbol} />;
};

export default App; 