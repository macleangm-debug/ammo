// Number formatting utilities

/**
 * Format a number with commas for thousands
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US');
};

/**
 * Format a number as currency
 * @param {number} num - Number to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (num, currency = 'USD') => {
  if (num === null || num === undefined) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

/**
 * Format a number as currency with decimals
 * @param {number} num - Number to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string with decimals
 */
export const formatCurrencyDecimal = (num, currency = 'USD') => {
  if (num === null || num === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

/**
 * Format a number as percentage
 * @param {number} num - Number to format (0-100)
 * @param {number} decimals - Decimal places (default: 0)
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (num, decimals = 0) => {
  if (num === null || num === undefined) return '0%';
  return `${num.toFixed(decimals)}%`;
};

/**
 * Format a large number with K/M/B suffix
 * @param {number} num - Number to format
 * @returns {string} Formatted number with suffix
 */
export const formatCompact = (num) => {
  if (num === null || num === undefined) return '0';
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

/**
 * Format a number with +/- sign for trends
 * @param {number} num - Number to format
 * @param {boolean} asPercentage - Format as percentage
 * @returns {string} Formatted trend string
 */
export const formatTrend = (num, asPercentage = true) => {
  if (num === null || num === undefined) return '0%';
  const sign = num >= 0 ? '+' : '';
  return asPercentage ? `${sign}${num.toFixed(1)}%` : `${sign}${formatNumber(num)}`;
};

export default {
  formatNumber,
  formatCurrency,
  formatCurrencyDecimal,
  formatPercentage,
  formatCompact,
  formatTrend
};
