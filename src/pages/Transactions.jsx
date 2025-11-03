import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { formatINR } from "../utils/currencyUtils";
import {
  exportMonthlyTransactions,
  exportDateRangeTransactions,
  exportAllTransactions,
  exportByType,
} from "../utils/exportUtils";
import AddTransactionModal from "../components/AddTransactionModal";
import AIAssistant from "../components/AIAssistant";
import Navbar from "../components/Navbar";
import { renderIcon } from "../utils/iconMapper.jsx";
import { FileText, Bot } from "lucide-react";

const Transactions = ({ onNavigate }) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [totalSavings, setTotalSavings] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    type: "all", // all, income, expense
    category: "all",
    dateFrom: "",
    dateTo: "",
    searchTerm: "",
  });

  const [categories, setCategories] = useState([]);

  // Export options
  const [exportOptions, setExportOptions] = useState({
    type: "all", // all, monthly, dateRange, income, expense
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchCategories();
      fetchSavings();
    }
  }, [user]);

  useEffect(() => {
    // Set up real-time subscriptions for transactions and savings
    const transactionsSubscription = supabase
      .channel("transactions_list_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Transaction change detected:", payload);
          fetchTransactions();
          fetchSavings(); // Update savings when transactions change
        }
      )
      .subscribe();

    const savingsSubscription = supabase
      .channel("savings_deposits_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "savings_deposits",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Savings deposit change detected:", payload);
          fetchSavings(); // Update savings when deposits change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transactionsSubscription);
      supabase.removeChannel(savingsSubscription);
    };
  }, [user]);

  useEffect(() => {
    applyFilters();
    fetchSavings(); // Recalculate savings when filters change
  }, [transactions, filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("transactions")
        .select("*, categories(*)")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchSavings = async () => {
    try {
      // Get date range based on filtered transactions
      if (filteredTransactions.length === 0) {
        setTotalSavings(0);
        return;
      }

      const dates = filteredTransactions.map(
        (t) => new Date(t.transaction_date)
      );
      const minDate = new Date(Math.min(...dates)).toISOString().split("T")[0];
      const maxDate = new Date(Math.max(...dates)).toISOString().split("T")[0];

      // Fetch savings deposits for the same date range
      const { data: depositsData, error } = await supabase
        .from("savings_deposits")
        .select("*")
        .eq("user_id", user.id)
        .gte("deposit_date", minDate)
        .lte("deposit_date", maxDate);

      if (error) {
        console.error("Error fetching savings:", error);
        setTotalSavings(0);
        return;
      }

      const savings =
        depositsData?.reduce(
          (sum, deposit) => sum + parseFloat(deposit.amount || 0),
          0
        ) || 0;

      setTotalSavings(savings);
    } catch (error) {
      console.error("Error calculating savings:", error);
      setTotalSavings(0);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Filter by type
    if (filters.type !== "all") {
      filtered = filtered.filter((t) => t.type === filters.type);
    }

    // Filter by category
    if (filters.category !== "all") {
      filtered = filtered.filter((t) => t.category_id === filters.category);
    }

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter(
        (t) => new Date(t.transaction_date) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(
        (t) => new Date(t.transaction_date) <= new Date(filters.dateTo)
      );
    }

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.description?.toLowerCase().includes(searchLower) ||
          t.categories?.name.toLowerCase().includes(searchLower) ||
          t.payment_method?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTransactions(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      type: "all",
      category: "all",
      dateFrom: "",
      dateTo: "",
      searchTerm: "",
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchTransactions();
      fetchSavings(); // Update savings after deletion
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Failed to delete transaction");
    }
  };

  const handleExport = () => {
    const { type, month, year, startDate, endDate } = exportOptions;

    switch (type) {
      case "all":
        exportAllTransactions(filteredTransactions);
        break;
      case "monthly":
        exportMonthlyTransactions(transactions, month, year);
        break;
      case "dateRange":
        exportDateRangeTransactions(transactions, startDate, endDate);
        break;
      case "income":
        exportByType(filteredTransactions, "income");
        break;
      case "expense":
        exportByType(filteredTransactions, "expense");
        break;
      default:
        exportAllTransactions(filteredTransactions);
    }

    setShowExportModal(false);
  };

  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  return (
    <div className="bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen">
      {/* Header */}
      <Navbar currentPage="transactions" onNavigate={onNavigate} />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 sm:pb-24">
        {/* Page Title & Stats */}
        <div className="mb-4 sm:mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-2xl sm:text-4xl font-bold text-teal-700 dark:text-white font-playfair">
              All Transactions
            </h2>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1 sm:gap-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-green-600 dark:hover:bg-green-700 text-white font-oswald px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg transition-colors shadow-lg"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 dark:from-green-500 dark:to-emerald-600 rounded-xl p-4 sm:p-6 text-white shadow-lg">
              <p className="text-xs sm:text-sm opacity-90 font-poppins mb-1">
                Total Income
              </p>
              <p className="text-2xl sm:text-3xl font-bold font-oswald">
                {formatINR(totalIncome)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-rose-400 to-pink-500 dark:from-red-500 dark:to-pink-600 rounded-xl p-4 sm:p-6 text-white shadow-lg">
              <p className="text-xs sm:text-sm opacity-90 font-poppins mb-1">
                Total Expenses
              </p>
              <p className="text-2xl sm:text-3xl font-bold font-oswald">
                {formatINR(totalExpenses)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-cyan-400 to-teal-500 dark:from-indigo-500 dark:to-purple-600 rounded-xl p-4 sm:p-6 text-white shadow-lg">
              <p className="text-xs sm:text-sm opacity-90 font-poppins mb-1">
                Net Balance
              </p>
              <p className="text-2xl sm:text-3xl font-bold font-oswald">
                {formatINR(totalIncome - totalExpenses - totalSavings)}
              </p>
              <p className="text-xs opacity-75 font-poppins mt-1">
                (After Savings: {formatINR(totalSavings)})
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-teal-700 dark:text-white font-playfair">
              Filters
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={clearFilters}
                className="text-xs sm:text-sm text-teal-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                {showFilters ? "Hide" : "Show"} Filters
              </button>
            </div>
          </div>

          {/* Search - Always Visible */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search transactions..."
                value={filters.searchTerm}
                onChange={(e) =>
                  handleFilterChange("searchTerm", e.target.value)
                }
                className="w-full px-4 py-2 pl-10 text-sm sm:text-base border border-teal-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:focus:ring-indigo-500 bg-white dark:bg-gray-700 text-teal-900 dark:text-white"
              />
              <svg
                className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Other Filters - Toggle on Filter Button Click */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
              {/* Type Filter */}
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>

              {/* Category Filter */}
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange("category", e.target.value)}
                className="px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>

              {/* Date From */}
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                placeholder="From Date"
                className="px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />

              {/* Date To */}
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                placeholder="To Date"
                className="px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}

          <p className="text-sm text-teal-600 dark:text-gray-400">
            Showing {filteredTransactions.length} of {transactions.length}{" "}
            transactions
          </p>
        </div>

        {/* Transactions List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-4 text-gray-600 dark:text-gray-400 font-poppins">
                No transactions found
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-oswald"
              >
                Add Your First Transaction
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {new Date(
                            transaction.transaction_date
                          ).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="inline-flex items-center gap-2">
                            {transaction.categories?.icon ? (
                              renderIcon(
                                transaction.categories.icon,
                                "w-6 h-6 text-gray-600 dark:text-gray-400"
                              )
                            ) : (
                              <FileText className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                            )}
                            <span className="text-gray-900 dark:text-gray-100 font-medium">
                              {transaction.categories?.name}
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                          {transaction.description || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {transaction.payment_method?.replace("_", " ")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              transaction.type === "income"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span
                            className={`text-sm font-bold ${
                              transaction.type === "income"
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {transaction.type === "income" ? "+" : "-"}
                            {formatINR(transaction.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleDelete(transaction.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-red-600 hover:text-white hover:bg-red-600 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white font-medium rounded-lg border border-red-600 dark:border-red-400 transition-all duration-200"
                            title="Delete transaction"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        {transaction.categories?.icon ? (
                          renderIcon(
                            transaction.categories.icon,
                            "w-8 h-8 text-gray-600 dark:text-gray-400"
                          )
                        ) : (
                          <FileText className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                        )}
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {transaction.categories?.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(
                              transaction.transaction_date
                            ).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-lg font-bold ${
                          transaction.type === "income"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatINR(transaction.amount)}
                      </span>
                    </div>

                    {transaction.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {transaction.description}
                      </p>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.type === "income"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {transaction.type}
                        </span>
                        <span className="inline-flex px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full capitalize">
                          {transaction.payment_method?.replace("_", " ")}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className="text-red-600 dark:text-red-400 p-2"
                        title="Delete transaction"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Floating Add Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 z-40"
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white font-playfair">
                Export Transactions
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Export Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Export Type
                </label>
                <select
                  value={exportOptions.type}
                  onChange={(e) =>
                    setExportOptions({ ...exportOptions, type: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Filtered Transactions</option>
                  <option value="monthly">Specific Month</option>
                  <option value="dateRange">Custom Date Range</option>
                  <option value="income">Income Only</option>
                  <option value="expense">Expenses Only</option>
                </select>
              </div>

              {/* Monthly Export */}
              {exportOptions.type === "monthly" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Month
                    </label>
                    <select
                      value={exportOptions.month}
                      onChange={(e) =>
                        setExportOptions({
                          ...exportOptions,
                          month: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {[
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
                      ].map((month, index) => (
                        <option key={index} value={index}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Year
                    </label>
                    <input
                      type="number"
                      value={exportOptions.year}
                      onChange={(e) =>
                        setExportOptions({
                          ...exportOptions,
                          year: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Date Range Export */}
              {exportOptions.type === "dateRange" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={exportOptions.startDate}
                      onChange={(e) =>
                        setExportOptions({
                          ...exportOptions,
                          startDate: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={exportOptions.endDate}
                      onChange={(e) =>
                        setExportOptions({
                          ...exportOptions,
                          endDate: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                <p className="text-sm text-indigo-800 dark:text-indigo-300 font-poppins">
                  {exportOptions.type === "all" &&
                    `Exporting ${filteredTransactions.length} filtered transactions`}
                  {exportOptions.type === "monthly" &&
                    `Exporting transactions for ${
                      [
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
                      ][exportOptions.month]
                    } ${exportOptions.year}`}
                  {exportOptions.type === "dateRange" &&
                    "Exporting transactions in the selected date range"}
                  {exportOptions.type === "income" &&
                    `Exporting ${
                      filteredTransactions.filter((t) => t.type === "income")
                        .length
                    } income transactions`}
                  {exportOptions.type === "expense" &&
                    `Exporting ${
                      filteredTransactions.filter((t) => t.type === "expense")
                        .length
                    } expense transactions`}
                </p>
              </div>

              {/* Export Button */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors shadow-lg"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTransactionAdded={fetchTransactions}
      />

      {/* AI Assistant */}
      <AIAssistant
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        onTransactionParsed={(transaction) => {
          setIsAIAssistantOpen(false);
          fetchTransactions();
        }}
        categories={categories}
        financialData={{
          transactions: transactions,
          categories: categories,
        }}
      />

      {/* Floating AI Assistant Button */}
      <button
        onClick={() => setIsAIAssistantOpen(true)}
        className="fixed bottom-6 sm:bottom-8 left-4 sm:left-8 bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-600 hover:from-teal-700 hover:via-cyan-700 hover:to-teal-700 text-white p-4 sm:p-5 rounded-full shadow-2xl shadow-teal-500/50 hover:shadow-teal-500/70 hover:scale-110 transition-all duration-300 group z-40"
        aria-label="Sai Assistant"
      >
        <Bot className="w-7 h-7 sm:w-8 sm:h-8 transition-transform duration-300" />
        <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-4 py-2 rounded-xl text-sm font-bold font-poppins whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg">
          Sai - AI Assistant
        </span>
      </button>
    </div>
  );
};

export default Transactions;
