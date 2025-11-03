import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import ForgotPasswordSimple from "./ForgotPasswordSimple";
import { useToast } from "../context/ToastContext";
import {
  validatePassword,
  getPasswordStrength,
  validateEmail,
  formatAuthError,
  sanitizeInput,
} from "../utils/authUtils";

const Login = () => {
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizeInput(value);

    setFormData({ ...formData, [name]: sanitizedValue });

    // Update password strength indicator for registration
    if (name === "password" && !isLogin) {
      if (sanitizedValue) {
        setPasswordStrength(getPasswordStrength(sanitizedValue));
      } else {
        setPasswordStrength(null);
      }
    }
  };

  const validateForm = () => {
    // Email validation
    if (!validateEmail(formData.email)) {
      showToast("Please enter a valid email address.", "error");
      return false;
    }

    if (!isLogin) {
      // Registration validation

      // Name validation
      if (!formData.name || formData.name.trim().length < 2) {
        showToast(
          "Please enter your full name (at least 2 characters).",
          "error"
        );
        return false;
      }

      // Password strength validation
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        showToast(passwordValidation.errors.join(" "), "error");
        return false;
      }

      // Password confirmation
      if (formData.password !== formData.confirmPassword) {
        showToast(
          "Passwords do not match. Please check and try again.",
          "error"
        );
        return false;
      }
    } else {
      // Login validation
      if (!formData.password || formData.password.length < 6) {
        showToast("Please enter your password.", "error");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // LOGIN VALIDATION RULE: Check credentials
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
        });

        if (error) {
          console.error("Login error:", error);
          console.error("Error message:", error.message);

          // Handle email verification requirement
          if (error.message.includes("Email not confirmed")) {
            showToast(
              "Please verify your email address before logging in. Check your inbox for the verification link.",
              "error",
              5000
            );
            setLoading(false);
            return;
          }

          // Supabase returns "Invalid login credentials" for both wrong password and non-existent user
          // This is intentional for security (don't reveal if email exists)
          if (
            error.message.includes("Invalid login credentials") ||
            error.message.includes("Invalid login") ||
            error.message.includes("User not found")
          ) {
            showToast(
              "Invalid email or password. Please check your credentials and try again.",
              "error",
              5000
            );
            setLoading(false);
            return;
          }

          // For any other auth error
          const errorMsg = formatAuthError(error);
          showToast(errorMsg, "error", 5000);
          setLoading(false);
          return;
        }

        // SESSION RULE: Store session automatically handled by Supabase
        showToast("Welcome back! 👋", "success");
        console.log("User logged in:", data);

        // Clear form
        setFormData({ name: "", email: "", password: "", confirmPassword: "" });

        // TODO: Redirect to dashboard after successful login
        setTimeout(() => {
          console.log("Redirect to dashboard");
        }, 1500);
      } else {
        // REGISTER - Check if user already exists first
        console.log("Checking if user exists...");

        // Check if email already exists
        const { data: existingUsers, error: checkError } = await supabase
          .from("auth.users")
          .select("email")
          .eq("email", formData.email.toLowerCase().trim());

        // Since we can't query auth.users directly, we'll let Supabase handle it
        // and catch the duplicate error

        // PASSWORD SECURITY RULE: Password is hashed by Supabase automatically
        const { data, error } = await supabase.auth.signUp({
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          options: {
            data: {
              full_name: formData.name.trim(),
            },
            // ACCOUNT VERIFICATION RULE: Redirect to dashboard after email confirmation
            emailRedirectTo: `${window.location.origin}`,
          },
        });

        if (error) {
          console.error("Signup error:", error);

          // Handle specific auth errors
          if (
            error.message.includes("already registered") ||
            error.message.includes("already exists") ||
            error.message.includes("User already registered")
          ) {
            throw new Error(
              "This email is already registered. Please login or use a different email."
            );
          }

          // Database trigger errors prevent user creation - show clear message
          if (
            error.message.includes("Database error") ||
            error.message.includes("trigger")
          ) {
            throw new Error(
              "Account creation failed due to a database issue. Please contact support or try disabling email confirmation in Supabase settings."
            );
          }

          throw error;
        }

        // Check if user was actually created or if it already existed
        if (data?.user) {
          // If user.identities is empty, it means user already exists
          if (data.user.identities && data.user.identities.length === 0) {
            throw new Error(
              "This email is already registered. Please login instead."
            );
          }

          // User was created successfully
          // Check if email confirmation is required
          if (!data.session) {
            showToast(
              "Account created! Check your email to verify ✉️",
              "success",
              5000
            );
          } else {
            showToast("Account created successfully! 🎉", "success");
          }

          console.log("User registered:", data);

          // Clear form and switch to login after registration
          setFormData({
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
          });
          setPasswordStrength(null);

          // Auto-switch to login after 3 seconds
          setTimeout(() => {
            setIsLogin(true);
          }, 3000);
        }
      }
    } catch (error) {
      // Format error messages for better user experience
      const userFriendlyError = formatAuthError(error);
      showToast(userFriendlyError, "error", 5000);
      console.error("Auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return <ForgotPasswordSimple onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="font-pacifico text-4xl sm:text-5xl text-teal-600 dark:text-indigo-400 mb-2">
            Spends-In
          </h1>
          <p className="font-lora mt-3 sm:mt-5 text-teal-600 dark:text-gray-400 italic text-xs sm:text-sm">
            Manage your finances with elegance
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Toggle Tabs */}
          <div className="flex">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 sm:py-4 font-oswald text-base sm:text-lg font-semibold transition-all duration-300 ${
                isLogin
                  ? "bg-teal-600 dark:bg-indigo-600 text-white"
                  : "bg-teal-50 dark:bg-gray-700 text-teal-600 dark:text-gray-400 hover:bg-teal-100 dark:hover:bg-gray-600"
              }`}
            >
              LOGIN
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 sm:py-4 font-oswald text-base sm:text-lg font-semibold transition-all duration-300 ${
                !isLogin
                  ? "bg-teal-600 dark:bg-indigo-600 text-white"
                  : "bg-teal-50 dark:bg-gray-700 text-teal-600 dark:text-gray-400 hover:bg-teal-100 dark:hover:bg-gray-600"
              }`}
            >
              REGISTER
            </button>
          </div>

          {/* Form Section */}
          <form
            onSubmit={handleSubmit}
            className="p-5 sm:p-8 space-y-4 sm:space-y-6"
          >
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-teal-700 dark:text-gray-100">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="font-poppins text-teal-600 dark:text-gray-400 text-xs sm:text-sm mt-2">
                {isLogin
                  ? "Enter your credentials to access your account"
                  : "Fill in the details to get started"}
              </p>
            </div>

            {/* Name Field (Register Only) */}
            {!isLogin && (
              <div className="space-y-2">
                <label className="font-poppins text-sm font-medium text-teal-700 dark:text-gray-300 block">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 font-poppins border-2 border-teal-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:focus:ring-indigo-800 outline-none transition-all duration-300"
                  required={!isLogin}
                />
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label className="font-poppins text-sm font-medium text-teal-700 dark:text-gray-300 block">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full px-4 py-3 font-poppins border-2 border-teal-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:focus:ring-indigo-800 outline-none transition-all duration-300"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="font-poppins text-sm font-medium text-teal-700 dark:text-gray-300 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 font-poppins border-2 border-teal-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:focus:ring-indigo-800 outline-none transition-all duration-300"
                  required
                  minLength={isLogin ? 6 : 8}
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
              {!isLogin && (
                <p className="font-poppins text-xs text-teal-600 dark:text-gray-400">
                  Must be 8+ characters with uppercase, lowercase, number, and
                  special character
                </p>
              )}

              {/* Password Strength Indicator */}
              {!isLogin && passwordStrength && formData.password && (
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

            {/* Confirm Password (Register Only) */}
            {!isLogin && (
              <div className="space-y-2">
                <label className="font-poppins text-sm font-medium text-teal-700 dark:text-gray-300 block">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 font-poppins border-2 border-teal-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:focus:ring-indigo-800 outline-none transition-all duration-300"
                  required={!isLogin}
                />
              </div>
            )}

            {/* Forgot Password Link (Login Only) */}
            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="font-poppins text-sm text-teal-600 dark:text-indigo-400 hover:text-teal-700 dark:hover:text-indigo-300 font-medium transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 dark:from-indigo-600 dark:to-purple-600 text-white font-oswald text-lg py-3 rounded-lg hover:from-teal-600 hover:to-cyan-600 dark:hover:from-indigo-700 dark:hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? isLogin
                  ? "LOGGING IN..."
                  : "CREATING ACCOUNT..."
                : isLogin
                ? "LOGIN"
                : "CREATE ACCOUNT"}
            </button>

            {/* Terms (Register Only) */}
            {!isLogin && (
              <p className="font-poppins text-xs text-teal-600 dark:text-gray-400 text-center mt-4">
                By creating an account, you agree to our{" "}
                <a
                  href="#"
                  className="text-teal-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  className="text-teal-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  Privacy Policy
                </a>
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="font-poppins text-center text-teal-600 dark:text-gray-400 text-sm mt-6">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-teal-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
