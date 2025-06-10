// Format currency values
export const formatCurrency = (
  value: number,
  currency: string = 'USD',
  minimumFractionDigits: number = 2,
  maximumFractionDigits: number = 8
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0.00';
  }

  // For very small values, show more decimal places
  if (Math.abs(value) < 0.01 && value !== 0) {
    maximumFractionDigits = 8;
    minimumFractionDigits = 2;
  } else if (Math.abs(value) < 1 && value !== 0) {
    maximumFractionDigits = 6;
    minimumFractionDigits = 2;
  } else if (Math.abs(value) >= 1000000) {
    // For large values, use compact notation
    return formatCompactCurrency(value, currency);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
};

// Format large numbers in compact form (1.2M, 1.5B, etc.)
export const formatCompactCurrency = (value: number, currency: string = 'USD'): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
};

// Format percentage values
export const formatPercentage = (value: number, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00%';
  }

  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

// Format large numbers without currency
export const formatNumber = (value: number): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  if (Math.abs(value) >= 1000000000) {
    return (value / 1000000000).toFixed(2) + 'B';
  } else if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M';
  } else if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(2) + 'K';
  }

  return value.toLocaleString();
};

// Format market cap rank
export const formatRank = (rank: number): string => {
  if (!rank) return 'N/A';
  return `#${rank}`;
};

// Get color for percentage change
export const getPercentageColor = (percentage: number): string => {
  if (percentage > 0) return '#00A532'; // Green for positive
  if (percentage < 0) return '#BA1A1A'; // Red for negative
  return '#79747E'; // Neutral gray for zero
};

// Format date
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Truncate text with ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}; 