import { useState, useEffect, lazy, Suspense } from "react";
import "./App.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useToast } from "./context/ToastContext";
import { supabase } from "./supabaseClient";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { requestNotificationPermission } from "./utils/notificationUtils";

// Lazy load all page components
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Categories = lazy(() => import("./pages/Categories"));
const Savings = lazy(() => import("./pages/Savings"));
const RecurringTransactions = lazy(() =>
  import("./pages/RecurringTransactions")
);
const BudgetGoals = lazy(() => import("./pages/BudgetGoals"));
const ProtectedRoute = lazy(() => import("./components/ProtectedRoute"));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-teal-600 dark:border-indigo-600 border-t-transparent"></div>
      <p className="font-poppins text-teal-600 dark:text-gray-400 mt-4">
        Loading...
      </p>
    </div>
  </div>
);

function AppContent() {
  const { showToast } = useToast();
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const { user, loading } = useAuth();

  useEffect(() => {
    // Request notification permission when user logs in
    if (user) {
      requestNotificationPermission();
    }

    // Listen for auth state changes (including password recovery and email confirmation)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event);

      if (event === "PASSWORD_RECOVERY") {
        setShowResetPassword(true);
      } else if (event === "SIGNED_IN") {
        // Check if this is from email confirmation
        const params = new URLSearchParams(window.location.search);
        const type = params.get("type");

        if (type === "signup") {
          // User just confirmed their email
          showToast(
            "Email verified! Welcome to Spends-In! 🎉",
            "success",
            5000
          );
          // Clean up URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [showToast]);

  // Show loading state while checking authentication
  if (loading) {
    return <PageLoader />;
  }

  // Show reset password page if needed
  if (showResetPassword) {
    return (
      <Suspense fallback={<PageLoader />}>
        <ResetPassword onBack={() => setShowResetPassword(false)} />
      </Suspense>
    );
  }

  // ACCESS CONTROL RULE: Show Dashboard if authenticated, Login if not
  if (user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <ProtectedRoute>
          {currentPage === "dashboard" && (
            <Dashboard onNavigate={setCurrentPage} />
          )}
          {currentPage === "transactions" && (
            <Transactions onNavigate={setCurrentPage} />
          )}
          {currentPage === "analytics" && (
            <Analytics onNavigate={setCurrentPage} />
          )}
          {currentPage === "categories" && (
            <Categories onNavigate={setCurrentPage} />
          )}
          {currentPage === "savings" && <Savings onNavigate={setCurrentPage} />}
          {currentPage === "recurring" && (
            <RecurringTransactions onNavigate={setCurrentPage} />
          )}
          {currentPage === "budgets" && (
            <BudgetGoals onNavigate={setCurrentPage} />
          )}
        </ProtectedRoute>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Login />
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
        <SpeedInsights />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
