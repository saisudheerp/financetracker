import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  CreditCard,
  Banknote,
  Building2,
  Smartphone,
  FileText,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { getIconComponent } from "../utils/iconMapper.jsx";
import { notifyTransaction } from "../utils/notificationUtils";

const AddTransactionModal = ({ isOpen, onClose, onTransactionAdded }) => {
  const { user } = useAuth();
  const { isDark } = useTheme();

  // Helper function to get date in IST (India Standard Time) in YYYY-MM-DD format
  const getLocalDate = () => {
    const today = new Date();
    // Convert to IST (UTC+5:30)
    const istDate = new Date(
      today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, "0");
    const day = String(istDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    amount: "",
    type: "expense",
    category_id: "",
    description: "",
    payment_method: "upi",
    transaction_date: getLocalDate(),
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const paymentMethods = [
    { value: "upi", label: "UPI", icon: CreditCard },
    { value: "cash", label: "Cash", icon: Banknote },
    { value: "debit_card", label: "Debit Card", icon: CreditCard },
    { value: "credit_card", label: "Credit Card", icon: CreditCard },
    { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
    { value: "wallet", label: "Digital Wallet", icon: Smartphone },
    { value: "cheque", label: "Cheque", icon: FileText },
    { value: "other", label: "Other", icon: RefreshCw },
  ];

  // Fetch categories when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, formData.type]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", formData.type)
        .order("name");

      if (error) throw error;
      setCategories(data || []);

      // Set default category based on type
      if (data && data.length > 0) {
        if (formData.type === "income") {
          // Find "Salary" category for income, fallback to first
          const salaryCategory = data.find(
            (cat) => cat.name.toLowerCase() === "salary"
          );
          setFormData((prev) => ({
            ...prev,
            category_id: salaryCategory ? salaryCategory.id : data[0].id,
          }));
        } else if (!formData.category_id) {
          // For expense, set first category as default
          setFormData((prev) => ({ ...prev, category_id: data[0].id }));
        }
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Reset category when type changes
    if (name === "type") {
      setFormData((prev) => ({ ...prev, category_id: "" }));
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setFormData((prev) => ({ ...prev, amount: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Please enter a valid amount");
      setLoading(false);
      return;
    }

    if (!formData.category_id) {
      setError("Please select a category");
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from("transactions")
        .insert([
          {
            user_id: user.id,
            amount: parseFloat(formData.amount),
            type: formData.type,
            category_id: formData.category_id,
            description: formData.description.trim(),
            payment_method: formData.payment_method,
            transaction_date: formData.transaction_date,
          },
        ]);

      if (insertError) throw insertError;

      // Show browser notification
      notifyTransaction({
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description.trim() || "Transaction",
      });

      // Reset form
      setFormData({
        amount: "",
        type: "expense",
        category_id: "",
        description: "",
        payment_method: "upi",
        transaction_date: getLocalDate(),
      });

      // Notify parent component
      if (onTransactionAdded) {
        onTransactionAdded();
      }

      onClose();
    } catch (err) {
      console.error("Error adding transaction:", err);
      setError(err.message || "Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto transform transition-all">
        {/* Header with Gradient */}
        <div
          className={`p-6 ${
            formData.type === "income"
              ? "bg-gradient-to-r from-emerald-400 to-teal-500 dark:from-green-500 dark:to-emerald-600"
              : "bg-gradient-to-r from-rose-400 to-pink-500 dark:from-red-500 dark:to-pink-600"
          } text-white rounded-t-3xl`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold font-playfair mb-1 flex items-center gap-3">
                {formData.type === "income" ? (
                  <>
                    <TrendingUp className="w-8 h-8 animate-bounce" />
                    Add Income
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-8 h-8 animate-bounce" />
                    Add Expense
                  </>
                )}
              </h2>
              <p className="text-sm opacity-90 font-poppins">
                Track your {formData.type} transaction
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
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
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 px-4 py-3 rounded-r-lg text-sm flex items-center gap-2">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Transaction Type Toggle */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 font-poppins">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    type: "expense",
                    category_id: "",
                  }))
                }
                className={`py-4 px-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 font-oswald text-lg flex items-center justify-center gap-2 ${
                  formData.type === "expense"
                    ? "bg-gradient-to-r from-rose-400 to-pink-500 dark:from-red-500 dark:to-pink-600 text-white shadow-lg scale-105"
                    : "bg-gray-100 dark:bg-gray-700 text-teal-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-gray-600"
                }`}
              >
                <TrendingDown
                  className={`w-5 h-5 ${
                    formData.type === "expense" ? "animate-pulse" : ""
                  }`}
                />
                Expense
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    type: "income",
                    category_id: "",
                  }))
                }
                className={`py-4 px-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 font-oswald text-lg flex items-center justify-center gap-2 ${
                  formData.type === "income"
                    ? "bg-gradient-to-r from-emerald-400 to-teal-500 dark:from-green-500 dark:to-emerald-600 text-white shadow-lg scale-105"
                    : "bg-gray-100 dark:bg-gray-700 text-teal-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-gray-600"
                }`}
              >
                <TrendingUp
                  className={`w-5 h-5 ${
                    formData.type === "income" ? "animate-pulse" : ""
                  }`}
                />
                Income
              </button>
            </div>
          </div>

          {/* Amount with Enhanced Design */}
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 font-poppins"
            >
              Amount
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-2xl font-bold">
                ₹
              </span>
              <input
                type="text"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-2xl font-bold transition-all"
                required
              />
            </div>
          </div>

          {/* Category with Icons */}
          <div>
            <label
              htmlFor="category_id"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 font-poppins"
            >
              Category {formData.type === "income" && "(Default: Salary)"}
            </label>
            <div className="relative">
              <select
                id="category_id"
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none cursor-pointer text-lg"
                required
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 font-poppins"
            >
              Description{" "}
              <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add notes about this transaction..."
              rows="3"
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
            />
          </div>

          {/* Payment Method with Icons Grid */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 font-poppins">
              Payment Method
            </label>
            <div className="grid grid-cols-4 gap-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        payment_method: method.value,
                      }))
                    }
                    className={`p-3 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-1 hover:scale-105 ${
                      formData.payment_method === method.value
                        ? "bg-gradient-to-br from-teal-400 to-indigo-500 dark:from-indigo-500 dark:to-teal-600 text-white shadow-lg scale-105"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-gray-600"
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${
                        formData.payment_method === method.value
                          ? "animate-pulse"
                          : ""
                      }`}
                    />
                    <span className="text-xs font-medium">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transaction Date */}
          <div>
            <label
              htmlFor="transaction_date"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 font-poppins"
            >
              Date
            </label>
            <input
              type="date"
              id="transaction_date"
              name="transaction_date"
              value={formData.transaction_date}
              onChange={handleChange}
              max={getLocalDate()}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
              required
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-oswald text-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-6 py-4 rounded-xl font-bold text-white transition-all font-oswald text-lg transform hover:scale-105 ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : formData.type === "expense"
                  ? "bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 dark:from-red-500 dark:to-pink-600 dark:hover:from-red-600 dark:hover:to-pink-700 shadow-lg hover:shadow-xl"
                  : "bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 dark:from-green-500 dark:to-emerald-600 dark:hover:from-green-600 dark:hover:to-emerald-700 shadow-lg hover:shadow-xl"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="animate-spin h-5 w-5" />
                  Adding...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {formData.type === "income" ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <TrendingDown className="w-5 h-5" />
                  )}
                  Add {formData.type === "income" ? "Income" : "Expense"}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
