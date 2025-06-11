import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  useTheme,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import MarketOverview from './MarketOverview';
import CoinCard from './CoinCard';
import { Coin, GlobalData } from '../types';
import { coinGeckoApi } from '../services/api';

const MarketPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [globalData, setGlobalData] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('market_cap_desc');
  const [searchQuery] = useState('');
  const [filteredCoins, setFilteredCoins] = useState<Coin[]>([]);

  const coinsPerPage = 20;

  useEffect(() => {
    fetchData();
  }, [page, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Filter coins based on search query
    if (searchQuery.trim()) {
      const filtered = coins.filter(
        (coin) =>
          coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCoins(filtered);
    } else {
      setFilteredCoins(coins);
    }
  }, [coins, searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [coinsData, globalDataResponse] = await Promise.all([
        coinGeckoApi.getCoins('usd', sortBy, coinsPerPage, page),
        coinGeckoApi.getGlobalData(),
      ]);

      setCoins(coinsData);
      setGlobalData(globalDataResponse);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      
      let errorMessage = 'Failed to fetch cryptocurrency data. Please try again later.';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'CoinGecko server error. Please try again in a few minutes.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Removed unused handleSearch function

  const handleSortChange = (event: SelectChangeEvent) => {
    setSortBy(event.target.value);
    setPage(1); // Reset to first page when sorting changes
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCoinClick = (coin: Coin) => {
    navigate(`/coin/${coin.id}`);
  };

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchData}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page Title */}
      <Typography
        variant="h4"
        component="h1"
        sx={{
          fontWeight: 700,
          mb: 4,
          color: theme.palette.text.primary,
        }}
      >
        Cryptocurrency Market
      </Typography>

      {/* Market Overview */}
      <MarketOverview globalData={globalData} loading={loading} />

      {/* Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography
          variant="h5"
          component="h2"
          sx={{
            fontWeight: 600,
            color: theme.palette.text.primary,
          }}
        >
          {searchQuery ? `Search Results for "${searchQuery}"` : 'Top Cryptocurrencies'}
        </Typography>
        
        {!searchQuery && (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={handleSortChange}
            >
              <MenuItem value="market_cap_desc">Market Cap (High to Low)</MenuItem>
              <MenuItem value="market_cap_asc">Market Cap (Low to High)</MenuItem>
              <MenuItem value="volume_desc">Volume (High to Low)</MenuItem>
              <MenuItem value="volume_asc">Volume (Low to High)</MenuItem>
              <MenuItem value="price_desc">Price (High to Low)</MenuItem>
              <MenuItem value="price_asc">Price (Low to High)</MenuItem>
              <MenuItem value="percent_change_desc">% Change (High to Low)</MenuItem>
              <MenuItem value="percent_change_asc">% Change (Low to High)</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      )}

      {/* Coins Grid */}
      {!loading && (
        <>
          <Grid container spacing={3}>
            {filteredCoins.map((coin) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={coin.id}>
                <CoinCard coin={coin} onClick={handleCoinClick} />
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {!searchQuery && filteredCoins.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={Math.ceil(1000 / coinsPerPage)} // CoinGecko has ~1000 coins in free tier
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}

          {/* No Results */}
          {searchQuery && filteredCoins.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No cryptocurrencies found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search terms
              </Typography>
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default MarketPage; 