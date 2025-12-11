import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { requestNotificationPermission } from "../utils/notificationUtils";

/**
 * Simple notification prompt for Budget and Savings pages
 * Shows only if notifications are not enabled
 */
export default function SimpleNotificationPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      const permission = Notification.permission;
      const hasSeenBanner = localStorage.getItem("notificationBannerSeen");

      // Show only if permission is default (not asked yet) OR denied but they dismissed the main banner
      if (permission === "default" && hasSeenBanner) {
        setShow(true);
      }
    }
  }, []);

  const handleEnable = async () => {
    const granted = await requestNotificationPermission();
    if (granted || Notification.permission === "denied") {
      setShow(false);
    }
  };

  if (!show) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-teal-300 dark:border-indigo-600 rounded-xl p-4 flex items-center gap-4">
      <div className="flex-shrink-0 bg-teal-500 dark:bg-indigo-500 text-white rounded-full p-2">
        <Bell className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-teal-900 dark:text-gray-200 font-medium">
          🎯 <span className="font-bold">Get alerts!</span> Never miss budget
          warnings or savings wins.
        </p>
      </div>
      <button
        onClick={handleEnable}
        className="flex-shrink-0 bg-teal-600 hover:bg-teal-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition transform hover:scale-105"
      >
        Enable
      </button>
    </div>
  );
}
