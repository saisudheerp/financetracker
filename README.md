# 💰 SpendsIn - Smart Personal Finance Tracker

A beautiful, modern finance tracking application built with React 19, Supabase, and Tailwind CSS v4. Track your income, expenses, savings, budgets, and recurring transactions in Indian Rupees (₹) with real-time synchronization, browser notifications, and stunning animated icons!

## ✨ Features

### 🤖 AI Features

- **AI Transaction Assistant - Sai** - Chat with your AI assistant to add transactions instantly
  - Natural language processing: "Spent 500 on groceries at Reliance Fresh"
  - Voice input support for hands-free entry
  - Smart category detection and suggestions
  - Witty, personalized responses
- **AI Financial Query Assistant** - Ask questions about your spending and get instant insights

  - Ask anything about your finances: "What's my total income this month?"
  - Detailed spending analysis: "How much did I spend on food last month?"
  - Budget tracking: "Am I within my entertainment budget?"
  - Savings insights: "How much have I saved towards my vacation?"
  - Personalized insights with witty responses
  - **100% Secure:** Only analyzes YOUR account data - never shares with other users
  - Available on Dashboard, Transactions, and Savings pages

  **Example Questions:**

  - "What's my total income this month?"
  - "How much did I spend on food last week?"
  - "Show me my top 3 expense categories"
  - "Am I overspending on entertainment?"
  - "How much do I need to save to reach my vacation goal?"
  - "What's my average monthly spending?"

### 🎯 Core Features

- 💰 **Income & Expense Tracking** - Track all your financial transactions with ease
- 📊 **Real-Time Updates** - Changes sync instantly across all tabs and devices ⚡
- 🎨 **Animated Icons** - Beautiful Lucide React icons with smooth animations
- 💱 **Indian Rupees (₹)** - All amounts formatted in INR with proper locale
- 🕐 **Indian Standard Time (IST)** - Dates in Asia/Kolkata timezone
- 🏷️ **Smart Categories** - 15+ default categories + unlimited custom categories
- � **Multiple Payment Methods** - UPI, Cash, Debit Card, Credit Card, Bank Transfer, Net Banking
- 🌙 **Dark Mode** - Beautiful dark theme with localStorage persistence (defaults to light mode)
- 📱 **Fully Responsive** - Mobile-first design with optimized navigation
- 📥 **CSV Export** - Export transactions by month, date range, or type
- � **Secure Authentication** - Email/password auth with row-level security
- ⚡ **Performance Optimized** - Code splitting, minification, lazy loading, and Vercel Speed Insights

### 🏦 Advanced Features

- 🎯 **Budget Goals** - Set category-based budget limits with real-time tracking
  - Visual progress bars with color-coded warnings
  - Monthly/Quarterly/Yearly budget periods
  - Automatic alerts when approaching or exceeding limits
  - Budget vs actual spending comparisons
- 💰 **Savings Goals** - Track long-term savings targets

  - Set target amounts with deadline dates
  - Visual progress tracking with percentage completion
  - Achievement badges when goals are reached
  - Total savings displayed on dashboard

- 🔁 **Recurring Transactions** - Automate regular income and expenses

  - Flexible frequencies: Daily, Weekly, Monthly, Quarterly, Yearly
  - **Fully Automatic Processing** - Runs every hour via Supabase Edge Functions cron job
  - **Catches Missed Days** - Creates transactions for all missed dates with correct dates
  - Pause/Resume functionality
  - Real-time updates when transactions are auto-generated
  - Monthly recurring estimates on dashboard
  - Transaction history tracking
  - **Works 24/7** - Processes even when the site is closed

- 📊 **Monthly Savings Tracker** - Track monthly savings deposits separately
  - Deposit history with running totals
  - Monthly savings summaries
  - Automatic net balance calculations (Income - Expenses - Savings)

### 🎨 UI/UX Excellence

