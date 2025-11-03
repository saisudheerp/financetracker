import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { isSessionValid } from "../utils/authUtils";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // SESSION RULE: Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && isSessionValid(session)) {
        setSession(session);
        setUser(session.user);
      } else {
        // SESSION RULE: Auto logout if token expired
        if (session) {
          handleLogout();
        }
      }
      setLoading(false);
    });

    // SESSION RULE: Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && isSessionValid(session)) {
        setSession(session);
        setUser(session.user);
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // SESSION RULE: Logout function
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // PROFILE EDIT RULE: Update user profile (only own profile)
  const updateProfile = async (updates) => {
    try {
      if (!user) {
        throw new Error("No authenticated user");
      }

      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) throw error;

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (error) {
      console.error("Profile update error:", error);
      return { success: false, error: error.message };
    }
  };

  // ACCOUNT DELETION RULE: Delete user account and all data
  const deleteAccount = async () => {
    try {
      if (!user) {
        throw new Error("No authenticated user");
      }

      // This requires admin access in Supabase
      // For now, we'll sign out and mark for deletion
      // You need to set up a deletion trigger in Supabase or use a server function

      const { error } = await supabase.auth.admin.deleteUser(user.id);

      if (error) {
        // If admin deletion fails, use regular signOut
        await handleLogout();
        throw new Error(
          "Account deletion requires admin privileges. Please contact support."
        );
      }

      setUser(null);
      setSession(null);
      return { success: true };
    } catch (error) {
      console.error("Account deletion error:", error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut: handleLogout,
    updateProfile,
    deleteAccount,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
