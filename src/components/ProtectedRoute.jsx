import React from "react";
import { useAuth } from "../context/AuthContext";

/**
 * ACCESS CONTROL RULE: Protected Route Component
 * Only authenticated users can access protected routes
 * Unauthenticated users are redirected to login
 */
const ProtectedRoute = ({ children, fallback = null }) => {
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="font-poppins text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // ACCESS CONTROL: Redirect to login if not authenticated
  if (!user) {
    return (
      fallback || (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <svg
              className="w-16 h-16 mx-auto text-red-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <h2 className="font-playfair text-2xl font-bold text-gray-800 mb-2">
              Access Denied
            </h2>
            <p className="font-poppins text-gray-600 mb-6">
              You need to be logged in to access this page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-oswald px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300"
            >
              GO TO LOGIN
            </button>
          </div>
        </div>
      )
    );
  }

  // User is authenticated, render protected content
  return <>{children}</>;
};

export default ProtectedRoute;
