import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Box } from '@mui/material';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: string;
}

const Sparkline: React.FC<SparklineProps> = ({ 
  data, 
  color = '#4CAF50', 
  height = 40,
  width = '100%' 
}) => {
  // Return null if no data
  if (!data || data.length === 0) {
    return null;
  }

  // Convert price array to chart data format
  const chartData = data.map((price, index) => ({
    index,
    price: price || 0,
  }));

  // Determine if trend is positive or negative
  const firstPrice = data[0] || 0;
  const lastPrice = data[data.length - 1] || 0;
  const isPositive = lastPrice >= firstPrice;
  
  // Use provided color or determine based on trend
  const lineColor = color === '#4CAF50' ? (isPositive ? '#4CAF50' : '#F44336') : color;

  return (
    <Box sx={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default Sparkline; 