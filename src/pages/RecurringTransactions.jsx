import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/currencyUtils";
import Navbar from "../components/Navbar";
import { Repeat, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { renderIcon } from "../utils/iconMapper.jsx";

export default function RecurringTransactions({ onNavigate }) {
  const { user } = useAuth();
  const [recurringTransactions, setRecurringTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecurring, setNewRecurring] = useState({
    description: "",
    amount: "",
    type: "expense",
    category_id: "",
    frequency: "monthly",
    start_date: new Date().toISOString().split("T")[0],
    is_active: true,
  });

  useEffect(() => {
    fetchRecurringTransactions();
    fetchCategories();

    // Set up real-time subscription for recurring transactions
    const recurringSubscription = supabase
      .channel("recurring_transactions_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recurring_transactions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Recurring transaction change detected:", payload);
          fetchRecurringTransactions();
        }
      )
      .subscribe();

    // Set up real-time subscription for transactions table (to see when recurring transactions are processed)
    const transactionsSubscription = supabase
      .channel("recurring_trans_monitor")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("New transaction created:", payload);
          // Optionally show a toast notification for auto-generated transactions
          if (payload.new?.description?.includes("(Auto-generated)")) {
            console.log("Auto-generated transaction created from recurring rule");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(recurringSubscription);
      supabase.removeChannel(transactionsSubscription);
    };
  }, [user]);

  const fetchRecurringTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("recurring_transactions")
        .select(
          `
          *,
          categories (name, icon, type)
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecurringTransactions(data || []);
    } catch (error) {
      console.error("Error fetching recurring transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleAddRecurring = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("recurring_transactions").insert([
        {
          user_id: user.id,
          description: newRecurring.description,
          amount: parseFloat(newRecurring.amount),
          type: newRecurring.type,
          category_id: newRecurring.category_id,
          frequency: newRecurring.frequency,
          start_date: newRecurring.start_date,
          is_active: newRecurring.is_active,
        },
      ]);

      if (error) throw error;

      setShowAddModal(false);
      setNewRecurring({
        description: "",
        amount: "",
        type: "expense",
        category_id: "",
        frequency: "monthly",
        start_date: new Date().toISOString().split("T")[0],
        is_active: true,
      });
      fetchRecurringTransactions();
    } catch (error) {
      console.error("Error adding recurring transaction:", error);
      alert("Failed to add recurring transaction");
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from("recurring_transactions")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      fetchRecurringTransactions();
    } catch (error) {
      console.error("Error toggling recurring transaction:", error);
      alert("Failed to update recurring transaction");
    }
  };

  const handleDeleteRecurring = async (id) => {
    if (!confirm("Are you sure you want to delete this recurring transaction?"))
      return;

    try {
      const { error } = await supabase
        .from("recurring_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchRecurringTransactions();
    } catch (error) {
      console.error("Error deleting recurring transaction:", error);
      alert("Failed to delete recurring transaction");
    }
  };

  const getFrequencyLabel = (frequency) => {
    const labels = {
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
      quarterly: "Quarterly",
      yearly: "Yearly",
    };
    return labels[frequency] || frequency;
  };

  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  const filteredCategories = categories.filter(
    (cat) => cat.type === newRecurring.type
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header/Navbar */}
      <Navbar currentPage="recurring" onNavigate={onNavigate} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 sm:pb-24">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-4xl font-bold text-teal-700 dark:text-white font-playfair mb-2 flex items-center gap-3">
              <Repeat
                className="w-10 h-10 animate-spin"
                style={{ animationDuration: "3s" }}
              />
              Recurring Transactions
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your recurring income and expenses
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg hover:shadow-xl"
          >
            + Add Recurring
          </button>
        </div>

        {/* Recurring Transactions List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        ) : recurringTransactions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
              No recurring transactions yet
            </p>
            <p className="text-gray-400 dark:text-gray-500 mb-6">
              Add recurring transactions like salary, rent, or subscriptions!
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              Create First Recurring Transaction
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {recurringTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition ${
                  !transaction.is_active ? "opacity-60" : ""
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Side - Transaction Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      {transaction.categories?.icon ? (
                        renderIcon(
                          transaction.categories.icon,
                          "w-8 h-8 text-gray-600 dark:text-gray-400"
                        )
                      ) : (
                        <FileText className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                          {transaction.description}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            transaction.type === "income"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {transaction.type === "income" ? "Income" : "Expense"}
                        </span>
                        {!transaction.is_active && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            Paused
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <p>
                          Category:{" "}
                          {transaction.categories?.name || "Uncategorized"}
                        </p>
                        <p>
                          Frequency: {getFrequencyLabel(transaction.frequency)}
                        </p>
                        <p>
                          Started:{" "}
                          {new Date(transaction.start_date).toLocaleDateString(
                            "en-IN"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Amount & Actions */}
                  <div className="flex flex-col md:items-end gap-3">
                    <div
                      className={`text-2xl font-bold ${
                        transaction.type === "income"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleToggleActive(
                            transaction.id,
                            transaction.is_active
                          )
                        }
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                          transaction.is_active
                            ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        {transaction.is_active ? "Pause" : "Resume"}
                      </button>
                      <button
                        onClick={() => handleDeleteRecurring(transaction.id)}
                        className="bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 px-4 py-2 rounded-lg font-medium transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Recurring Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                Add Recurring Transaction
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

            <form onSubmit={handleAddRecurring} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setNewRecurring({
                        ...newRecurring,
                        type: "income",
                        category_id: "",
                      })
                    }
                    className={`px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                      newRecurring.type === "income"
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <TrendingUp
                      className={`w-5 h-5 ${
                        newRecurring.type === "income" ? "animate-pulse" : ""
                      }`}
                    />
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewRecurring({
                        ...newRecurring,
                        type: "expense",
                        category_id: "",
                      })
                    }
                    className={`px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                      newRecurring.type === "expense"
                        ? "bg-red-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <TrendingDown
                      className={`w-5 h-5 ${
                        newRecurring.type === "expense" ? "animate-pulse" : ""
                      }`}
                    />
                    Expense
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  value={newRecurring.description}
                  onChange={(e) =>
                    setNewRecurring({
                      ...newRecurring,
                      description: e.target.value,
                    })
                  }
                  placeholder="e.g., Monthly Salary, Netflix Subscription"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={newRecurring.amount}
                  onChange={(e) =>
                    setNewRecurring({ ...newRecurring, amount: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={newRecurring.category_id}
                  onChange={(e) =>
                    setNewRecurring({
                      ...newRecurring,
                      category_id: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Category</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Frequency *
                </label>
                <select
                  required
                  value={newRecurring.frequency}
                  onChange={(e) =>
                    setNewRecurring({
                      ...newRecurring,
                      frequency: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={newRecurring.start_date}
                  onChange={(e) =>
                    setNewRecurring({
                      ...newRecurring,
                      start_date: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
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
                  Add Recurring
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
