import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  formatINR,
  groupByCategory,
  getMonthName,
} from "../utils/currencyUtils";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Navbar from "../components/Navbar";

const Analytics = ({ onNavigate }) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("6months"); // 30days, 6months, 1year, all
  const [totalSavings, setTotalSavings] = useState(0);

  const COLORS = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
    "#FF6384",
    "#C9CBCF",
    "#4BC0C0",
    "#FF9F40",
  ];

  useEffect(() => {
    if (user) {
      fetchTransactions();

      // Set up real-time subscription for analytics
      const analyticsSubscription = supabase
        .channel("analytics_transactions")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "transactions",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("Analytics: Transaction change detected:", payload);
            fetchTransactions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(analyticsSubscription);
      };
    }
  }, [user]);

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

  // Filter transactions by period
  const getFilteredTransactions = () => {
    const now = new Date();
    let startDate = new Date();

    switch (selectedPeriod) {
      case "30days":
        startDate.setDate(now.getDate() - 30);
        break;
      case "6months":
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "1year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "all":
        return transactions;
      default:
        return transactions;
    }

    return transactions.filter(
      (t) => new Date(t.transaction_date) >= startDate
    );
  };

  const filteredTransactions = getFilteredTransactions();

  // Fetch savings for the filtered period
  useEffect(() => {
    const fetchSavings = async () => {
      try {
        if (filteredTransactions.length === 0) {
          setTotalSavings(0);
          return;
        }

        const dates = filteredTransactions.map(
          (t) => new Date(t.transaction_date)
        );
        const minDate = new Date(Math.min(...dates))
          .toISOString()
          .split("T")[0];
        const maxDate = new Date(Math.max(...dates))
          .toISOString()
          .split("T")[0];

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

    if (user && filteredTransactions.length > 0) {
      fetchSavings();
    }
  }, [filteredTransactions, user]);

  // Monthly spending data for bar chart
  const getMonthlyData = () => {
    const monthlyData = {};

    filteredTransactions.forEach((transaction) => {
      const date = new Date(transaction.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      const monthName = `${getMonthName(
        date.getMonth()
      )} ${date.getFullYear()}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthName,
          income: 0,
          expense: 0,
          date: date,
        };
      }

      if (transaction.type === "income") {
        monthlyData[monthKey].income += parseFloat(transaction.amount);
      } else {
        monthlyData[monthKey].expense += parseFloat(transaction.amount);
      }
    });

    return Object.values(monthlyData)
      .sort((a, b) => a.date - b.date)
      .slice(-6) // Last 6 months
      .map(({ month, income, expense }) => ({ month, income, expense }));
  };

  // Category-wise spending for pie chart
  const getCategoryData = () => {
    const expenses = filteredTransactions.filter((t) => t.type === "expense");
    const categoryTotals = {};

    expenses.forEach((transaction) => {
      const categoryName = transaction.categories?.name || "Unknown";
      if (!categoryTotals[categoryName]) {
        categoryTotals[categoryName] = 0;
      }
      categoryTotals[categoryName] += parseFloat(transaction.amount);
    });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 categories
  };

  const monthlyData = getMonthlyData();
  const categoryData = getCategoryData();

  // Calculate statistics
  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const averageIncome =
    monthlyData.length > 0
      ? monthlyData.reduce((sum, m) => sum + m.income, 0) / monthlyData.length
      : 0;

  const averageExpense =
    monthlyData.length > 0
      ? monthlyData.reduce((sum, m) => sum + m.expense, 0) / monthlyData.length
      : 0;

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">
            {label}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatINR(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen">
      {/* Header */}
      <Navbar currentPage="analytics" onNavigate={onNavigate} />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 sm:pb-24">
        {/* Page Title & Period Selector */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h2 className="text-4xl font-bold text-teal-700 dark:text-white font-playfair">
            Financial Analytics
          </h2>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-teal-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:focus:ring-indigo-500 bg-white dark:bg-gray-700 text-teal-900 dark:text-white font-semibold"
          >
            <option value="30days">Last 30 Days</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
                <p className="text-sm opacity-90 font-poppins mb-1">
                  Total Income
                </p>
                <p className="text-2xl font-bold font-oswald">
                  {formatINR(totalIncome)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-xl p-6 text-white shadow-lg">
                <p className="text-sm opacity-90 font-poppins mb-1">
                  Total Expenses
                </p>
                <p className="text-2xl font-bold font-oswald">
                  {formatINR(totalExpenses)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
                <p className="text-sm opacity-90 font-poppins mb-1">
                  Avg Monthly Income
                </p>
                <p className="text-2xl font-bold font-oswald">
                  {formatINR(averageIncome)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white shadow-lg">
                <p className="text-sm opacity-90 font-poppins mb-1">
                  Avg Monthly Expense
                </p>
                <p className="text-2xl font-bold font-oswald">
                  {formatINR(averageExpense)}
                </p>
              </div>
            </div>

            {/* Charts */}
            {filteredTransactions.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <p className="text-xl text-gray-600 dark:text-gray-400 font-poppins mb-2">
                  No data to display
                </p>
                <p className="text-gray-500 dark:text-gray-500">
                  Add some transactions to see your analytics
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Income vs Expense Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white font-playfair mb-6">
                    Monthly Income vs Expenses
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? "#374151" : "#e5e7eb"}
                      />
                      <XAxis
                        dataKey="month"
                        stroke={isDark ? "#9ca3af" : "#6b7280"}
                        style={{ fontSize: "12px" }}
                      />
                      <YAxis
                        stroke={isDark ? "#9ca3af" : "#6b7280"}
                        style={{ fontSize: "12px" }}
                        tickFormatter={(value) =>
                          `₹${(value / 1000).toFixed(0)}k`
                        }
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="income"
                        fill="#10b981"
                        name="Income"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="expense"
                        fill="#ef4444"
                        name="Expense"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Category-wise Spending Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white font-playfair mb-6">
                    Spending by Category
                  </h3>
                  {categoryData.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px]">
                      <p className="text-gray-500 dark:text-gray-400">
                        No expense data available
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} (${(percent * 100).toFixed(0)}%)`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Top Spending Categories List */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white font-playfair mb-6">
                    Top Spending Categories
                  </h3>
                  {categoryData.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No expense data available
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {categoryData.map((category, index) => {
                        const percentage =
                          (category.value / totalExpenses) * 100;
                        return (
                          <div
                            key={category.name}
                            className="flex items-center gap-4"
                          >
                            <div
                              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            >
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {category.name}
                                </span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {formatINR(category.value)}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${percentage}%`,
                                    backgroundColor:
                                      COLORS[index % COLORS.length],
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Insights */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white font-playfair mb-6">
                    Financial Insights
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-green-600 dark:text-green-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          Savings Rate
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {totalIncome > 0
                            ? `${(
                                ((totalIncome - totalExpenses) / totalIncome) *
                                100
                              ).toFixed(1)}%`
                            : "0%"}{" "}
                          of your income saved
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-purple-600 dark:text-purple-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          Total Transactions
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {filteredTransactions.length} transactions in this
                          period
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-orange-600 dark:text-orange-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          Net Balance
                        </p>
                        <p
                          className={`text-sm font-bold ${
                            totalIncome - totalExpenses - totalSavings >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {formatINR(
                            totalIncome - totalExpenses - totalSavings
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          (After Savings: {formatINR(totalSavings)})
                        </p>
                      </div>
                    </div>

                    {categoryData.length > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-red-600 dark:text-red-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            Biggest Expense Category
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {categoryData[0].name} -{" "}
                            {formatINR(categoryData[0].value)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Analytics;