- ✨ **Modern Design** - Clean, intuitive interface with gradient accents
- 🎭 **Premium Fonts** - Anton, Playfair Display, Poppins, Oswald, Lora
- � **Smooth Animations** - Pulse, bounce, spin effects on icons
- 📱 **Mobile Optimized** - Hamburger menu, card layouts, touch-friendly
- 🎯 **Smart Navigation** - Dropdown "More" menu for advanced features
- 🌈 **Consistent Theming** - Light/dark mode throughout the app

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- Supabase account (free tier works great!)
- Modern browser (Chrome, Firefox, Edge, Safari)

### 1️⃣ Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/spendsin.git
cd spendsin

# Install dependencies
npm install
```

### 2️⃣ Database Setup (Required!)

**IMPORTANT:** Run the SQL setup scripts in Supabase to create all tables and security policies.

#### Main Database Setup

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project (or create a new one)
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open `SIMPLE_SETUP.sql` from this project
6. Copy the entire file contents (Ctrl+A → Ctrl+C)
7. Paste into Supabase SQL Editor
8. Click **Run** or press Ctrl+Enter
9. Wait for "Success. No rows returned" message
10. Done! ✨

**What this creates:**

- ✅ 6 database tables (users, categories, transactions, savings_goals, recurring_transactions, budget_goals)
- ✅ Row Level Security (RLS) policies for data protection
- ✅ Database indexes for optimal performance
- ✅ Real-time subscriptions for instant sync
- ✅ 15 default categories with Lucide icon names
- ✅ Helper functions and triggers

### 3️⃣ Environment Configuration

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Find your credentials:**

1. Go to Supabase Dashboard
2. Click on your project
3. Settings → API
4. Copy "Project URL" and "anon/public" key

### 4️⃣ Icon Migration (If upgrading from old version)

If you have existing data with emoji icons, run the migration:

1. Open Supabase SQL Editor
2. Open `ICON_MIGRATION.sql` from this project
3. Copy and paste into SQL Editor
4. Click **Run**
5. This converts emoji icons (💰, 🍔, 🚗) to Lucide icon names (Wallet, Utensils, Car)

### 5️⃣ Start Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser 🎉

### 6️⃣ Create Your Account

1. Click "Sign Up" on login page
2. Enter email and password (min 8 characters)
3. Check email for verification link (if enabled)
4. Login and start tracking!

### 7️⃣ Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview

# Deploy dist/ folder to your hosting provider
```

## 📚 Database Setup

The `SIMPLE_SETUP.sql` file includes:

- Complete database schema (6 tables):
  - `users` - User profiles
  - `categories` - Income/expense categories
  - `transactions` - Financial transactions
  - `savings_goals` - Savings tracker
  - `recurring_transactions` - Recurring income/expenses
  - `budget_goals` - Category budget limits
- Row Level Security (RLS) policies for all tables
- 15 default categories (5 income + 10 expense) with emoji icons
- Optimized indexes for better performance
- Real-time subscription setup for instant sync

## 🎯 Tech Stack

### Frontend

- **React 19** - Latest React with concurrent features
- **Vite 7** - Lightning-fast build tool with HMR
- **Tailwind CSS v4** - Utility-first CSS with CSS variables
- **Lucide React** - Beautiful animated SVG icons (546 icons)
- **Recharts** - Composable charting library for analytics
- **Vercel Speed Insights** - Real-time performance monitoring
- **Recharts** - Composable charting library for analytics

### Backend

- **Supabase** - PostgreSQL database with real-time capabilities
- **PostgreSQL** - Robust relational database
- **Row Level Security (RLS)** - Database-level security
- **Real-Time Subscriptions** - WebSocket-based instant sync
- **Supabase Auth** - Secure authentication system

### Development Tools

- **ESLint** - Code linting and quality
- **Terser** - JavaScript minification
- **PostCSS** - CSS processing and optimization

### Hosting Recommendations

- **Frontend:** Vercel, Netlify, Cloudflare Pages
- **Database:** Supabase (included free tier)
- **Assets:** Cloudflare CDN, Vercel Edge Network

## 🎨 Custom Fonts

