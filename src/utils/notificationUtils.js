// Browser Notification Utility for Finance Tracker

/**
 * Request permission for browser notifications
 */
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

/**
 * Show a browser notification
 * @param {string} title - Notification title
 * @param {object} options - Notification options
 */
export const showNotification = (title, options = {}) => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return;
  }

  if (Notification.permission === "granted") {
    const notification = new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options,
    });

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    return notification;
  }
};

/**
 * Show notification for new transaction
 */
export const notifyTransaction = (transaction) => {
  const isIncome = transaction.type === "income";

  const incomeMessages = [
    { emoji: "💰", text: "Money Incoming!" },
    { emoji: "🤑", text: "Cha-Ching!" },
    { emoji: "💵", text: "Cash Flow Alert!" },
    { emoji: "🎉", text: "Payday Vibes!" },
    { emoji: "💸", text: "Bank Account Happy!" },
  ];

  const expenseMessages = [
    { emoji: "💸", text: "Money Out!" },
    { emoji: "🛍️", text: "Purchase Alert!" },
    { emoji: "💳", text: "Wallet Lighter!" },
    { emoji: "🎯", text: "Expense Tracked!" },
    { emoji: "📝", text: "Logged & Tagged!" },
  ];

  const messages = isIncome ? incomeMessages : expenseMessages;
  const message = messages[Math.floor(Math.random() * messages.length)];

  const title = `${message.emoji} ${message.text}`;
  const body = `₹${transaction.amount} - ${transaction.description}`;

  showNotification(title, {
    body,
    tag: "transaction",
    requireInteraction: false,
  });
};

/**
 * Show notification for recurring transaction created
 */
export const notifyRecurringTransaction = (description, amount, type) => {
  const isIncome = type === "income";

  const incomeMessages = [
    {
      emoji: "🔁💰",
      title: "Auto-Magic Money!",
      body: `₹${amount} - ${description} added automatically! The robots are working for you! 🤖`,
    },
    {
      emoji: "⚡💵",
      title: "Recurring Ka-Ching!",
      body: `₹${amount} - ${description}. Your money's on autopilot! ✈️`,
    },
    {
      emoji: "🎯💸",
      title: "Scheduled Success!",
      body: `₹${amount} - ${description} auto-deposited! Set it and forget it! 😎`,
    },
    {
      emoji: "🔄🤑",
      title: "Automatic Abundance!",
      body: `₹${amount} - ${description}. Money making itself! Living the dream! 💭`,
    },
  ];

  const expenseMessages = [
    {
      emoji: "🔁💸",
      title: "Auto-Deducted!",
      body: `₹${amount} - ${description} paid automatically. Adulting on autopilot! 🚗`,
    },
    {
      emoji: "⏰💳",
      title: "Scheduled Payment!",
      body: `₹${amount} - ${description}. The bills pay themselves! (Almost) 🤖`,
    },
    {
      emoji: "🔄📝",
      title: "Recurring Reminder!",
      body: `₹${amount} - ${description} auto-tracked. Your future self says thanks! 🙏`,
    },
    {
      emoji: "⚡🛍️",
      title: "Auto-Expense!",
      body: `₹${amount} - ${description}. Subscriptions gonna subscribe! 📺`,
    },
  ];

  const messages = isIncome ? incomeMessages : expenseMessages;
  const message = messages[Math.floor(Math.random() * messages.length)];

  showNotification(`${message.emoji} ${message.title}`, {
    body: message.body,
    tag: "recurring",
    requireInteraction: false,
  });
};

/**
 * Show notification for budget alerts
 */
export const notifyBudgetAlert = (categoryName, percentage, isExceeded) => {
  const exceededMessages = [
    {
      emoji: "🚨",
      title: "Whoa There, Big Spender!",
      body: `Your ${categoryName} budget just exploded by ${percentage.toFixed(
        0
      )}%! Time to chill? 😅`,
    },
    {
      emoji: "💸",
      title: "Budget? What Budget?!",
      body: `${categoryName}: ${percentage.toFixed(
        0
      )}% spent. Your wallet is crying! 😭`,
    },
    {
      emoji: "🔥",
      title: "Budget on Fire!",
      body: `${categoryName} is ${percentage.toFixed(
        0
      )}% over budget. Someone call the finance police! 🚓`,
    },
    {
      emoji: "😱",
      title: "Houston, We Have a Problem!",
      body: `${categoryName} budget exceeded by ${percentage.toFixed(
        0
      )}%. Your bank account is sending SOS signals! 📡`,
    },
    {
      emoji: "🎰",
      title: "Going All In!",
      body: `${categoryName}: ${percentage.toFixed(
        0
      )}%. Who needs budgets anyway? (Just kidding, please stop! 🛑)`,
    },
  ];

  const warningMessages = [
    {
      emoji: "⚠️",
      title: "Easy There, Tiger!",
      body: `You've hit ${percentage.toFixed(
        0
      )}% of your ${categoryName} budget. Maybe skip that next purchase? 🤔`,
    },
    {
      emoji: "🎯",
      title: "Getting Close!",
      body: `${categoryName} is ${percentage.toFixed(
        0
      )}% full. Time to channel your inner monk! 🧘`,
    },
    {
      emoji: "🚦",
      title: "Yellow Light Ahead!",
      body: `${categoryName} budget at ${percentage.toFixed(
        0
      )}%. Proceed with caution, friend! ⚠️`,
    },
    {
      emoji: "📊",
      title: "Budget Check!",
      body: `${categoryName}: ${percentage.toFixed(
        0
      )}% used. Your future self will thank you for slowing down! 💪`,
    },
    {
      emoji: "🎪",
      title: "Plot Twist!",
      body: `${percentage.toFixed(
        0
      )}% of ${categoryName} budget gone. Time to be the responsible adult you pretend to be! 😎`,
    },
  ];

  const messages = isExceeded ? exceededMessages : warningMessages;
  const message = messages[Math.floor(Math.random() * messages.length)];

  showNotification(`${message.emoji} ${message.title}`, {
    body: message.body,
    tag: "budget-alert",
    requireInteraction: true,
  });
};

