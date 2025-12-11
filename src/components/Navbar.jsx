import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import DarkModeToggle from "./DarkModeToggle";
import {
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  Tags,
  Wallet,
  Repeat,
  Target,
  LogOut,
} from "lucide-react";

const Navbar = ({ onNavigate, currentPage }) => {
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  const isActive = (page) => currentPage === page;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6 sm:py-4">
          {/* Logo - Clickable to Dashboard */}
          <button
            onClick={() => onNavigate && onNavigate("dashboard")}
            className="text-3xl sm:text-4xl font-pacifico text-teal-600 dark:text-indigo-400 hover:opacity-80 transition-opacity"
          >
            Spends-In
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <nav className="flex items-center gap-2">
              <button
                onClick={() => onNavigate && onNavigate("dashboard")}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isActive("dashboard")
                    ? "bg-teal-100 dark:bg-indigo-900 text-teal-700 dark:text-indigo-300"
                    : "hover:bg-teal-50 dark:hover:bg-gray-700 text-teal-600 dark:text-gray-300"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => onNavigate && onNavigate("transactions")}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isActive("transactions")
                    ? "bg-teal-100 dark:bg-indigo-900 text-teal-700 dark:text-indigo-300"
                    : "hover:bg-teal-50 dark:hover:bg-gray-700 text-teal-600 dark:text-gray-300"
                }`}
              >
                Transactions
              </button>
              <button
                onClick={() => onNavigate && onNavigate("analytics")}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isActive("analytics")
                    ? "bg-teal-100 dark:bg-indigo-900 text-teal-700 dark:text-indigo-300"
                    : "hover:bg-teal-50 dark:hover:bg-gray-700 text-teal-600 dark:text-gray-300"
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => onNavigate && onNavigate("categories")}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isActive("categories")
                    ? "bg-teal-100 dark:bg-indigo-900 text-teal-700 dark:text-indigo-300"
                    : "hover:bg-teal-50 dark:hover:bg-gray-700 text-teal-600 dark:text-gray-300"
                }`}
              >
                Categories
              </button>

              {/* More Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
                    isActive("savings") ||
                    isActive("recurring") ||
                    isActive("budgets")
                      ? "bg-teal-100 dark:bg-indigo-900 text-teal-700 dark:text-indigo-300"
                      : "hover:bg-teal-50 dark:hover:bg-gray-700 text-teal-600 dark:text-gray-300"
                  }`}
                >
                  More
                  <svg
                    className="w-4 h-4"
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
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-50">
                    <button
                      onClick={() => {
                        onNavigate && onNavigate("savings");
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-teal-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      Savings Goals
                    </button>
                    <button
                      onClick={() => {
                        onNavigate && onNavigate("recurring");
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-teal-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
                    >
                      <Repeat className="w-4 h-4" />
                      Recurring
                    </button>
                    <button
                      onClick={() => {
                        onNavigate && onNavigate("budgets");
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-teal-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
                    >
                      <Target className="w-4 h-4" />
                      Budgets
                    </button>
                  </div>
                )}
              </div>
            </nav>

            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-poppins text-sm text-teal-600 dark:text-gray-400">
                  Welcome back,
                </p>
                <p className="font-playfair text-lg font-semibold text-teal-700 dark:text-gray-200">
                  {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
                </p>
              </div>

              <DarkModeToggle />

              <button
                onClick={handleLogout}
                className="bg-rose-400 hover:bg-rose-500 dark:bg-red-500 dark:hover:bg-red-600 text-white font-oswald px-4 py-2 rounded-lg transition-colors duration-300"
              >
                LOGOUT
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <DarkModeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-600 dark:text-gray-300"
            >
              {isMobileMenuOpen ? (
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
              ) : (
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-teal-200 dark:border-gray-700 pt-4 space-y-2 animate-fade-in">
            <button
              onClick={() => {
                onNavigate && onNavigate("dashboard");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                isActive("dashboard")
                  ? "bg-teal-100 dark:bg-indigo-900 text-teal-700 dark:text-indigo-300"
                  : "hover:bg-teal-50 dark:hover:bg-gray-700 text-teal-600 dark:text-gray-300"
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
            <button
              onClick={() => {
                onNavigate && onNavigate("transactions");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                isActive("transactions")
                  ? "bg-teal-100 dark:bg-indigo-900 text-teal-700 dark:text-indigo-300"
                  : "hover:bg-teal-50 dark:hover:bg-gray-700 text-teal-600 dark:text-gray-300"
              }`}
            >
              <CreditCard className="w-5 h-5" />
              Transactions
            </button>
            <button
              onClick={() => {
                onNavigate && onNavigate("analytics");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                isActive("analytics")
                  ? "bg-teal-100 dark:bg-indigo-900 text-teal-700 dark:text-indigo-300"
                  : "hover:bg-teal-50 dark:hover:bg-gray-700 text-teal-600 dark:text-gray-300"
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              Analytics
            </button>
            <button
              onClick={() => {
                onNavigate && onNavigate("categories");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                isActive("categories")
                  ? "bg-teal-100 dark:bg-indigo-900 text-teal-700 dark:text-indigo-300"
                  : "hover:bg-teal-50 dark:hover:bg-gray-700 text-teal-600 dark:text-gray-300"
              }`}
            >
              <Tags className="w-5 h-5" />
              Categories
            </button>
            <button
              onClick={() => {
                onNavigate && onNavigate("savings");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                isActive("savings")
                  ? "bg-teal-100 dark:bg-indigo-900 text-teal-700 dark:text-indigo-300"
                  : "hover:bg-teal-50 dark:hover:bg-gray-700 text-teal-600 dark:text-gray-300"
              }`}
            >
              <Wallet className="w-5 h-5" />
              Savings Goals
            </button>
            <button
              onClick={() => {
                onNavigate && onNavigate("recurring");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                isActive("recurring")
                  ? "bg-teal-100 dark:bg-indigo-900 text-teal-700 dark:text-indigo-300"
                  : "hover:bg-teal-50 dark:hover:bg-gray-700 text-teal-600 dark:text-gray-300"
              }`}
            >
              <Repeat className="w-5 h-5" />
              Recurring
            </button>
            <button
              onClick={() => {
                onNavigate && onNavigate("budgets");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                isActive("budgets")
                  ? "bg-teal-100 dark:bg-indigo-900 text-teal-700 dark:text-indigo-300"
                  : "hover:bg-teal-50 dark:hover:bg-gray-700 text-teal-600 dark:text-gray-300"
              }`}
            >
              <Target className="w-5 h-5" />
              Budgets
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 font-semibold transition-colors flex items-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
