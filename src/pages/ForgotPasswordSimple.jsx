import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useToast } from "../context/ToastContext";
import {
  validateEmail,
  validatePassword,
  getPasswordStrength,
} from "../utils/authUtils";

const ForgotPasswordSimple = ({ onBack }) => {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Send password reset email with magic link
  const handleSendReset = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      showToast("Please enter a valid email address.", "error");
      return;
    }

    setLoading(true);

    try {
      console.log("🔐 Sending password reset to:", email.toLowerCase().trim());

      // Supabase sends password reset email
      // When user clicks link, it triggers PASSWORD_RECOVERY event in App.jsx
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        {
          redirectTo: `${window.location.origin}`,
        }
      );

      if (error) throw error;

      console.log("✅ Password reset email sent!");
      showToast("Reset link sent! Check your email 📧", "success", 5000);
      setEmail("");
    } catch (error) {
      console.error("❌ Send reset error:", error);

      if (
        error.message.includes("rate limit") ||
        error.message.includes("Email rate limit")
      ) {
        showToast("Too many requests. Please wait 1 hour ⏰", "warning", 5000);
      } else if (error.message.includes("SMTP")) {
        showToast(
          "Email service error. Please check Supabase configuration.",
          "error",
          5000
        );
      } else {
        showToast(
          error.message || "Failed to send reset email. Please try again.",
          "error",
          5000
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="font-pacifico text-4xl sm:text-5xl text-teal-600 dark:text-indigo-400 mb-2">
            Spends-In
          </h1>
          <p className="font-lora mt-3 sm:mt-5 text-teal-600 dark:text-gray-400 italic text-xs sm:text-sm">
            Reset your password
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-8">
          <button
            onClick={onBack}
            className="flex items-center text-teal-600 dark:text-indigo-400 hover:text-teal-800 dark:hover:text-indigo-300 font-poppins text-sm font-medium mb-6 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Login
          </button>

          <div className="text-center mb-6">
            <h2 className="font-playfair text-3xl font-bold text-teal-700 dark:text-gray-100">
              Forgot Password?
            </h2>
            <p className="font-poppins text-teal-600 dark:text-gray-400 text-sm mt-2">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          <form onSubmit={handleSendReset} className="space-y-6">
            <div className="space-y-2">
              <label className="font-poppins text-sm font-medium text-teal-700 dark:text-gray-300 block">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 font-poppins border-2 border-teal-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:focus:ring-indigo-800 outline-none transition-all duration-300"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 dark:from-indigo-600 dark:to-purple-600 text-white font-oswald text-lg py-3 rounded-lg hover:from-teal-600 hover:to-cyan-600 dark:hover:from-indigo-700 dark:hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "SENDING LINK..." : "SEND RESET LINK"}
            </button>

            <div className="bg-teal-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="font-poppins text-xs text-teal-700 dark:text-gray-300">
                <strong>Note:</strong> You'll receive an email with a secure
                link. Click it to set a new password. Check your spam folder if
                you don't see it within a few minutes.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordSimple;
