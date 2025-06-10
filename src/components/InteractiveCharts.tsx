import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  ButtonGroup,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  IconButton
} from '@mui/material';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  ShowChart
} from '@mui/icons-material';
import { interactiveChartsService } from '../services/interactiveCharts';
import { ChartData } from '../types';

interface InteractiveChartsProps {
  coinId: string;
  coinSymbol: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`chart-tabpanel-${index}`}
      aria-labelledby={`chart-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const InteractiveCharts: React.FC<InteractiveChartsProps> = ({ coinId, coinSymbol }) => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '1d' | '1w' | '1M'>('1d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [showVolume, setShowVolume] = useState(true);
  const [showFibonacci, setShowFibonacci] = useState(false);
  const [showSupportResistance, setShowSupportResistance] = useState(true);
  const [showPatterns, setShowPatterns] = useState(true);

  useEffect(() => {
    loadChartData();
  }, [coinId, timeframe]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadChartData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await interactiveChartsService.getChartData(coinId, timeframe);
      if (data) {
        setChartData(data);
      } else {
        setError('Failed to load chart data');
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
      setError('An error occurred while loading chart data');
    } finally {
      setLoading(false);
    }
  };

  const formatCandlestickData = () => {
    if (!chartData?.candlestick_data) return [];

    return chartData.candlestick_data.map(candle => ({
      timestamp: new Date(candle.timestamp).getTime(),
      date: new Date(candle.timestamp).toLocaleDateString(),
      time: new Date(candle.timestamp).toLocaleTimeString(),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      color: candle.close >= candle.open ? '#4CAF50' : '#F44336'
    }));
  };

  const formatVolumeProfileData = () => {
    if (!chartData?.volume_profile) return [];

    return chartData.volume_profile.map(vp => ({
      price: vp.price_level,
      volume: vp.total_volume,
      buyVolume: vp.buy_volume,
      sellVolume: vp.sell_volume,
      percentage: vp.volume_percentage
    }));
  };

  const getTimeframeLabel = (tf: string): string => {
    const labels = {
      '1h': '1 Hour',
      '4h': '4 Hours',
      '1d': '1 Day',
      '1w': '1 Week',
      '1M': '1 Month'
    };
    return labels[tf as keyof typeof labels] || tf;
  };

  const getFibonacciColor = (ratio: number): string => {
    const colors = {
      0: '#FF0000',      // 0% - Red
      0.236: '#FF8C00',  // 23.6% - Orange
      0.382: '#FFD700',  // 38.2% - Gold
      0.5: '#00FF00',    // 50% - Green
      0.618: '#00CED1',  // 61.8% - Turquoise
      0.786: '#9370DB',  // 78.6% - Purple
      1: '#FF1493'       // 100% - Pink
    };
    return colors[ratio as keyof typeof colors] || '#888888';
  };

  return (
    <Box sx={{ maxWidth: 1400, margin: '0 auto', padding: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          {coinSymbol.toUpperCase()} Interactive Charts
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ButtonGroup variant="outlined" size="small">
            {(['1h', '4h', '1d', '1w', '1M'] as const).map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? 'contained' : 'outlined'}
                onClick={() => setTimeframe(tf)}
              >
                {getTimeframeLabel(tf)}
              </Button>
            ))}
          </ButtonGroup>
          
          <IconButton onClick={loadChartData} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : <ShowChart />}
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {chartData && (
        <Card>
          <CardContent>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                <Tab label="Price Chart" />
                <Tab label="Volume Profile" />
                <Tab label="Technical Levels" />
                <Tab label="Chart Patterns" />
              </Tabs>
            </Box>

            {/* Chart Controls */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showVolume}
                        onChange={(e) => setShowVolume(e.target.checked)}
                      />
                    }
                    label="Volume"
                  />
                </Grid>
                <Grid item>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showFibonacci}
                        onChange={(e) => setShowFibonacci(e.target.checked)}
                      />
                    }
                    label="Fibonacci"
                  />
                </Grid>
                <Grid item>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showSupportResistance}
                        onChange={(e) => setShowSupportResistance(e.target.checked)}
                      />
                    }
                    label="Support/Resistance"
                  />
                </Grid>
                <Grid item>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showPatterns}
                        onChange={(e) => setShowPatterns(e.target.checked)}
                      />
                    }
                    label="Patterns"
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Price Chart Tab */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ height: 600 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={formatCandlestickData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="price"
                      domain={['dataMin - 5', 'dataMax + 5']}
                      tick={{ fontSize: 12 }}
                    />
                    {showVolume && (
                      <YAxis 
                        yAxisId="volume"
                        orientation="right"
                        tick={{ fontSize: 12 }}
                      />
                    )}
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <Paper sx={{ p: 2 }}>
                              <Typography variant="subtitle2">{label}</Typography>
                              <Typography variant="body2">Open: ${data.open?.toFixed(4)}</Typography>
                              <Typography variant="body2">High: ${data.high?.toFixed(4)}</Typography>
                              <Typography variant="body2">Low: ${data.low?.toFixed(4)}</Typography>
                              <Typography variant="body2">Close: ${data.close?.toFixed(4)}</Typography>
                              {showVolume && (
                                <Typography variant="body2">Volume: {data.volume?.toLocaleString()}</Typography>
                              )}
                            </Paper>
                          );
                        }
                        return null;
                      }}
                    />
                    
                    {/* Candlestick representation using Line charts */}
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="high"
                      stroke="transparent"
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="low"
                      stroke="transparent"
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="close"
                      stroke="#2196F3"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />

                    {/* Volume bars */}
                    {showVolume && (
                      <Bar
                        yAxisId="volume"
                        dataKey="volume"
                        fill="#E3F2FD"
                        opacity={0.6}
                      />
                    )}

                    {/* Fibonacci Levels */}
                    {showFibonacci && chartData.fibonacci_levels?.map((fib, index) => (
                      <ReferenceLine
                        key={index}
                        yAxisId="price"
                        y={fib.level}
                        stroke={getFibonacciColor(fib.ratio)}
                        strokeDasharray="5 5"
                        label={`${(fib.ratio * 100).toFixed(1)}%`}
                      />
                    ))}

                    {/* Support/Resistance Levels */}
                    {showSupportResistance && chartData.support_resistance?.map((level, index) => (
                      <ReferenceLine
                        key={index}
                        yAxisId="price"
                        y={level.level}
                        stroke={level.type === 'support' ? '#4CAF50' : '#F44336'}
                        strokeWidth={2}
                        label={level.type}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </TabPanel>

            {/* Volume Profile Tab */}
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Typography variant="h6" gutterBottom>
                    Volume Profile
                  </Typography>
                  <Box sx={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        layout="horizontal"
                        data={formatVolumeProfileData()}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="price" />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <Paper sx={{ p: 2 }}>
                                  <Typography variant="subtitle2">
                                    Price: ${data.price?.toFixed(4)}
                                  </Typography>
                                  <Typography variant="body2" color="success.main">
                                    Buy Volume: {data.buyVolume?.toLocaleString()}
                                  </Typography>
                                  <Typography variant="body2" color="error.main">
                                    Sell Volume: {data.sellVolume?.toLocaleString()}
                                  </Typography>
                                  <Typography variant="body2">
                                    Total: {data.volume?.toLocaleString()} ({data.percentage?.toFixed(1)}%)
                                  </Typography>
                                </Paper>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="buyVolume" stackId="volume" fill="#4CAF50" />
                        <Bar dataKey="sellVolume" stackId="volume" fill="#F44336" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="h6" gutterBottom>
                    Volume Analysis
                  </Typography>
                  <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Price Level</TableCell>
                          <TableCell align="right">Volume %</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {formatVolumeProfileData()
                          .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
                          .slice(0, 10)
                          .map((vp, index) => (
                            <TableRow key={index}>
                              <TableCell>${vp.price?.toFixed(4) || 'N/A'}</TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box
                                    sx={{
                                      width: `${(vp.percentage || 0) * 2}px`,
                                      height: 8,
                                      backgroundColor: 'primary.main',
                                      borderRadius: 1
                                    }}
                                  />
                                                                      {vp.percentage?.toFixed(1) || '0'}%
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Technical Levels Tab */}
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Fibonacci Retracement Levels
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Level</TableCell>
                          <TableCell>Price</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell align="right">Strength</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {chartData.fibonacci_levels?.map((fib, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    backgroundColor: getFibonacciColor(fib.ratio),
                                    borderRadius: '50%'
                                  }}
                                />
                                {(fib.ratio * 100).toFixed(1)}%
                              </Box>
                            </TableCell>
                            <TableCell>${fib.level.toFixed(4)}</TableCell>
                            <TableCell>
                              <Chip
                                label={fib.type}
                                size="small"
                                color={fib.type === 'support' ? 'success' : 
                                       fib.type === 'resistance' ? 'error' : 'default'}
                              />
                            </TableCell>
                            <TableCell align="right">{fib.strength}/100</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Support & Resistance Levels
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Price</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell align="right">Touches</TableCell>
                          <TableCell align="right">Strength</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {chartData.support_resistance
                          ?.sort((a, b) => (b.strength || 0) - (a.strength || 0))
                          .slice(0, 10)
                          .map((level, index) => (
                            <TableRow key={index}>
                              <TableCell>${level.level?.toFixed(4) || 'N/A'}</TableCell>
                              <TableCell>
                                <Chip
                                  label={level.type}
                                  size="small"
                                  color={level.type === 'support' ? 'success' : 'error'}
                                />
                              </TableCell>
                              <TableCell align="right">{level.touches}</TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box
                                    sx={{
                                      width: `${level.strength}%`,
                                      maxWidth: 50,
                                      height: 6,
                                      backgroundColor: level.type === 'support' ? 'success.main' : 'error.main',
                                      borderRadius: 1
                                    }}
                                  />
                                  {level.strength}
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Chart Patterns Tab */}
            <TabPanel value={tabValue} index={3}>
              <Typography variant="h6" gutterBottom>
                Detected Chart Patterns
              </Typography>
              
              {(chartData.chart_patterns?.length || 0) === 0 ? (
                <Alert severity="info">
                  No chart patterns detected in the current timeframe. Try switching to a different timeframe for pattern analysis.
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {chartData.chart_patterns?.map((pattern, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                              {pattern.type?.replace(/_/g, ' ') || 'Unknown Pattern'}
                            </Typography>
                            <Chip
                              label={`${pattern.confidence}% confidence`}
                              color={pattern.confidence > 70 ? 'success' : pattern.confidence > 50 ? 'warning' : 'default'}
                              size="small"
                            />
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {pattern.description}
                          </Typography>
                          
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Target Price
                              </Typography>
                              <Typography variant="body1" fontWeight="bold">
                                ${pattern.target_price?.toFixed(4) || 'N/A'}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Key Levels
                              </Typography>
                              <Box>
                                {pattern.key_levels?.slice(0, 2).map((level, i) => (
                                  <Typography key={i} variant="body2">
                                    ${level.toFixed(4)}
                                  </Typography>
                                ))}
                              </Box>
                            </Grid>
                          </Grid>
                          
                          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                            <Chip
                              size="small"
                              label={new Date(pattern.start_time).toLocaleDateString()}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              label={new Date(pattern.end_time).toLocaleDateString()}
                              variant="outlined"
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </TabPanel>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default InteractiveCharts; 