/**
 * Currency Formatting Utilities
 * All amounts displayed in Indian Rupees (₹)
 */

/**
 * Format amount to Indian Rupees (₹) format
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatINR = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "₹0.00";
  }

  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Alias for backward compatibility
export const formatCurrency = formatINR;

/**
 * Format date to readable format
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return "";

  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Format date for input field (YYYY-MM-DD)
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDateForInput = (date) => {
  if (!date) return "";

  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toISOString().split("T")[0];
};

/**
 * Get month name from month number
 * @param {number} monthIndex - Month index (0-11)
 * @returns {string} Month name
 */
export const getMonthName = (monthIndex) => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[monthIndex];
};

/**
 * Get current month name
 * @returns {string} Current month name
 */
export const getCurrentMonth = () => {
  return new Date().toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

/**
 * Get previous month name
 * @returns {string} Previous month name
 */
export const getPreviousMonth = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

/**
 * Get start and end date of current month
 * @returns {object} Object with start and end dates
 */
export const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    start: formatDateForInput(start),
    end: formatDateForInput(end),
  };
};

/**
 * Get start and end date of previous month
 * @returns {object} Object with start and end dates
 */
export const getPreviousMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);

  return {
    start: formatDateForInput(start),
    end: formatDateForInput(end),
  };
};

/**
 * Calculate percentage change
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {object} Object with percentage and isIncrease flag
 */
export const calculatePercentageChange = (current, previous) => {
  if (previous === 0) {
    return { percentage: current > 0 ? 100 : 0, isIncrease: current > 0 };
  }

  const change = ((current - previous) / previous) * 100;
  return {
    percentage: Math.abs(change).toFixed(1),
    isIncrease: change > 0,
  };
};

/**
 * Parse INR string to number
 * @param {string} inrString - INR formatted string
 * @returns {number} Numeric value
 */
export const parseINR = (inrString) => {
  if (!inrString) return 0;
  return parseFloat(inrString.replace(/[₹,]/g, "")) || 0;
};

/**
 * Group transactions by category
 * @param {Array} transactions - Array of transactions
 * @returns {Array} Array of category totals
 */
export const groupByCategory = (transactions) => {
  const grouped = transactions.reduce((acc, transaction) => {
    const category = transaction.category;
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += parseFloat(transaction.amount);
    return acc;
  }, {});

  return Object.entries(grouped).map(([category, amount]) => ({
    category,
    amount,
  }));
};

/**
 * Get color for transaction type
 * @param {string} type - Transaction type (income/expense)
 * @returns {string} Tailwind color class
 */
export const getTransactionColor = (type) => {
  return type === "income" ? "text-green-600" : "text-red-600";
};

/**
 * Get background color for transaction type
 * @param {string} type - Transaction type (income/expense)
 * @returns {string} Tailwind background color class
 */
export const getTransactionBgColor = (type) => {
  return type === "income" ? "bg-green-50" : "bg-red-50";
};