- **Anton** - Logo and branding
- **Lora** - Elegant body text
- **Playfair Display** - Headings
- **Oswald** - Buttons and CTAs
- **Poppins** - General UI text

## 🔐 Security Features

- ✅ Row Level Security (RLS)
- ✅ User-specific data isolation
- ✅ Secure authentication with Supabase Auth
- ✅ Password strength validation
- ✅ Email verification
- ✅ Session management
- ✅ Protected routes

## 🎮 Test Real-Time

1. Open your app in **two browser tabs**
2. Add/edit/delete a transaction in Tab 1
3. Watch Tab 2 update instantly! ⚡

This works across all devices and sessions connected to your Supabase database.

## 📱 Default Categories

All categories now use beautiful Lucide React icons with animations!

### Income Categories (5)

- � **Salary** - Wallet icon with pulse animation
- 💼 **Freelance** - Briefcase icon
- 📈 **Investments** - TrendingUp icon
- 🎁 **Gifts** - Gift icon with bounce
- 💸 **Other Income** - CircleDollarSign icon

### Expense Categories (10)

- � **Food & Dining** - Utensils icon
- 🚗 **Transportation** - Car icon with hover animation
- 🏠 **Housing** - Home icon
- 💊 **Healthcare** - Heart icon with pulse
- 🎬 **Entertainment** - Film icon
- 🛒 **Shopping** - ShoppingBag icon
- 📚 **Education** - Book icon
- 🔧 **Utilities** - Wrench icon
- 💳 **Bills** - Receipt icon
- 🎯 **Other Expenses** - FileText icon

