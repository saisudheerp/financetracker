import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { validatePassword, getPasswordStrength } from "../utils/authUtils";
import { useToast } from "../context/ToastContext";

const ResetPassword = ({ onBack }) => {
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);

  useEffect(() => {
    // Check if user has a valid recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValidSession(true);
      }
    });
  }, []);

  const handlePasswordChange = (value) => {
    setPassword(value);
    if (value) {
      setPasswordStrength(getPasswordStrength(value));
    } else {
      setPasswordStrength(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      showToast(passwordValidation.errors.join(" "), "error", 5000);
      setLoading(false);
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      showToast("Passwords do not match. Please check and try again.", "error");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      showToast("Password updated successfully! Redirecting... ✅", "success");

      // Sign out and redirect to login
      setTimeout(async () => {
        await supabase.auth.signOut();
        if (onBack) onBack();
      }, 2000);
    } catch (error) {
      showToast(
        error.message || "Failed to update password. Please try again.",
        "error",
        5000
      );
      console.error("Update password error:", error);
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
            Set your new password
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-8">
          {onBack && (
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
          )}

          <div className="text-center mb-4 sm:mb-6">
            <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-teal-700 dark:text-gray-100">
              Reset Password
            </h2>
            <p className="font-poppins text-teal-600 dark:text-gray-400 text-xs sm:text-sm mt-2">
              Enter your new password below
            </p>
          </div>

          {!isValidSession ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-500 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded-lg font-poppins text-sm mb-6">
              <p className="font-semibold mb-2">
                Invalid or expired reset link!
              </p>
              <p className="text-xs">
                Please request a new password reset link.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* New Password Field */}
              <div className="space-y-2">
                <label className="font-poppins text-sm font-medium text-teal-700 dark:text-gray-300 block">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 font-poppins border-2 border-teal-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:focus:ring-indigo-800 outline-none transition-all duration-300"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-600 dark:text-gray-400 hover:text-teal-700 dark:hover:text-gray-300"
                  >
                    {showPassword ? (
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
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    ) : (
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
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="font-poppins text-xs text-teal-600 dark:text-gray-400">
                  Must be 8+ characters with uppercase, lowercase, number, and
                  special character
                </p>

                {/* Password Strength Indicator */}
                {passwordStrength && password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-poppins text-xs font-medium text-gray-600 dark:text-gray-400">
                        Password Strength:
                      </span>
                      <span
                        className={`font-poppins text-xs font-semibold ${
                          passwordStrength.color === "red"
                            ? "text-red-600 dark:text-red-400"
                            : passwordStrength.color === "yellow"
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          passwordStrength.color === "red"
                            ? "bg-red-500 w-1/3"
                            : passwordStrength.color === "yellow"
                            ? "bg-yellow-500 w-2/3"
                            : "bg-green-500 w-full"
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label className="font-poppins text-sm font-medium text-teal-700 dark:text-gray-300 block">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 font-poppins border-2 border-teal-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:focus:ring-indigo-800 outline-none transition-all duration-300"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 dark:from-indigo-600 dark:to-purple-600 text-white font-oswald text-lg py-3 rounded-lg hover:from-teal-600 hover:to-cyan-600 dark:hover:from-indigo-700 dark:hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "UPDATING PASSWORD..." : "UPDATE PASSWORD"}
              </button>
            </form>
          )}

          {!isValidSession && onBack && (
            <button
              onClick={onBack}
              className="w-full mt-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-oswald text-lg py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300"
            >
              BACK TO LOGIN
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
