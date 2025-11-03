// Authentication utility functions with security rules

/**
 * Password validation with strength requirements
 * Rule: At least 8 characters, mix of letters, numbers, and symbols
 */
export const validatePassword = (password) => {
  const errors = [];

  // Minimum length check
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push(
      "Password must contain at least one special character (!@#$%^&* etc.)"
    );
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
};

/**
 * Get password strength level
 */
export const getPasswordStrength = (password) => {
  let strength = 0;

  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;

  if (strength <= 2) return { level: "weak", color: "red", label: "Weak" };
  if (strength <= 4)
    return { level: "medium", color: "yellow", label: "Medium" };
  return { level: "strong", color: "green", label: "Strong" };
};

/**
 * Email validation
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if user session is valid
 */
export const isSessionValid = (session) => {
  if (!session) return false;

  const expiresAt = session.expires_at;
  const now = Math.floor(Date.now() / 1000);

  return expiresAt > now;
};

/**
 * Format authentication errors for user-friendly messages
 */
export const formatAuthError = (error) => {
  const errorMessage = error.message.toLowerCase();

  // Handle common Supabase auth errors
  if (errorMessage.includes("invalid login credentials")) {
    return "Invalid email or password. Please check your credentials and try again.";
  }

  if (
    errorMessage.includes("email already registered") ||
    errorMessage.includes("user already registered")
  ) {
    return "This email is already registered. Please login or use a different email.";
  }

  if (errorMessage.includes("email not confirmed")) {
    return "Please verify your email address before logging in. Check your inbox for the verification link.";
  }

  if (errorMessage.includes("invalid email")) {
    return "Please enter a valid email address.";
  }

  if (errorMessage.includes("password")) {
    return "Password does not meet security requirements. Please choose a stronger password.";
  }

  if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
    return "Network error. Please check your internet connection and try again.";
  }

  if (errorMessage.includes("rate limit")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }

  // Return original message if no specific match
  return error.message;
};

/**
 * Sanitize user input to prevent injection attacks
 */
export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;

  return input
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "");
};
