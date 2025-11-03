import React, { useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

const Toast = ({ message, type = "success", onClose, duration = 4000 }) => {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <AlertCircle className="w-5 h-5" />,
  };

  const styles = {
    success:
      "bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300",
    error:
      "bg-red-50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300",
    warning:
      "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-500 text-yellow-700 dark:text-yellow-300",
    info: "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300",
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 shadow-lg font-poppins text-sm min-w-[300px] max-w-md animate-slide-in ${styles[type]}`}
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <p className="flex-1">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
