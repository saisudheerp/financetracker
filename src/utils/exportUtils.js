/**
 * Export Utilities for Finance Tracker
 * Convert transactions to CSV format for download
 */

import { formatINR, formatDate } from "./currencyUtils";

/**
 * Convert transactions to CSV format
 * @param {Array} transactions - Array of transaction objects
 * @returns {string} CSV formatted string
 */
export const convertToCSV = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return "";
  }

  // Helper function to format date for CSV (Excel-friendly format)
  const formatDateForCSV = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`; // DD-MM-YYYY format
  };

  // CSV Headers
  const headers = [
    "Date",
    "Type",
    "Category",
    "Description",
    "Payment Method",
    "Amount (₹)",
    "Amount (Number)",
  ];

  // Create CSV rows
  const rows = transactions.map((transaction) => {
    const categoryName =
      transaction.categories?.name || transaction.category || "Uncategorized";

    return [
      formatDateForCSV(transaction.transaction_date),
      transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
      categoryName,
      transaction.description || "-",
      transaction.payment_method || "N/A",
      formatINR(transaction.amount),
      transaction.amount,
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape commas and quotes in cell content
          const cellStr = String(cell);
          if (
            cellStr.includes(",") ||
            cellStr.includes('"') ||
            cellStr.includes("\n")
          ) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(",")
    ),
  ].join("\n");

  return csvContent;
};

/**
 * Download CSV file
 * @param {string} csvContent - CSV formatted string
 * @param {string} filename - Name of the file to download
 */
export const downloadCSV = (csvContent, filename = "transactions.csv") => {
  if (!csvContent) {
    console.error("No CSV content to download");
    return;
  }

  // Create blob with UTF-8 BOM for Excel compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  // Create download link
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
};

/**
 * Export transactions for a specific month
 * @param {Array} transactions - All transactions
 * @param {number} month - Month (0-11)
 * @param {number} year - Year
 */
export const exportMonthlyTransactions = (transactions, month, year) => {
  const monthNames = [
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

  // Filter transactions for the specific month
  const monthlyTransactions = transactions.filter((t) => {
    const date = new Date(t.transaction_date);
    return date.getMonth() === month && date.getFullYear() === year;
  });

  if (monthlyTransactions.length === 0) {
    alert(`No transactions found for ${monthNames[month]} ${year}`);
    return;
  }

  const csv = convertToCSV(monthlyTransactions);
  const filename = `transactions_${monthNames[month]}_${year}.csv`;
  downloadCSV(csv, filename);
};

/**
 * Export transactions for a date range
 * @param {Array} transactions - All transactions
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 */
export const exportDateRangeTransactions = (
  transactions,
  startDate,
  endDate
) => {
  if (!startDate || !endDate) {
    alert("Please select both start and end dates");
    return;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Set time to end of day for end date
  end.setHours(23, 59, 59, 999);

  // Filter transactions within date range
  const rangeTransactions = transactions.filter((t) => {
    const date = new Date(t.transaction_date);
    return date >= start && date <= end;
  });

  if (rangeTransactions.length === 0) {
    alert(
      `No transactions found between ${formatDate(startDate)} and ${formatDate(
        endDate
      )}`
    );
    return;
  }

  const csv = convertToCSV(rangeTransactions);
  const filename = `transactions_${startDate}_to_${endDate}.csv`;
  downloadCSV(csv, filename);
};

/**
 * Export all transactions
 * @param {Array} transactions - All transactions
 */
export const exportAllTransactions = (transactions) => {
  if (!transactions || transactions.length === 0) {
    alert("No transactions to export");
    return;
  }

  const csv = convertToCSV(transactions);
  const today = new Date().toISOString().split("T")[0];
  const filename = `all_transactions_${today}.csv`;
  downloadCSV(csv, filename);
};

/**
 * Export transactions by type (income/expense)
 * @param {Array} transactions - All transactions
 * @param {string} type - 'income' or 'expense'
 */
export const exportByType = (transactions, type) => {
  const filtered = transactions.filter((t) => t.type === type);

  if (filtered.length === 0) {
    alert(`No ${type} transactions found`);
    return;
  }

  const csv = convertToCSV(filtered);
  const today = new Date().toISOString().split("T")[0];
  const filename = `${type}_transactions_${today}.csv`;
  downloadCSV(csv, filename);
};

/**
 * Calculate summary statistics for CSV export
 * @param {Array} transactions - Transactions to summarize
 * @returns {object} Summary statistics
 */
export const getExportSummary = (transactions) => {
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  return {
    totalTransactions: transactions.length,
    totalIncome: income,
    totalExpenses: expenses,
    netBalance: income - expenses,
    dateRange:
      transactions.length > 0
        ? {
            start: transactions[transactions.length - 1].transaction_date,
            end: transactions[0].transaction_date,
          }
        : null,
  };
};
