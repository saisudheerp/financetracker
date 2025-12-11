import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { requestNotificationPermission } from "../utils/notificationUtils";

export default function NotificationSettings() {
  const [notificationStatus, setNotificationStatus] = useState("default");
  const [showBanner, setShowBanner] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationStatus(Notification.permission);

      // Check if user has already seen the banner
      const hasSeenBanner = localStorage.getItem("notificationBannerSeen");
      const permission = Notification.permission;

      // Show banner only if permission is default and user hasn't dismissed it
      if (permission === "default" && !hasSeenBanner) {
        setShowBanner(true);
      }
    }
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationStatus("granted");
      setShowBanner(false);
      localStorage.setItem("notificationBannerSeen", "true");
    } else {
      setNotificationStatus("denied");
      setShowBanner(false);
      localStorage.setItem("notificationBannerSeen", "true");
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setIsDismissed(true);
    localStorage.setItem("notificationBannerSeen", "true");
  };

  if (!("Notification" in window)) {
    return null;
  }

  return (
    <>
      {/* First-time notification banner */}
      {showBanner && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full mx-4 animate-slide-down">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 dark:from-indigo-600 dark:to-purple-600 text-white rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-white/80 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 bg-white/20 rounded-full p-3">
                <Bell className="w-8 h-8 animate-bounce" />
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">
                  🎯 Never Miss Your Money Moves!
                </h3>
                <p className="text-white/90 mb-4 leading-relaxed">
                  Get instant alerts when you're about to blow your budget,
                  celebrate when you crush savings goals, and stay updated on
                  auto-payments—all without checking the app!
                  <span className="font-semibold">
                    {" "}
                    Your wallet will thank you! 💰
                  </span>
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleEnableNotifications}
                    className="bg-white text-teal-600 dark:text-indigo-600 px-6 py-2.5 rounded-lg font-bold hover:bg-white/90 transition shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    ✨ Yes, Keep Me Updated!
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-lg font-semibold transition backdrop-blur-sm"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Small reminder for dismissed users (only on budget/savings pages) */}
      {isDismissed && notificationStatus === "default" && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={handleEnableNotifications}
            className="bg-teal-600 hover:bg-teal-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition"
          >
            <Bell className="w-4 h-4" />
            Stay Updated
          </button>
        </div>
      )}
    </>
  );
}
