import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/currencyUtils";
import Navbar from "../components/Navbar";
import { Target, AlertTriangle, Folder } from "lucide-react";
import { renderIcon } from "../utils/iconMapper.jsx";

export default function BudgetGoals({ onNavigate }) {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [newBudget, setNewBudget] = useState({
    category_id: "",
    amount: "",
    period: "monthly",
  });

  useEffect(() => {
    fetchData();

    // Set up real-time subscription for transactions
    const transactionsSubscription = supabase
      .channel("budget-transactions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch transactions when any change occurs
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      transactionsSubscription.unsubscribe();
    };
  }, [user, selectedPeriod]);

  const fetchData = async () => {
    await Promise.all([fetchBudgets(), fetchCategories(), fetchTransactions()]);
    setLoading(false);
  };

  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from("budget_goals")
        .select(
          `
          *,
          categories (id, name, icon, type)
        `
        )
        .eq("user_id", user.id)
        .eq("period", selectedPeriod)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error("Error fetching budgets:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .eq("type", "expense")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const now = new Date();
      let startDate;

      if (selectedPeriod === "monthly") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (selectedPeriod === "weekly") {
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .gte("transaction_date", startDate.toISOString().split("T")[0]);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const handleAddBudget = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("budget_goals").insert([
        {
          user_id: user.id,
          category_id: newBudget.category_id,
          amount: parseFloat(newBudget.amount),
          period: newBudget.period,
        },
      ]);

      if (error) throw error;

      setShowAddModal(false);
      setNewBudget({ category_id: "", amount: "", period: "monthly" });
      fetchBudgets();
    } catch (error) {
      console.error("Error adding budget:", error);
      alert("Failed to add budget goal");
    }
  };

  const handleDeleteBudget = async (id) => {
    if (!confirm("Are you sure you want to delete this budget goal?")) return;

    try {
      const { error } = await supabase
        .from("budget_goals")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchBudgets();
    } catch (error) {
      console.error("Error deleting budget:", error);
      alert("Failed to delete budget goal");
    }
  };

  const handleEditBudget = (budget) => {
    setEditingBudget(budget);
    setShowEditModal(true);
  };

  const handleUpdateBudget = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("budget_goals")
        .update({
          category_id: editingBudget.category_id,
          amount: parseFloat(editingBudget.amount),
          period: editingBudget.period,
        })
        .eq("id", editingBudget.id);

      if (error) throw error;

      setShowEditModal(false);
      setEditingBudget(null);
      fetchBudgets();
    } catch (error) {
      console.error("Error updating budget:", error);
      alert("Failed to update budget goal");
    }
  };

  const getSpentAmount = (categoryId) => {
    return transactions
      .filter((t) => t.category_id === categoryId && t.type === "expense")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  };

  const calculateProgress = (spent, budget) => {
    return (spent / budget) * 100;
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getTotalBudget = () => budgets.reduce((sum, b) => sum + b.amount, 0);
  const getTotalSpent = () => {
    return budgets.reduce((sum, budget) => {
      return sum + getSpentAmount(budget.category_id);
    }, 0);
  };

  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header/Navbar */}
      <Navbar currentPage="budgets" onNavigate={onNavigate} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 sm:pb-24">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-4xl font-bold text-teal-700 dark:text-white font-playfair mb-2 flex items-center gap-3">
              <Target className="w-10 h-10 animate-pulse" />
              Budget Goals
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Set and track spending limits for each category
            </p>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg hover:shadow-xl"
            >
              + Add Budget
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
              Total Budget
            </h3>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">
              {formatCurrency(getTotalBudget())}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
              Total Spent
            </h3>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(getTotalSpent())}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
              Remaining
            </h3>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(Math.max(0, getTotalBudget() - getTotalSpent()))}
            </p>
          </div>
        </div>

        {/* Budget Goals List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        ) : budgets.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
              No budget goals set
            </p>
            <p className="text-gray-400 dark:text-gray-500 mb-6">
              Create budget limits to track your spending!
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              Create First Budget
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {budgets.map((budget) => {
              const spent = getSpentAmount(budget.category_id);
              const progress = calculateProgress(spent, budget.amount);
              const isOverBudget = spent > budget.amount;

              return (
                <div
                  key={budget.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition"
                >
                  {/* Category Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        {budget.categories?.icon ? (
                          renderIcon(
                            budget.categories.icon,
                            "w-8 h-8 text-gray-600 dark:text-gray-400"
                          )
                        ) : (
                          <Folder className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                          {budget.categories?.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                          {budget.period}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditBudget(budget)}
                        className="text-teal-500 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteBudget(budget.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        Spent
                      </span>
                      <span
                        className={`font-semibold ${
                          isOverBudget ? "text-red-600" : "text-teal-600"
                        } dark:text-teal-400`}
                      >
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(
                          progress
                        )}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Amount Info */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Spent:
                      </span>
                      <span
                        className={`font-semibold ${
                          isOverBudget
                            ? "text-red-600"
                            : "text-gray-800 dark:text-white"
                        }`}
                      >
                        {formatCurrency(spent)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Budget:
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-white">
                        {formatCurrency(budget.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">
                        {isOverBudget ? "Over Budget:" : "Remaining:"}
                      </span>
                      <span
                        className={`font-semibold ${
                          isOverBudget
                            ? "text-red-600"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {formatCurrency(Math.abs(budget.amount - spent))}
                      </span>
                    </div>
                  </div>

                  {isOverBudget && (
                    <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
                      <span className="text-red-700 dark:text-red-400 font-semibold flex items-center justify-center gap-2">
                        <AlertTriangle className="w-5 h-5 animate-pulse" />
                        Over Budget!
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Budget Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                Add Budget Goal
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
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

            <form onSubmit={handleAddBudget} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={newBudget.category_id}
                  onChange={(e) =>
                    setNewBudget({ ...newBudget, category_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Budget Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={newBudget.amount}
                  onChange={(e) =>
                    setNewBudget({ ...newBudget, amount: e.target.value })
                  }
                  placeholder="10000"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Period *
                </label>
                <select
                  required
                  value={newBudget.period}
                  onChange={(e) =>
                    setNewBudget({ ...newBudget, period: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                >
                  Add Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      {showEditModal && editingBudget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                Edit Budget Goal
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingBudget(null);
                }}
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

            <form onSubmit={handleUpdateBudget} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={editingBudget.category_id}
                  onChange={(e) =>
                    setEditingBudget({
                      ...editingBudget,
                      category_id: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Budget Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={editingBudget.amount}
                  onChange={(e) =>
                    setEditingBudget({
                      ...editingBudget,
                      amount: e.target.value,
                    })
                  }
                  placeholder="10000"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Period *
                </label>
                <select
                  required
                  value={editingBudget.period}
                  onChange={(e) =>
                    setEditingBudget({
                      ...editingBudget,
                      period: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingBudget(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                >
                  Update Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