/**
 * Show notification for savings goal achieved
 */
export const notifySavingsGoalAchieved = (goalName, amount) => {
  const messages = [
    {
      emoji: "🎉",
      title: "BOOM! Goal Crushed!",
      body: `${goalName} complete! You absolute legend! ₹${amount} secured! 💪🏆`,
    },
    {
      emoji: "🚀",
      title: "To The Moon!",
      body: `${goalName} achieved! ₹${amount} saved! You're basically a finance ninja now! 🥷✨`,
    },
    {
      emoji: "🎊",
      title: "Victory Dance Time!",
      body: `${goalName} unlocked! ₹${amount}! Your piggy bank is doing backflips! 🐷💃`,
    },
    {
      emoji: "👑",
      title: "Bow Down to the Savings King/Queen!",
      body: `${goalName} conquered! ₹${amount} saved! Crown yourself! 👑💎`,
    },
    {
      emoji: "🔥",
      title: "On Fire!",
      body: `${goalName} demolished! ₹${amount}! You're absolutely killing it! Who's the boss? YOU ARE! 😎🔥`,
    },
    {
      emoji: "🎯",
      title: "Bullseye!",
      body: `Direct hit on ${goalName}! ₹${amount} in the bank! You're a savings sniper! 🎯💰`,
    },
    {
      emoji: "⭐",
      title: "Star Performance!",
      body: `${goalName} achieved! ₹${amount} saved! Netflix should make a documentary about you! 🌟📺`,
    },
  ];

  const message = messages[Math.floor(Math.random() * messages.length)];

  showNotification(`${message.emoji} ${message.title}`, {
    body: message.body,
    tag: "savings-goal",
    requireInteraction: true,
  });
};

/**
 * Show notification for savings goal progress
 */
export const notifySavingsProgress = (goalName, percentage) => {
  if (percentage >= 75 && percentage < 100) {
    const messages = [
      {
        emoji: "🎯",
        title: "So Close!",
        body: `${goalName} is ${percentage.toFixed(
          0
        )}% done! You can smell victory from here! Keep smashing it! 💪`,
      },
      {
        emoji: "🏃",
        title: "Sprint to the Finish!",
        body: `${goalName}: ${percentage.toFixed(
          0
        )}%! The finish line is waving at you! Don't stop now, champ! 🏁`,
      },
      {
        emoji: "🔥",
        title: "You're Heating Up!",
        body: `${goalName} at ${percentage.toFixed(
          0
        )}%! You're on FIRE! 🔥 Almost there, superstar! ⭐`,
      },
      {
        emoji: "💎",
        title: "Diamond Hands!",
        body: `${goalName}: ${percentage.toFixed(
          0
        )}% complete! Your discipline is LEGENDARY! 💎🙌`,
      },
      {
        emoji: "🎪",
        title: "Grand Finale Time!",
        body: `${goalName} is ${percentage.toFixed(
          0
        )}% there! Time for the epic conclusion! 🎬✨`,
      },
      {
        emoji: "🚂",
        title: "Full Steam Ahead!",
        body: `${goalName}: ${percentage.toFixed(
          0
        )}%! The savings train has no brakes! Choo choo! 🚂💨`,
      },
    ];

    const message = messages[Math.floor(Math.random() * messages.length)];

    showNotification(`${message.emoji} ${message.title}`, {
      body: message.body,
      tag: "savings-progress",
      requireInteraction: false,
    });
  }
};

/**
 * Show notification for low balance warning
 */
export const notifyLowBalance = (balance) => {
  const messages = [
    {
      emoji: "⚠️",
      title: "Wallet's Getting Shy!",
      body: `Balance: ₹${balance}. Time to tighten those purse strings! 👛`,
    },
    {
      emoji: "🆘",
      title: "Balance SOS!",
      body: `Only ₹${balance} left! Your wallet is sending distress signals! 📡`,
    },
    {
      emoji: "🚨",
      title: "Low Funds Alert!",
      body: `₹${balance} remaining. Maybe skip that coffee? ☕😅`,
    },
    {
      emoji: "💸",
      title: "Money's Playing Hide & Seek!",
      body: `Balance: ₹${balance}. Where did it all go? 🤔💭`,
    },
    {
      emoji: "🎭",
      title: "Plot Twist!",
      body: `₹${balance} left. Time for some financial detective work! 🕵️`,
    },
  ];

  const message = messages[Math.floor(Math.random() * messages.length)];

  showNotification(`${message.emoji} ${message.title}`, {
    body: message.body,
    tag: "low-balance",
    requireInteraction: true,
  });
};

/**
 * Show notification for daily summary
 */
export const notifyDailySummary = (income, expenses, savings) => {
  const title = "📊 Today's Summary";
  const netBalance = income - expenses - savings;
  const body = `Income: ₹${income} | Expenses: ₹${expenses} | Net: ₹${netBalance}`;

  showNotification(title, {
    body,
    tag: "daily-summary",
    requireInteraction: false,
  });
};