**Plus:** Add unlimited custom categories with icon picker (20+ animated icons to choose from)!

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
spendsin/
├── src/
│   ├── components/
│   │   ├── AddTransactionModal.jsx    # Transaction form with icon animations
│   │   ├── NotificationSettings.jsx   # First-time notification banner
│   │   ├── SimpleNotificationPrompt.jsx # Budget/Savings notification prompt
│   │   ├── AIAssistant.jsx            # AI chat interface
│   │   ├── VoiceTransactionModal.jsx  # Voice input for transactions
│   │   ├── Navbar.jsx                 # Navigation with dropdown menu
│   │   ├── Toast.jsx                  # Toast notification component
│   │   └── ProtectedRoute.jsx         # Auth guard component
│   ├── context/
│   │   ├── AuthContext.jsx            # Authentication state management
│   │   ├── ThemeContext.jsx           # Dark/light mode state
│   │   └── ToastContext.jsx           # Toast notification state
│   ├── pages/
│   │   ├── Dashboard.jsx              # Main overview with stats & charts
│   │   ├── Transactions.jsx           # Transaction list with filters
│   │   ├── Analytics.jsx              # Charts and insights
│   │   ├── Categories.jsx             # Category management with icon picker
│   │   ├── Savings.jsx                # Lifetime savings goals
│   │   ├── MonthlySavings.jsx         # Monthly savings deposits tracker
│   │   ├── RecurringTransactions.jsx  # Recurring income/expenses
│   │   ├── BudgetGoals.jsx            # Budget limits and monitoring
│   │   ├── Login.jsx                  # Login/signup page
│   │   └── ResetPassword.jsx          # Password reset flow
│   ├── utils/
│   │   ├── iconMapper.jsx             # Lucide icon mapping utility
│   │   ├── notificationUtils.js       # Browser notification functions
│   │   ├── geminiService.js           # Google Gemini AI integration
│   │   ├── currencyUtils.js           # INR formatting functions
│   │   ├── authUtils.js               # Auth helpers
│   │   └── exportUtils.js             # CSV export functions
│   ├── App.jsx                        # Main app component with routing
│   ├── main.jsx                       # React entry point
│   ├── supabaseClient.js              # Supabase initialization
│   ├── index.css                      # Global styles with Tailwind
│   └── App.css                        # Component-specific styles
├── public/
│   └── robots.txt                     # SEO configuration
├── dist/                              # Production build output
├── SQL Scripts/
│   ├── SIMPLE_SETUP.sql               # Complete database setup
│   ├── ICON_MIGRATION.sql             # Icon migration script
│   ├── SAVINGS_DEPOSITS_SETUP.sql     # Monthly savings setup
│   └── MONTHLY_SAVINGS_SETUP.sql      # Alternative savings setup
├── Documentation/
│   ├── README.md                      # This file
│   ├── DATABASE_SETUP.md              # Detailed database docs
│   ├── SUPABASE_SETUP.md              # Supabase configuration guide
│   ├── TROUBLESHOOTING.md             # Common issues and fixes
│   └── PERFORMANCE_OPTIMIZATIONS.md   # Performance guide
├── .env                               # Environment variables (not in git)
├── .gitignore                         # Git ignore rules
├── package.json                       # Dependencies and scripts
├── vite.config.js                     # Vite configuration with optimizations
├── tailwind.config.js                 # Tailwind CSS configuration
├── eslint.config.js                   # ESLint rules
└── index.html                         # HTML entry point with SEO meta tags
```

## 🎯 Roadmap & Features

### ✅ Completed

- [x] User authentication with email/password
- [x] Row Level Security (RLS) for data protection
- [x] Dashboard with financial summary cards
- [x] Add/Edit/Delete transactions
- [x] Category management with custom icons
- [x] Real-time synchronization across devices ⚡
- [x] Mobile responsive design with hamburger menu
- [x] Transaction filters (type, category, date range, search)
- [x] Analytics page with charts (monthly trends, category breakdown)
- [x] CSV export (all, monthly, date range, by type)
- [x] Indian Standard Time (IST) support
- [x] Dark mode with persistence
- [x] **Savings Goals** - Track long-term savings targets ✨
- [x] **Monthly Savings** - Track monthly deposits separately ✨
- [x] **Recurring Transactions** - Automate regular income/expenses ✨
- [x] **Budget Goals** - Set and monitor category budgets ✨
- [x] **Icon System** - Lucide React animated icons throughout ✨
- [x] **Performance Optimization** - Code splitting, minification ✨
- [x] **SEO Optimization** - Meta tags, robots.txt ✨
- [x] **AI Transaction Assistant** - Natural language transaction entry 🤖
- [x] **AI Financial Query Assistant** - Ask questions about your finances 🤖
- [x] **Voice Input** - Voice-to-text transaction entry 🎙️
- [x] **Browser Notifications** - Smart alerts for budgets, savings, and auto-transactions 🔔
- [x] **Vercel Speed Insights** - Real-time performance monitoring ⚡
- [x] **Automatic Recurring Transactions** - 24/7 processing with missed-day catch-up 🔁

### 🔮 Planned Features

- [ ] **Multi-currency Support** - USD, EUR, GBP, etc.
- [ ] **Receipt Uploads** - Attach images to transactions
- [ ] **Expense Splitting** - Share expenses with friends/family
- [ ] **Bill Reminders** - Get notified before due dates
- [ ] **Financial Reports** - PDF export of monthly/yearly reports
- [ ] **Investment Tracking** - Track stocks, mutual funds, crypto
- [ ] **Loan Calculator** - EMI calculator and tracker
- [ ] **Tax Planning** - Tax deduction tracking
- [ ] **Mobile App** - React Native version
- [ ] **Desktop App** - Electron wrapper
- [ ] **API Access** - REST API for third-party integrations
- [ ] **Webhooks** - Trigger actions on events
- [ ] **Multi-user Households** - Share finances with family
- [ ] **Advanced Charts** - More visualization options

### 💡 Feature Requests

Have an idea? Open an issue on GitHub with the label "feature-request"!

## 🔔 Browser Notifications Guide

### How It Works

SpendsIn uses browser notifications to keep you updated on important financial events. Here's everything you need to know:

### First-Time Setup

When you first log in, you'll see an attractive banner:

- **Message:** "🎯 Never Miss Your Money Moves!"
- **Options:** "Yes, Keep Me Updated!" or "Maybe Later"
- **One-time:** The banner disappears forever after you make a choice

### If You Enable Notifications

You'll receive smart alerts for:

- 💸 **New Transactions** - "Cha-Ching! ₹5,000 - Freelance Work"
- 🔁 **Auto-Transactions** - "Auto-Magic Money! ₹50,000 - Monthly Salary added automatically!"
- 🚨 **Budget Warnings** - "Whoa There, Big Spender! Your Food budget just exploded by 120%!"
- 🎉 **Savings Achievements** - "BOOM! Goal Crushed! Vacation Fund complete! ₹1,00,000 secured!"
- 🎯 **Progress Milestones** - "Sprint to the Finish! House Fund: 85%! Don't stop now, champ!"

### If You Dismiss the Banner

- No worries! You'll see a small, subtle prompt on Budget and Savings pages
- Message: "🎯 Get alerts! Never miss budget warnings or savings wins."
- One-click enable anytime

### Notification Behavior

- **Auto-dismiss:** Notifications disappear after 5 seconds
- **Non-intrusive:** Won't interrupt your workflow
- **Random messages:** Each notification type has 4-7 funny/motivational variations
- **Works everywhere:** Desktop, mobile, even when the site is closed (for recurring transactions)

### How to Enable/Disable Later

**To Enable:**

- Click the notification prompt on Budget/Savings pages
- Or check your browser settings: Site Settings → Notifications

**To Disable:**

- Browser Settings → Site Settings → Notifications → Block

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 💡 Troubleshooting

### 🔴 Common Issues

#### 1. Blank Page / White Screen

```powershell
# Kill all Node processes
taskkill /F /IM node.exe

