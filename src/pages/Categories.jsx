import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Navbar from "../components/Navbar";
import { renderIcon } from "../utils/iconMapper.jsx";
import {
  Wallet,
  Briefcase,
  TrendingUp,
  Gift,
  TrendingDown,
  Utensils,
  Car,
  Home,
  Pill,
  Film,
  ShoppingCart,
  BookOpen,
  Wrench,
  CreditCard,
  Target,
  Plane,
  Gamepad2,
  Shirt,
  Dumbbell,
  Smartphone,
  FileText,
} from "lucide-react";

const Categories = ({ onNavigate }) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [categories, setCategories] = useState({ income: [], expense: [] });
  const [newCategory, setNewCategory] = useState({
    name: "",
    type: "expense",
    icon: "FileText",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("type")
        .order("name");

      if (error) throw error;

      const income = data.filter((cat) => cat.type === "income");
      const expense = data.filter((cat) => cat.type === "expense");
      setCategories({ income, expense });
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!newCategory.name.trim()) {
      setError("Category name is required");
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase.from("categories").insert([
        {
          user_id: user.id,
          name: newCategory.name.trim(),
          type: newCategory.type,
          icon: newCategory.icon,
        },
      ]);

      if (insertError) throw insertError;

      setSuccess("Category added successfully!");
      setNewCategory({ name: "", type: "expense", icon: "FileText" });
      fetchCategories();
    } catch (err) {
      console.error("Error adding category:", err);
      setError(err.message || "Failed to add category");
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;

      setSuccess("Category deleted successfully!");
      fetchCategories();
    } catch (err) {
      console.error("Error deleting category:", err);
      setError(err.message || "Failed to delete category");
    }
  };

  const commonIcons = [
    { name: "Wallet", icon: Wallet },
    { name: "Briefcase", icon: Briefcase },
    { name: "TrendingUp", icon: TrendingUp },
    { name: "Gift", icon: Gift },
    { name: "TrendingDown", icon: TrendingDown },
    { name: "Utensils", icon: Utensils },
    { name: "Car", icon: Car },
    { name: "Home", icon: Home },
    { name: "Pill", icon: Pill },
    { name: "Film", icon: Film },
    { name: "ShoppingCart", icon: ShoppingCart },
    { name: "BookOpen", icon: BookOpen },
    { name: "Wrench", icon: Wrench },
    { name: "CreditCard", icon: CreditCard },
    { name: "Target", icon: Target },
    { name: "Plane", icon: Plane },
    { name: "Gamepad2", icon: Gamepad2 },
    { name: "Shirt", icon: Shirt },
    { name: "Dumbbell", icon: Dumbbell },
    { name: "Smartphone", icon: Smartphone },
  ];

  return (
    <div className="bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <Navbar currentPage="categories" onNavigate={onNavigate} />

      <div className="max-w-5xl mx-auto p-3 sm:p-6 pb-20 sm:pb-24">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-teal-700 dark:text-white font-playfair mb-2">
            Manage Categories
          </h1>
          <p className="text-sm sm:text-base text-teal-600 dark:text-gray-400">
            Add custom categories for better transaction organization
          </p>
        </div>

        {/* Add Category Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-teal-700 dark:text-white mb-3 sm:mb-4 font-playfair">
            Add New Category
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-3 sm:mb-4 text-xs sm:text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-3 sm:mb-4 text-xs sm:text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, name: e.target.value })
                  }
                  placeholder="e.g., Groceries"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={newCategory.type}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, type: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
            </div>

            {/* Icon Picker */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Select Icon
              </label>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {commonIcons.map((iconData) => {
                  const Icon = iconData.icon;
                  return (
                    <button
                      key={iconData.name}
                      type="button"
                      onClick={() =>
                        setNewCategory({ ...newCategory, icon: iconData.name })
                      }
                      className={`p-3 rounded-lg transition-all duration-200 hover:scale-110 ${
                        newCategory.icon === iconData.name
                          ? "bg-gradient-to-br from-teal-400 to-indigo-500 dark:from-indigo-500 dark:to-teal-600 text-white ring-2 ring-teal-500 dark:ring-indigo-500 scale-110"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-gray-600"
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${
                          newCategory.icon === iconData.name
                            ? "animate-pulse"
                            : ""
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full md:w-auto px-8 py-3 rounded-xl font-semibold text-white transition-all font-oswald ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-teal-600 hover:bg-teal-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 shadow-lg hover:shadow-xl"
              }`}
            >
              {loading ? "Adding..." : "Add Category"}
            </button>
          </form>
        </div>

        {/* Categories List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income Categories */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-4 flex items-center gap-2 font-playfair">
              <TrendingUp className="w-6 h-6 animate-pulse" /> Income Categories
              ({categories.income.length})
            </h3>
            <div className="space-y-2">
              {categories.income.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No income categories yet
                </p>
              ) : (
                categories.income.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg group hover:scale-105 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg group-hover:animate-pulse">
                        {renderIcon(
                          category.icon,
                          "w-6 h-6 text-green-600 dark:text-green-400"
                        )}
                      </div>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {category.name}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
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
                ))
              )}
            </div>
          </div>

          {/* Expense Categories */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2 font-playfair">
              <TrendingDown className="w-6 h-6 animate-pulse" /> Expense
              Categories ({categories.expense.length})
            </h3>
            <div className="space-y-2">
              {categories.expense.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No expense categories yet
                </p>
              ) : (
                categories.expense.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg group hover:scale-105 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg group-hover:animate-pulse">
                        {renderIcon(
                          category.icon,
                          "w-6 h-6 text-red-600 dark:text-red-400"
                        )}
                      </div>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {category.name}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
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
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;
