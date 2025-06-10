import React, { useState } from 'react';
import { Box, Button, Typography, Alert, Card, CardContent } from '@mui/material';
import { coinGeckoApi } from '../services/api';

const ApiTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    setTestResult('');
    
    try {
      // Test basic ping
      console.log('Testing API ping...');
      const pingResult = await coinGeckoApi.ping();
      console.log('Ping result:', pingResult);
      
      // Test getting coins
      console.log('Testing get coins...');
      const coinsResult = await coinGeckoApi.getCoins('usd', 'market_cap_desc', 10, 1);
      console.log('Coins result:', coinsResult);
      
      setTestResult(`✅ API is working! Retrieved ${coinsResult.length} coins.`);
    } catch (error: any) {
      console.error('API test failed:', error);
      setTestResult(`❌ API test failed: ${error.message || error.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const testDirectFetch = async () => {
    setLoading(true);
    setTestResult('');
    
    try {
      console.log('Testing direct fetch...');
      const response = await fetch('https://api.coingecko.com/api/v3/ping');
      const data = await response.json();
      console.log('Direct fetch result:', data);
      setTestResult(`✅ Direct fetch works! Response: ${JSON.stringify(data)}`);
    } catch (error: any) {
      console.error('Direct fetch failed:', error);
      setTestResult(`❌ Direct fetch failed: ${error.message || error.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ m: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          API Connectivity Test
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button 
            variant="contained" 
            onClick={testApi} 
            disabled={loading}
          >
            Test CoinGecko API
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={testDirectFetch} 
            disabled={loading}
          >
            Test Direct Fetch
          </Button>
        </Box>
        
        {loading && (
          <Typography>Testing...</Typography>
        )}
        
        {testResult && (
          <Alert severity={testResult.includes('✅') ? 'success' : 'error'}>
            {testResult}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiTest; 