# Clear Vite cache
Remove-Item -Path "node_modules\.vite" -Recurse -Force

# Restart dev server
npm run dev

# Hard refresh browser
Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

#### 2. Database Connection Errors

- ✅ Verify `.env` file exists with correct credentials
- ✅ Check Supabase project is active (not paused)
- ✅ Confirm you ran `SIMPLE_SETUP.sql` in Supabase SQL Editor
- ✅ Check browser console (F12) for specific errors

#### 3. Icons Showing as Text

If you see "Wallet", "Car", "Home" as text instead of icons:

```sql
-- Run this in Supabase SQL Editor
-- Open ICON_MIGRATION.sql and execute it
```

Then hard refresh browser (Ctrl+Shift+R)

#### 4. Real-Time Sync Not Working

- ✅ Check if Supabase real-time is enabled (Project Settings → API → Realtime)
- ✅ Verify RLS policies are correct (should be created by SIMPLE_SETUP.sql)
- ✅ Check browser console for WebSocket errors

#### 5. Authentication Issues

- ✅ Password must be at least 8 characters
- ✅ Check if email confirmation is required (Supabase → Authentication → Settings)
- ✅ Verify email provider settings in Supabase

#### 6. Performance Issues

```bash
# Build optimized production version
npm run build
npm run preview

# Production build is 95% smaller than dev build
```

#### 7. Port Already in Use

```powershell
# Find process using port 5173
netstat -ano | findstr :5173

# Kill the process (replace PID with actual process ID)
taskkill /F /PID <PID>

# Or let Vite use another port automatically
# It will try 5174, 5175, etc.
```

### 📖 Detailed Troubleshooting

For more detailed solutions, see **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**

### 🆘 Still Need Help?

1. Check browser console (F12) for error messages
2. Check Supabase Dashboard → Logs for backend errors
3. Search existing GitHub issues
4. Open a new issue with:
   - Error message
   - Steps to reproduce
   - Screenshots if applicable
   - Browser and OS info

## 🎉 Credits

Built with ❤️ using React, Supabase, and Tailwind CSS

---

**Start tracking your finances today!** 💰✨

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

---

## Additional Resources

- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** - Detailed database documentation
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Supabase configuration guide
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[PERFORMANCE_OPTIMIZATIONS.md](./PERFORMANCE_OPTIMIZATIONS.md)** - Performance guide

---

**Version:** 2.0.0  
**Last Updated:** October 2025  
**Status:** Production Ready
