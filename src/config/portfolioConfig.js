// Portfolio Tracker Configuration
// Add your API keys here

export const PORTFOLIO_CONFIG = {
  // Yahoo Finance API (via RapidAPI or direct scraping)
  YAHOO_FINANCE_API_KEY: "", // Optional - for premium features

  // Mutual Fund API - India
  // Using free MFAPI (https://www.mfapi.in/)
  MUTUAL_FUND_API_BASE: "https://api.mfapi.in/mf",

  // Alternative MF API (if above doesn't work)
  // NAV India API
  NAV_INDIA_API:
    "https://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx",

  // Stock exchanges
  EXCHANGES: {
    NSE: ".NS", // National Stock Exchange
    BSE: ".BO", // Bombay Stock Exchange
  },

  // Alert thresholds
  PRICE_CHANGE_ALERT_THRESHOLD: 5, // Alert if price changes by ±5%

  // Data refresh intervals (in milliseconds)
  STOCK_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  MF_REFRESH_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours (MF NAV updates once daily)

  // Chart settings
  CHART_COLORS: {
    primary: "#14b8a6", // Teal
    secondary: "#06b6d4", // Cyan
    success: "#10b981", // Green
    danger: "#ef4444", // Red
    warning: "#f59e0b", // Amber
    info: "#3b82f6", // Blue
  },

  // Sector colors for pie chart
  SECTOR_COLORS: [
    "#14b8a6", // Teal
    "#06b6d4", // Cyan
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#f59e0b", // Amber
    "#10b981", // Green
    "#3b82f6", // Blue
    "#ef4444", // Red
    "#6366f1", // Indigo
    "#84cc16", // Lime
  ],

  // Popular Indian stocks for autocomplete
  POPULAR_STOCKS: [
    {
      symbol: "RELIANCE.NS",
      name: "Reliance Industries Ltd",
      sector: "Energy",
    },
    { symbol: "TCS.NS", name: "Tata Consultancy Services Ltd", sector: "IT" },
    { symbol: "HDFCBANK.NS", name: "HDFC Bank Ltd", sector: "Banking" },
    { symbol: "INFY.NS", name: "Infosys Ltd", sector: "IT" },
    { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever Ltd", sector: "FMCG" },
    { symbol: "ICICIBANK.NS", name: "ICICI Bank Ltd", sector: "Banking" },
    { symbol: "SBIN.NS", name: "State Bank of India", sector: "Banking" },
    { symbol: "BHARTIARTL.NS", name: "Bharti Airtel Ltd", sector: "Telecom" },
    { symbol: "ITC.NS", name: "ITC Ltd", sector: "FMCG" },
    { symbol: "WIPRO.NS", name: "Wipro Ltd", sector: "IT" },
    { symbol: "AXISBANK.NS", name: "Axis Bank Ltd", sector: "Banking" },
    { symbol: "LT.NS", name: "Larsen & Toubro Ltd", sector: "Infrastructure" },
    { symbol: "ASIANPAINT.NS", name: "Asian Paints Ltd", sector: "Paint" },
    {
      symbol: "MARUTI.NS",
      name: "Maruti Suzuki India Ltd",
      sector: "Automobile",
    },
    { symbol: "TATAMOTORS.NS", name: "Tata Motors Ltd", sector: "Automobile" },
  ],

  // CSV export settings
  CSV_HEADERS: [
    "Asset Type",
    "Symbol",
    "Name",
    "Quantity",
    "Purchase Price",
    "Purchase Date",
    "Sector",
    "Exchange",
  ],
};

export default PORTFOLIO_CONFIG;
