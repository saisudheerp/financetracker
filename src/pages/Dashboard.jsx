import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar";
import AddTransactionModal from "../components/AddTransactionModal";
import AIAssistant from "../components/AIAssistant";
import {
  formatINR,
  getCurrentMonth,
  getPreviousMonth,
  getCurrentMonthRange,
  getPreviousMonthRange,
  calculatePercentageChange,
} from "../utils/currencyUtils";
import { renderIcon } from "../utils/iconMapper.jsx";
import { FileText, Bot, ChevronDown, ChevronUp } from "lucide-react";

const Dashboard = ({ onNavigate }) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [categories, setCategories] = useState([]);

  // Collapsible sections state for mobile
  const [expandedSections, setExpandedSections] = useState({
    monthlyComparison: false,
    savingsGoals: false,
    recentTransactions: true, // Keep transactions open by default
  });

  const [stats, setStats] = useState({
    thisMonthIncome: 0,
    thisMonthExpenses: 0,
    thisMonthSavings: 0,
    balance: 0,
    lastMonthIncome: 0,
    lastMonthExpenses: 0,
  });
  const [savingsStats, setSavingsStats] = useState({
    totalSavings: 0,
    thisMonthSavings: 0,
    lastMonthSavings: 0,
    totalGoals: 0,
    completedGoals: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgetGoals, setBudgetGoals] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [recurringTransactions, setRecurringTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchSavingsData();
      fetchCategories();

      // Auto-process recurring transactions on load
      autoProcessRecurringTransactions();

      // Set up automatic processing every hour
      const recurringInterval = setInterval(() => {
        autoProcessRecurringTransactions();
      }, 60 * 60 * 1000); // 1 hour

      // Real-time subscription for transactions
      const transactionsChannel = supabase
        .channel("dashboard-transactions")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "transactions",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchDashboardData();
          }
        )
        .subscribe();

      // Real-time subscription for savings deposits
      const depositsChannel = supabase
        .channel("dashboard-deposits")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "savings_deposits",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchSavingsData();
          }
        )
        .subscribe();

      // Real-time subscription for savings goals
      const goalsChannel = supabase
        .channel("dashboard-goals")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "savings_goals",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchSavingsData();
          }
        )
        .subscribe();

      return () => {
        clearInterval(recurringInterval);
        supabase.removeChannel(transactionsChannel);
        supabase.removeChannel(depositsChannel);
        supabase.removeChannel(goalsChannel);
      };
    }
  }, [user]);

  const autoProcessRecurringTransactions = async () => {
    try {
      // Get all active recurring transactions
      const { data: recurringList, error: fetchError } = await supabase
        .from("recurring_transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (fetchError) throw fetchError;

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      for (const recurring of recurringList || []) {
        // Check when this recurring was last processed
        // Look for transactions with same description and user
        const { data: lastTransaction } = await supabase
          .from("transactions")
          .select("transaction_date")
          .eq("user_id", user.id)
          .eq("description", recurring.description)
          .order("transaction_date", { ascending: false })
          .limit(1)
          .single();

        const startDate = new Date(recurring.start_date);
        let shouldProcess = false;

        if (!lastTransaction) {
          // Never processed - check if start date has passed
          shouldProcess = startDate <= today;
        } else {
          // Check if enough time has passed based on frequency
          const lastDate = new Date(lastTransaction.transaction_date);
          const daysSinceLastProcess = Math.floor(
            (today - lastDate) / (1000 * 60 * 60 * 24)
          );

          switch (recurring.frequency) {
            case "daily":
              shouldProcess = daysSinceLastProcess >= 1;
              break;
            case "weekly":
              shouldProcess = daysSinceLastProcess >= 7;
              break;
            case "monthly":
              // Check if we're in a new month
              shouldProcess =
                today.getMonth() !== lastDate.getMonth() ||
                today.getFullYear() !== lastDate.getFullYear();
              break;
            case "quarterly":
              const monthsDiff =
                (today.getFullYear() - lastDate.getFullYear()) * 12 +
                (today.getMonth() - lastDate.getMonth());
              shouldProcess = monthsDiff >= 3;
              break;
            case "yearly":
              shouldProcess = today.getFullYear() > lastDate.getFullYear();
              break;
          }
        }

        // Process if needed
        if (shouldProcess) {
          await supabase.from("transactions").insert([
            {
              user_id: user.id,
              description: recurring.description,
              amount: parseFloat(recurring.amount),
              type: recurring.type,
              category_id: recurring.category_id,
              transaction_date: todayStr,
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error auto-processing recurring transactions:", error);
    }
  };

  const fetchSavingsData = async () => {
    try {
      const currentMonth = getCurrentMonthRange();
      const previousMonth = getPreviousMonthRange();

      // Fetch all savings goals (lifetime goals)
      const { data: goalsData, error: goalsError } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", user.id);

      if (goalsError) throw goalsError;

      const totalSavings =
        goalsData?.reduce(
          (sum, goal) => sum + parseFloat(goal.current_amount || 0),
          0
        ) || 0;

      // Fetch deposits made this month from savings_deposits table
      const { data: depositsData, error: depositsError } = await supabase
        .from("savings_deposits")
        .select("*")
        .eq("user_id", user.id)
        .gte("deposit_date", currentMonth.start)
        .lte("deposit_date", currentMonth.end);

      if (depositsError) {
        console.error("Deposits error:", depositsError);
      }

      // Fetch deposits made last month
      const { data: lastMonthDeposits, error: lastMonthError } = await supabase
        .from("savings_deposits")
        .select("*")
        .eq("user_id", user.id)
        .gte("deposit_date", previousMonth.start)
        .lte("deposit_date", previousMonth.end);

      if (lastMonthError) {
        console.error("Last month deposits error:", lastMonthError);
      }

      // Calculate this month's savings from deposits
      const thisMonthSavings =
        depositsData?.reduce(
          (sum, deposit) => sum + parseFloat(deposit.amount || 0),
          0
        ) || 0;

      // Calculate last month's savings from deposits
      const lastMonthSavings =
        lastMonthDeposits?.reduce(
          (sum, deposit) => sum + parseFloat(deposit.amount || 0),
          0
        ) || 0;

      const totalGoals = goalsData?.length || 0;
      const completedGoals =
        goalsData?.filter(
          (goal) =>
            parseFloat(goal.current_amount) >= parseFloat(goal.target_amount)
        ).length || 0;

      setSavingsStats({
        totalSavings,
        thisMonthSavings,
        lastMonthSavings,
        totalGoals,
        completedGoals,
      });

      // Set savings goals for AI Assistant
      setSavingsGoals(goalsData || []);
    } catch (error) {
      console.error("Error fetching savings:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      console.log("📂 Fetching categories for user:", user.id);

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) {
        console.error("❌ Error fetching categories:", error);
        throw error;
      }

      console.log("✅ Categories fetched:", data?.length || 0, "categories");
      console.log(
        "Categories:",
        data?.map((c) => `${c.name} (${c.type})`).join(", ")
      );

      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      // Show alert to user
      alert("Failed to load categories. Please refresh the page.");
    }
  };

  const handleAITransaction = async (parsedData) => {
    try {
      // Check if it's an array of transactions (batch insert)
      if (Array.isArray(parsedData)) {
        // Filter out transactions with null category_id
        const validTransactions = parsedData.filter((t) => {
          if (!t.category_id) {
            console.error(`❌ Skipping transaction with null category_id:`, t);
            return false;
          }
          return true;
        });

        if (validTransactions.length === 0) {
          throw new Error(
            "No valid transactions to add. Categories may not be loaded."
          );
        }

        const transactions = validTransactions.map((t) => ({
          user_id: user.id,
          type: t.type,
          amount: t.amount,
          category_id: t.category_id,
          description: t.description,
          payment_method: t.payment_method,
          transaction_date: new Date().toISOString().split("T")[0],
        }));

        console.log("Inserting batch transactions:", transactions);
        const { data, error } = await supabase
          .from("transactions")
          .insert(transactions);

        if (error) {
          console.error("Batch insert error:", error);
          throw error;
        }

        console.log("Batch insert success:", data);
        // Keep AI assistant open to add more transactions, just refresh data
        fetchDashboardData();
      } else {
        // Single transaction - validate category_id
        if (!parsedData.category_id) {
          throw new Error(
            `Category not found: "${parsedData.categoryName}". Please try again or select a different category.`
          );
        }

        const transactionData = {
          user_id: user.id,
          type: parsedData.type,
          amount: parsedData.amount,
          category_id: parsedData.category_id,
          description: parsedData.description,
          payment_method: parsedData.payment_method,
          transaction_date: new Date().toISOString().split("T")[0],
        };

        console.log("Inserting single transaction:", transactionData);
        const { data, error } = await supabase
          .from("transactions")
          .insert([transactionData]);

        if (error) {
          console.error("Single insert error:", error);
          throw error;
        }

        console.log("Single insert success:", data);
        // Keep AI assistant open to add more transactions, just refresh data
        fetchDashboardData();
      }
    } catch (error) {
      console.error("Error adding AI transaction:", error);
      alert(`Failed to add transaction: ${error.message || "Unknown error"}`);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const currentMonth = getCurrentMonthRange();
      const previousMonth = getPreviousMonthRange();

      // Fetch current month savings deposits first
      const { data: currentDeposits } = await supabase
        .from("savings_deposits")
        .select("*")
        .eq("user_id", user.id)
        .gte("deposit_date", currentMonth.start)
        .lte("deposit_date", currentMonth.end);

      const thisMonthSavings =
        currentDeposits?.reduce(
          (sum, deposit) => sum + parseFloat(deposit.amount || 0),
          0
        ) || 0;

      // Fetch current month transactions
      const { data: currentMonthData, error: currentError } = await supabase
        .from("transactions")
        .select("*, categories(*)")
        .eq("user_id", user.id)
        .gte("transaction_date", currentMonth.start)
        .lte("transaction_date", currentMonth.end)
        .order("transaction_date", { ascending: false });

      if (currentError) {
        console.error("Error fetching current month:", currentError);
      }

      // Fetch previous month transactions
      const { data: previousMonthData, error: prevError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", previousMonth.start)
        .lte("transaction_date", previousMonth.end);

      if (prevError) {
        console.error("Error fetching previous month:", prevError);
      }

      // Calculate this month's income/expenses from actual transactions
      const thisMonthIncome =
        currentMonthData
          ?.filter((t) => t.type === "income")
          .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

      const thisMonthExpenses =
        currentMonthData
          ?.filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

      const lastMonthIncome =
        previousMonthData
          ?.filter((t) => t.type === "income")
          .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

      const lastMonthExpenses =
        previousMonthData
          ?.filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

      setStats({
        thisMonthIncome,
        thisMonthExpenses,
        balance: thisMonthIncome - thisMonthExpenses - thisMonthSavings,
        lastMonthIncome,
        lastMonthExpenses,
        thisMonthSavings: thisMonthSavings,
      });

      setRecentTransactions(currentMonthData?.slice(0, 5) || []);
      setTransactions(currentMonthData || []);

      // Fetch budget goals for footer stats
      const { data: budgetData } = await supabase
        .from("budget_goals")
        .select("*")
        .eq("user_id", user.id);

      setBudgetGoals(budgetData || []);

      // Fetch recurring transactions for AI Assistant
      const { data: recurringData } = await supabase
        .from("recurring_transactions")
        .select("*")
        .eq("user_id", user.id);

      setRecurringTransactions(recurringData || []);

      console.log("✅ Dashboard data refreshed:", {
        thisMonthTransactions: currentMonthData?.length || 0,
        thisMonthIncome,
        thisMonthExpenses,
        thisMonthSavings,
        balance: thisMonthIncome - thisMonthExpenses - thisMonthSavings,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const expenseChange = calculatePercentageChange(
    stats.thisMonthExpenses,
    stats.lastMonthExpenses
  );
  const showBudgetWarning =
    stats.thisMonthExpenses > stats.thisMonthIncome &&
    stats.thisMonthIncome > 0;

  // Toggle section expansion (for mobile collapsible sections)
  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <Navbar currentPage="dashboard" onNavigate={onNavigate} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 sm:pb-24">
        {/* Budget Warning Banner */}
        {showBudgetWarning && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 className="font-oswald text-base sm:text-lg text-red-800 dark:text-red-300 font-semibold">
                Budget Warning!
              </h3>
              <p className="font-poppins text-xs sm:text-sm text-red-700 dark:text-red-400">
                Your expenses this month ({formatINR(stats.thisMonthExpenses)})
                exceed your income ({formatINR(stats.thisMonthIncome)}).
                Consider reducing spending!
              </p>
            </div>
          </div>
        )}

        {/* Summary Cards - Simple grid on mobile */}
        <div className="mb-4 sm:mb-8">
          {/* Mobile: Simple grid */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {/* Total Income Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-l-4 border-emerald-400">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-oswald text-teal-700 dark:text-gray-400 text-xs uppercase">
                  This Month Income
                </h3>
                <div className="bg-emerald-100 dark:bg-green-900/30 p-2 rounded-lg">
                  <svg
                    className="w-5 h-5 text-emerald-600 dark:text-green-400"
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
              </div>
              <p className="font-oswald text-2xl font-bold text-teal-700 dark:text-gray-100">
                {formatINR(stats.thisMonthIncome)}
              </p>
              <p className="font-poppins text-xs text-teal-600 dark:text-gray-400 mt-1">
                Includes recurring transactions
              </p>
            </div>

            {/* Total Expenses Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-l-4 border-rose-400">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-oswald text-teal-700 dark:text-gray-400 text-xs uppercase">
                  This Month Expenses
                </h3>
                <div className="bg-rose-100 dark:bg-red-900/30 p-2 rounded-lg">
                  <svg
                    className="w-5 h-5 text-rose-500 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold font-oswald text-rose-600 dark:text-gray-100">
                {formatINR(stats.thisMonthExpenses)}
              </p>
              <p className="font-poppins text-xs text-rose-500 dark:text-gray-400 mt-1">
                Includes recurring transactions
              </p>
            </div>

            {/* This Month Savings Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-l-4 border-purple-400">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-oswald text-teal-700 dark:text-gray-400 text-xs uppercase">
                  This Month Savings
                </h3>
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                  <svg
                    className="w-5 h-5 text-purple-600 dark:text-purple-400"
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
              </div>
              <p className="font-oswald text-2xl font-bold text-purple-600 dark:text-gray-100">
                {formatINR(savingsStats.thisMonthSavings)}
              </p>
              <p className="font-poppins text-xs text-purple-500 dark:text-gray-400 mt-1">
                Added to savings goals
              </p>
            </div>

            {/* Current Balance Card */}
            <div
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-l-4 ${
                stats.balance >= 0 ? "border-teal-400" : "border-amber-400"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-oswald text-teal-700 dark:text-gray-400 text-xs uppercase">
                  This Month Balance
                </h3>
                <div
                  className={`${
                    stats.balance >= 0
                      ? "bg-teal-100 dark:bg-indigo-900/30"
                      : "bg-amber-100 dark:bg-orange-900/30"
                  } p-2 rounded-lg`}
                >
                  <svg
                    className={`w-5 h-5 ${
                      stats.balance >= 0
                        ? "text-teal-600 dark:text-indigo-400"
                        : "text-amber-600 dark:text-orange-400"
                    }`}
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
              </div>
              <p
                className={`font-oswald text-2xl font-bold ${
                  stats.balance >= 0
                    ? "text-teal-600 dark:text-indigo-400"
                    : "text-amber-600 dark:text-orange-400"
                }`}
              >
                {formatINR(stats.balance)}
              </p>
              <p className="font-poppins text-xs text-teal-600 dark:text-gray-400 mt-1">
                Income - Expenses
              </p>
            </div>
          </div>

          {/* Desktop: Grid layout */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Income Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-l-4 border-emerald-400">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-oswald text-teal-700 dark:text-gray-400 text-sm uppercase">
                  This Month Income
                </h3>
                <div className="bg-emerald-100 dark:bg-green-900/30 p-3 rounded-lg">
                  <svg
                    className="w-6 h-6 text-emerald-600 dark:text-green-400"
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
              </div>
              <p className="font-oswald text-3xl font-bold text-teal-700 dark:text-gray-100">
                {formatINR(stats.thisMonthIncome)}
              </p>
              <p className="font-poppins text-sm text-teal-600 dark:text-gray-400 mt-2">
                Includes recurring transactions
              </p>
            </div>

            {/* Total Expenses Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-l-4 border-rose-400">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-oswald text-teal-700 dark:text-gray-400 text-sm uppercase">
                  This Month Expenses
                </h3>
                <div className="bg-rose-100 dark:bg-red-900/30 p-3 rounded-lg">
                  <svg
                    className="w-6 h-6 text-rose-500 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold font-oswald text-rose-600 dark:text-gray-100">
                {formatINR(stats.thisMonthExpenses)}
              </p>
              <p className="font-poppins text-sm text-rose-500 dark:text-gray-400 mt-2">
                Includes recurring transactions
              </p>
            </div>

            {/* This Month Savings Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-l-4 border-purple-400">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-oswald text-teal-700 dark:text-gray-400 text-sm uppercase">
                  This Month Savings
                </h3>
                <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="font-oswald text-3xl font-bold text-purple-600 dark:text-gray-100">
                {formatINR(savingsStats.thisMonthSavings)}
              </p>
              <p className="font-poppins text-sm text-purple-500 dark:text-gray-400 mt-2">
                Added to savings goals
              </p>
            </div>

            {/* Current Balance Card */}
            <div
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-l-4 ${
                stats.balance >= 0 ? "border-teal-400" : "border-amber-400"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-oswald text-teal-700 dark:text-gray-400 text-sm uppercase">
                  This Month Balance
                </h3>
                <div
                  className={`${
                    stats.balance >= 0
                      ? "bg-teal-100 dark:bg-indigo-900/30"
                      : "bg-amber-100 dark:bg-orange-900/30"
                  } p-3 rounded-lg`}
                >
                  <svg
                    className={`w-5 h-5 sm:w-6 sm:h-6 ${
                      stats.balance >= 0
                        ? "text-teal-600 dark:text-indigo-400"
                        : "text-amber-600 dark:text-orange-400"
                    }`}
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
              </div>
              <p
                className={`font-oswald text-2xl sm:text-3xl font-bold ${
                  stats.balance >= 0
                    ? "text-teal-600 dark:text-indigo-400"
                    : "text-amber-600 dark:text-orange-400"
                }`}
              >
                {formatINR(stats.balance)}
              </p>
              <p className="font-poppins text-sm text-teal-600 dark:text-gray-400 mt-2">
                Income - Expenses
              </p>
            </div>
          </div>
        </div>

        {/* Savings Stats - Keep full size, not collapsible */}
        <div className="grid grid-cols-1 mb-4 sm:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 border-l-4 border-purple-400">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 sm:p-3 rounded-lg">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-oswald text-teal-700 dark:text-gray-400 text-xs sm:text-sm uppercase">
                    Savings Goals
                  </h3>
                  <p className="font-oswald text-xl sm:text-2xl font-bold text-purple-600 dark:text-gray-100">
                    {formatINR(savingsStats.totalSavings)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="font-poppins text-xs sm:text-sm text-purple-500 dark:text-gray-400">
                {savingsStats.totalGoals} Goals • {savingsStats.completedGoals}{" "}
                Completed
              </p>
              <button
                onClick={() => onNavigate && onNavigate("savings")}
                className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 hover:underline font-semibold"
              >
                View →
              </button>
            </div>
          </div>
        </div>

        {/* AI Transaction Assistant - Simple Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-8 border-l-4 border-teal-500">
          <div className="flex items-center gap-4">
            <div className="bg-teal-100 dark:bg-teal-900/30 p-3 rounded-lg">
              <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-playfair text-lg sm:text-xl font-bold text-teal-700 dark:text-gray-100 mb-1">
                AI Assistant - Sai
              </h3>
              <p className="text-teal-600 dark:text-gray-400 text-xs sm:text-sm font-poppins">
                Turning your words into transactions
              </p>
            </div>
            <button
              onClick={() => setIsAIAssistantOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base"
            >
              Try Now
            </button>
          </div>
        </div>

        {/* Monthly Comparison - Always show last 2 months, Collapsible on mobile */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-4 sm:mb-8">
          <button
            onClick={() => toggleSection("monthlyComparison")}
            className="w-full p-4 sm:p-6 flex items-center justify-between md:cursor-default"
          >
            <h3 className="font-playfair text-xl sm:text-2xl font-bold text-teal-700 dark:text-gray-100">
              Monthly Summary
            </h3>
            {/* Mobile toggle icon */}
            <div className="md:hidden">
              {expandedSections.monthlyComparison ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </button>

          <div
            className={`${
              expandedSections.monthlyComparison ? "block" : "hidden"
            } md:block px-4 sm:px-6 pb-4 sm:pb-6`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-4 sm:p-6">
                <h4 className="font-oswald text-teal-700 dark:text-gray-300 mb-3 sm:mb-4 text-sm sm:text-base">
                  {getCurrentMonth()}
                </h4>
                <div className="space-y-2 font-poppins text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-teal-600 dark:text-gray-400">
                      Income:
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-green-400">
                      {formatINR(stats.thisMonthIncome)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-600 dark:text-gray-400">
                      Expenses:
                    </span>
                    <span className="font-semibold text-rose-500 dark:text-red-400">
                      {formatINR(stats.thisMonthExpenses)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-600 dark:text-gray-400">
                      Savings:
                    </span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      {formatINR(savingsStats.thisMonthSavings)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-teal-200 dark:border-gray-600">
                    <span className="text-teal-700 dark:text-gray-200 font-semibold">
                      Net:
                    </span>
                    <span
                      className={`font-bold ${
                        stats.thisMonthIncome -
                          stats.thisMonthExpenses -
                          savingsStats.thisMonthSavings >=
                        0
                          ? "text-emerald-600 dark:text-green-400"
                          : "text-rose-500 dark:text-red-400"
                      }`}
                    >
                      {formatINR(
                        stats.thisMonthIncome -
                          stats.thisMonthExpenses -
                          savingsStats.thisMonthSavings
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-700/20 dark:to-gray-600/20 rounded-xl p-4 sm:p-6">
                <h4 className="font-oswald text-teal-700 dark:text-gray-300 mb-3 sm:mb-4 text-sm sm:text-base">
                  {getPreviousMonth()}
                </h4>
                <div className="space-y-2 font-poppins text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-teal-600 dark:text-gray-400">
                      Income:
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-green-400">
                      {formatINR(stats.lastMonthIncome)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-600 dark:text-gray-400">
                      Expenses:
                    </span>
                    <span className="font-semibold text-rose-500 dark:text-red-400">
                      {formatINR(stats.lastMonthExpenses)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-600 dark:text-gray-400">
                      Savings:
                    </span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      {formatINR(savingsStats.lastMonthSavings)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-teal-200 dark:border-gray-600">
                    <span className="text-teal-700 dark:text-gray-200 font-semibold">
                      Net:
                    </span>
                    <span
                      className={`font-bold ${
                        stats.lastMonthIncome -
                          stats.lastMonthExpenses -
                          savingsStats.lastMonthSavings >=
                        0
                          ? "text-emerald-600 dark:text-green-400"
                          : "text-rose-500 dark:text-red-400"
                      }`}
                    >
                      {formatINR(
                        stats.lastMonthIncome -
                          stats.lastMonthExpenses -
                          savingsStats.lastMonthSavings
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison */}
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-teal-50 dark:bg-indigo-900/20 rounded-lg">
              <p className="font-poppins text-xs sm:text-sm text-teal-700 dark:text-gray-300">
                <span className="font-semibold">Spending Trend:</span> Your
                expenses are{" "}
                <span
                  className={`font-bold ${
                    expenseChange.isIncrease
                      ? "text-rose-500 dark:text-red-400"
                      : "text-emerald-600 dark:text-green-400"
                  }`}
                >
                  {expenseChange.isIncrease ? "up" : "down"}{" "}
                  {expenseChange.percentage}%
                </span>{" "}
                compared to last month.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Transactions - Collapsible on mobile, limit to 3 items */}
        {recentTransactions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <button
              onClick={() => toggleSection("recentTransactions")}
              className="w-full p-4 sm:p-6 flex items-center justify-between md:cursor-default"
            >
              <h3 className="font-playfair text-xl sm:text-2xl font-bold text-teal-700 dark:text-gray-100">
                Recent Transactions
              </h3>
              {/* Mobile toggle icon */}
              <div className="md:hidden">
                {expandedSections.recentTransactions ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>

            <div
              className={`${
                expandedSections.recentTransactions ? "block" : "hidden"
              } md:block px-4 sm:px-6 pb-4 sm:pb-6`}
            >
              <div className="space-y-2 sm:space-y-3">
                {recentTransactions.slice(0, 3).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div
                        className={`p-2 sm:p-3 rounded-lg ${
                          transaction.type === "income"
                            ? "bg-emerald-100 dark:bg-green-900/30"
                            : "bg-rose-100 dark:bg-red-900/30"
                        }`}
                      >
                        {transaction.type === "income" ? (
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 11l5-5m0 0l5 5m-5-5v12"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 dark:text-red-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 13l-5 5m0 0l-5-5m5 5V6"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-poppins font-semibold text-sm sm:text-base text-teal-700 dark:text-gray-200 flex items-center gap-2">
                          {transaction.categories?.icon ? (
                            renderIcon(
                              transaction.categories.icon,
                              "w-4 h-4 sm:w-5 sm:h-5"
                            )
                          ) : (
                            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                          )}
                          <span>
                            {transaction.categories?.name || "Unknown"}
                          </span>
                        </p>
                        <p className="font-poppins text-xs text-teal-600 dark:text-gray-400">
                          {transaction.description || "No description"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-oswald text-base sm:text-lg font-semibold ${
                          transaction.type === "income"
                            ? "text-emerald-600 dark:text-green-400"
                            : "text-rose-500 dark:text-red-400"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatINR(transaction.amount)}
                      </p>
                      <p className="font-poppins text-xs text-teal-600 dark:text-gray-400">
                        {new Date(
                          transaction.transaction_date
                        ).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* View More Button - Only show on mobile if there are more than 3 transactions */}
              {recentTransactions.length > 3 && (
                <div className="mt-4 text-center md:hidden">
                  <button
                    onClick={() => onNavigate && onNavigate("transactions")}
                    className="text-sm text-teal-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    View All {transactions.length} Transactions →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Floating Buttons */}
      {/* AI Assistant Button - Sai */}
      <button
        onClick={() => setIsAIAssistantOpen(true)}
        className="fixed bottom-6 sm:bottom-8 left-4 sm:left-8 bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-600 hover:from-teal-700 hover:via-cyan-700 hover:to-teal-700 text-white p-4 sm:p-5 rounded-full shadow-2xl shadow-teal-500/50 hover:shadow-teal-500/70 hover:scale-110 transition-all duration-300 group z-40"
        aria-label="Sai Assistant"
      >
        <Bot className="w-7 h-7 sm:w-8 sm:h-8 transition-transform duration-300" />
        <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-4 py-2 rounded-xl text-sm font-bold font-poppins whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg">
          Sai - Your Smart Assistant
        </span>
      </button>

      {/* Floating Add Transaction Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 sm:bottom-8 right-4 sm:right-8 bg-gradient-to-r from-teal-500 to-cyan-500 dark:from-indigo-600 dark:to-purple-600 text-white p-4 sm:p-4 rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 group z-40"
        aria-label="Add Transaction"
      >
        <svg
          className="w-7 h-7 sm:w-8 sm:h-8"
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
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-teal-700 dark:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm font-poppins whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Add Transaction
        </span>
      </button>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTransactionAdded={fetchDashboardData}
      />

      {/* AI Assistant */}
      <AIAssistant
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        onTransactionParsed={handleAITransaction}
        categories={categories}
        financialData={{
          transactions: transactions,
          categories: categories,
          savingsGoals: savingsGoals,
          budgetGoals: budgetGoals,
          recurringTransactions: recurringTransactions,
        }}
      />

      {/* Footer - Single Line */}
      <footer className="bg-teal-600 dark:bg-gray-800 text-white mt-12 py-4">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <h3 className="font-pacifico text-base sm:text-xl">Spends-In</h3>
              <span className="text-teal-100">•</span>
              <p className="font-poppins text-xs sm:text-sm text-teal-100 dark:text-gray-400">
                Smart Finance Tracker
              </p>
            </div>
            <p className="font-poppins text-xs sm:text-sm text-teal-100 dark:text-gray-400">
              © {new Date().getFullYear()} All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
