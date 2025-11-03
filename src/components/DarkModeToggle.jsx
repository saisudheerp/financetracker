import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const DarkModeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-teal-100 dark:bg-indigo-900 text-teal-700 dark:text-indigo-300 hover:bg-teal-200 dark:hover:bg-indigo-800 transition-colors duration-200"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
};

export default DarkModeToggle;
