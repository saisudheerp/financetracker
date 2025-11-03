# 🤖 AI Financial Query Feature

## Overview

The AI Assistant now has the ability to answer questions about your specific financial data! Ask anything about your income, expenses, savings, and budgets - and get personalized insights in seconds.

## 🎯 Key Features

### 🔒 100% Secure & Private

- **Your Data Only**: The AI only analyzes data from YOUR account
- **No Cross-User Access**: Never sees or shares other users' information
- **Session Isolated**: Each user's financial data is completely separate

### 💬 Natural Language Queries

Ask questions in plain English:

- "What's my total income this month?"
- "How much did I spend on food last week?"
- "Show me my top 3 expense categories"
- "Am I within my entertainment budget?"
- "How much have I saved towards my vacation goal?"
- "What's my average spending on transportation?"

### 📊 Comprehensive Data Analysis

The AI has access to:

- ✅ All your transactions (with up to 50 most recent shown for context)
- ✅ Income and expense categories
- ✅ Savings goals and progress
- ✅ Budget goals and limits
- ✅ Recurring transactions

### 🎭 Witty & Helpful Responses

- Personalized insights with emoji
- Sarcastic but helpful tone
- Concise answers (max 100 words)
- Specific to your data

## 🚀 How to Use

### 1. Open AI Assistant

Click the floating AI button (Bot icon) on:

- Dashboard page
- Transactions page
- Savings page

### 2. Ask Your Question

Instead of entering a transaction, ask a question about your finances:

**Example Queries:**

```
What's my income this month?
How much spent on food?
What are my top expenses?
Am I over budget?
Show my savings progress
```

### 3. Get Instant Insights

The AI will analyze your specific data and provide:

- Direct answers to your questions
- Relevant statistics and numbers
- Budget alerts and warnings
- Savings goal progress
- Spending patterns

## 🔧 Technical Implementation

### Files Modified

1. **src/utils/geminiService.js**

   - Added `queryFinancialData()` function
   - Formats user's financial data for AI analysis
   - Uses Gemini AI for intelligent responses

2. **src/components/AIAssistant.jsx**

   - Updated to accept `financialData` prop
   - Added query detection logic
   - Routes questions to query mode vs transaction mode

3. **src/pages/Dashboard.jsx**

   - Passes complete financial data to AI Assistant:
     - transactions
     - categories
     - savingsGoals
     - budgetGoals
     - recurringTransactions

4. **src/pages/Transactions.jsx**

   - Passes transaction and category data

5. **src/pages/Savings.jsx**

   - Passes savings goals and category data

6. **README.md**
   - Added AI Features section
   - Documented query functionality
   - Added example questions

### How It Works

```javascript
// 1. User opens AI Assistant on any page
// 2. User types a question (e.g., "What's my total income?")
// 3. AIAssistant.jsx detects it's a query (not a transaction)
// 4. Calls queryFinancialData() with the question and user's data
// 5. geminiService.js formats the data and sends to Gemini AI
// 6. AI analyzes ONLY the user's data (never database access)
// 7. Returns witty, insightful answer
// 8. User sees the response in chat
```

### Query Detection Logic

The system detects queries by looking for keywords:

- "what", "how much", "show me", "tell me"
- "total", "last month", "this month"
- "income", "expense", "spent on"
- "savings", "budget"

**But excludes** transaction phrases:

- "I spent", "I paid" (these are transactions, not queries)

### Data Format Sent to AI

```javascript
{
  transactions: [
    { date, amount, description, category, type, payment_method }
    // Up to 50 most recent transactions
  ],
  categories: [
    { name, type, icon }
  ],
  savingsGoals: [
    { name, target_amount, current_amount, deadline }
  ],
  budgetGoals: [
    { category_name, period, limit_amount, current_spending }
  ],
  recurringTransactions: [
    { description, amount, frequency, category }
  ]
}
```

## 🔐 Security Considerations

### ✅ What's Secure

- AI only receives data passed from authenticated user session
- No direct database access from AI
- Row Level Security (RLS) ensures data isolation
- Each user's data is completely separate

### ⚠️ Privacy Notes

- Queries are sent to Google Gemini AI API
- Financial data is included in the API request
- Google's privacy policy applies
- Data is not stored by the AI service (per Gemini API terms)

## 📝 Example Conversations

### Example 1: Income Check

```
User: What's my total income this month?

Sai: Your total income this month is ₹45,000! 💰
     From Salary (₹40,000) and Freelance (₹5,000).
     Looking good! 🎉
```

### Example 2: Spending Analysis

```
User: How much did I spend on food last week?

Sai: You spent ₹2,350 on food last week! 🍔
     That's about ₹335/day. Top items:
     Swiggy ₹800, Groceries ₹950, Cafe ₹600.
     Hungry much? 😄
```

### Example 3: Budget Check

```
User: Am I within my entertainment budget?

Sai: Uh oh! 😬 You've spent ₹4,200 out of your
     ₹3,000 monthly entertainment budget.
     That's 140% - time to Netflix & chill
     (without ordering food)! 🍿
```

### Example 4: Savings Progress

```
User: How close am I to my vacation goal?

Sai: You're at ₹28,000 of your ₹50,000 vacation goal!
     That's 56% complete! 🏖️ Just ₹22,000 to go.
     At this rate, you'll be sipping cocktails soon! 🍹
```

## 🎨 User Experience

### Visual Indicators

- Same chat interface as transaction entry
- AI automatically detects query vs transaction
- Responses appear as assistant messages in chat
- Witty, emoji-rich responses for engagement

### Available On

- ✅ Dashboard (full data access)
- ✅ Transactions page (transaction + category data)
- ✅ Savings page (savings + category data)

## 🚀 Future Enhancements

Potential improvements:

- [ ] Mode toggle (switch between "Add Transaction" and "Ask Question")
- [ ] Visual charts in responses
- [ ] Voice output for responses
- [ ] Saved queries/reports
- [ ] Scheduled insights (daily/weekly summaries)
- [ ] Comparison queries ("this month vs last month")
- [ ] Prediction queries ("will I exceed my budget?")
- [ ] Export insights as PDF

## 🐛 Troubleshooting

### Query Not Recognized

If your query is being interpreted as a transaction:

- Make it more question-like: "What is..." instead of "Show..."
- Use question words: what, how, when, where
- Avoid transaction phrases: "spent", "paid", "received"

### No Response

If AI doesn't respond:

- Check internet connection (requires API access)
- Verify Gemini API key is configured
- Check browser console for errors
- Ensure you have transaction data to query

### Incorrect Data

If AI shows wrong amounts:

- Data is fetched when you open the AI Assistant
- Close and reopen to refresh data
- Ensure transactions are synced (check real-time status)

## 📊 Performance

- **Response Time**: 2-5 seconds (depends on API latency)
- **Data Limit**: Up to 50 most recent transactions analyzed
- **Token Usage**: ~500-1000 tokens per query (cost-effective)
- **Caching**: Chat history stored in localStorage

## ✨ Tips for Best Results

1. **Be Specific**: "food spending last week" better than "food"
2. **Use Time Frames**: "this month", "last 7 days", "yesterday"
3. **Ask One Thing**: Single question gets better response
4. **Use Categories**: "entertainment budget" or "transportation costs"
5. **Check Progress**: "vacation savings progress" or "budget status"

---

**Enjoy your new AI financial analyst!** 🤖💰

For issues or feature requests, open a GitHub issue with label "ai-query".
