import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/currencyUtils";
import Navbar from "../components/Navbar";
import AIAssistant from "../components/AIAssistant";
import SimpleNotificationPrompt from "../components/SimpleNotificationPrompt";
import { Wallet, PartyPopper, Bot } from "lucide-react";
import {
  notifySavingsGoalAchieved,
  notifySavingsProgress,
} from "../utils/notificationUtils";

export default function Savings({ onNavigate }) {
  const { user } = useAuth();
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [newGoal, setNewGoal] = useState({
    name: "",
    target_amount: "",
    current_amount: "0",
    deadline: "",
    description: "",
  });

  useEffect(() => {
    fetchSavingsGoals();
    fetchCategories();
  }, [user]);

  const fetchSavingsGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavingsGoals(data || []);
    } catch (error) {
      console.error("Error fetching savings goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("savings_goals").insert([
        {
          user_id: user.id,
          name: newGoal.name,
          target_amount: parseFloat(newGoal.target_amount),
          current_amount: parseFloat(newGoal.current_amount),
          deadline: newGoal.deadline || null,
          description: newGoal.description || null,
        },
      ]);

      if (error) throw error;

      setShowAddModal(false);
      setNewGoal({
        name: "",
        target_amount: "",
        current_amount: "0",
        deadline: "",
        description: "",
      });
      fetchSavingsGoals();
    } catch (error) {
      console.error("Error adding savings goal:", error);
      alert("Failed to add savings goal");
    }
  };

  const handleUpdateAmount = async (goalId, newAmount) => {
    try {
      // Check if goal is already completed
      const goal = savingsGoals.find((g) => g.id === goalId);
      if (!goal) return;

      const oldAmount = parseFloat(goal.current_amount);
      const updatedAmount = parseFloat(newAmount);
      const isCompleted = oldAmount >= parseFloat(goal.target_amount);
      const isIncreasing = updatedAmount > oldAmount;

      if (isCompleted && isIncreasing) {
        alert(
          "Cannot add more money to a completed savings goal! The target has already been reached."
        );
        return;
      }

      // Calculate the deposit amount (difference)
      const depositAmount = updatedAmount - oldAmount;

      // Update the savings goal
      const { error: updateError } = await supabase
        .from("savings_goals")
        .update({ current_amount: updatedAmount })
        .eq("id", goalId);

      if (updateError) throw updateError;

      // Check for achievements and send notifications
      const newPercentage =
        (updatedAmount / parseFloat(goal.target_amount)) * 100;

      // Goal achieved notification
      if (
        updatedAmount >= parseFloat(goal.target_amount) &&
        oldAmount < parseFloat(goal.target_amount)
      ) {
        notifySavingsGoalAchieved(goal.goal_name, goal.target_amount);
      }
      // Progress milestone notification (75%, 90%)
      else if (
        newPercentage >= 75 &&
        (oldAmount / parseFloat(goal.target_amount)) * 100 < 75
      ) {
        notifySavingsProgress(goal.goal_name, newPercentage);
      }

      // If money was added, record the deposit
      if (depositAmount > 0) {
        const { error: depositError } = await supabase
          .from("savings_deposits")
          .insert([
            {
              user_id: user.id,
              savings_goal_id: goalId,
              amount: depositAmount,
              deposit_date: new Date().toISOString().split("T")[0],
            },
          ]);

        if (depositError) {
          console.error("Error recording deposit:", depositError);
          // Don't fail the whole operation if deposit recording fails
        }
      }

      fetchSavingsGoals();
    } catch (error) {
      console.error("Error updating savings goal:", error);
      alert(error.message || "Failed to update savings goal");
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!confirm("Are you sure you want to delete this savings goal?")) return;

    try {
      // First delete all associated deposits
      const { error: depositsError } = await supabase
        .from("savings_deposits")
        .delete()
        .eq("savings_goal_id", goalId);

      if (depositsError) {
        console.error("Error deleting deposits:", depositsError);
        // Continue with goal deletion even if deposits fail
      }

      // Then delete the goal
      const { error } = await supabase
        .from("savings_goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;
      fetchSavingsGoals();
    } catch (error) {
      console.error("Error deleting savings goal:", error);
      alert("Failed to delete savings goal");
    }
  };

  const calculateProgress = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header/Navbar */}
      <Navbar currentPage="savings" onNavigate={onNavigate} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 sm:pb-24">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 sm:mb-8 gap-3 sm:gap-4">
          <div>
            <h2 className="text-2xl sm:text-4xl font-bold text-teal-700 dark:text-white font-playfair mb-2 flex items-center gap-2 sm:gap-3">
              <Wallet className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
              Savings Goals
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Track your savings progress and achieve your financial goals
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg font-semibold transition shadow-lg hover:shadow-xl"
          >
            + Add Savings Goal
          </button>
        </div>

        {/* Notification Prompt */}
        <SimpleNotificationPrompt />

        {/* Savings Goals Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        ) : savingsGoals.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 sm:p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg mb-4">
              No savings goals yet
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm sm:text-base mb-6">
              Create your first savings goal to start tracking your progress!
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg font-semibold transition"
            >
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {savingsGoals.map((goal) => {
              const progress = calculateProgress(
                goal.current_amount,
                goal.target_amount
              );
              const isCompleted = goal.current_amount >= goal.target_amount;

              return (
                <div
                  key={goal.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition"
                >
                  {/* Goal Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                        {goal.name}
                      </h3>
                      {goal.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {goal.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-2"
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

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        Progress
                      </span>
                      <span
                        className={`font-semibold ${
                          isCompleted ? "text-green-600" : "text-teal-600"
                        } dark:text-teal-400`}
                      >
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${
                          isCompleted ? "bg-green-500" : "bg-teal-600"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Amount Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Current:
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-white">
                        {formatCurrency(goal.current_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Target:
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-white">
                        {formatCurrency(goal.target_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Remaining:
                      </span>
                      <span className="font-semibold text-teal-600 dark:text-teal-400">
                        {formatCurrency(
                          Math.max(0, goal.target_amount - goal.current_amount)
                        )}
                      </span>
                    </div>
                    {goal.deadline && (
                      <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">
                          Deadline:
                        </span>
                        <span className="font-semibold text-gray-800 dark:text-white">
                          {new Date(goal.deadline).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Update Amount */}
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Add amount"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && e.target.value) {
                          handleUpdateAmount(
                            goal.id,
                            parseFloat(goal.current_amount) +
                              parseFloat(e.target.value)
                          );
                          e.target.value = "";
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.target.previousElementSibling;
                        if (input.value) {
                          handleUpdateAmount(
                            goal.id,
                            parseFloat(goal.current_amount) +
                              parseFloat(input.value)
                          );
                          input.value = "";
                        }
                      }}
                      className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                    >
                      +
                    </button>
                  </div>

                  {isCompleted && (
                    <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                      <span className="text-green-700 dark:text-green-400 font-semibold flex items-center justify-center gap-2">
                        <PartyPopper className="w-5 h-5 animate-bounce" />
                        Goal Achieved!
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                Add Savings Goal
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

            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Goal Name *
                </label>
                <input
                  type="text"
                  required
                  value={newGoal.name}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, name: e.target.value })
                  }
                  placeholder="e.g., Emergency Fund, New Car"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={newGoal.target_amount}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, target_amount: e.target.value })
                  }
                  placeholder="100000"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newGoal.current_amount}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, current_amount: e.target.value })
                  }
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, deadline: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, description: e.target.value })
                  }
                  placeholder="Add notes about this goal..."
                  rows="3"
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
                  Add Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Assistant */}
      <AIAssistant
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        onTransactionParsed={(transaction) => {
          setIsAIAssistantOpen(false);
          fetchSavingsGoals();
        }}
        categories={categories}
        financialData={{
          savingsGoals: savingsGoals,
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
}
