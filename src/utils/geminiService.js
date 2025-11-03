import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI with API key from environment
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

/**
 * Parse user input to extract transaction details
 * @param {string} userInput - Natural language input from user
 * @param {Array} categories - Available categories
 * @returns {Promise<Object>} Parsed transaction data
 */
export async function parseTransactionFromText(userInput, categories) {
  try {
    const categoryList = categories
      .map((cat) => `${cat.name} (${cat.type})`)
      .join(", ");

    const prompt = `You are a financial assistant helping to parse transaction information. 
Extract transaction details from the following user input and respond ONLY with a valid JSON object.

Available categories: ${categoryList}

Available payment methods: upi, cash, debit_card, credit_card, bank_transfer, net_banking

User input: "${userInput}"

Respond with a JSON object containing:
{
  "type": "income" or "expense",
  "amount": number (extract from input),
  "category": "exact category name from the list above",
  "description": "brief description",
  "payment_method": "one of the available payment methods (default: upi)",
  "confidence": number between 0-1
}

CRITICAL RULES:
- MUST use EXACT category names from the available list above
- DO NOT use generic names like "General", "Miscellaneous", or "Other"
- If uncertain, use "Other Expenses" for expenses or "Other Income" for income
- Common mappings:
  * coffee, food, restaurant, groceries, dining → "Food & Dining"
  * uber, taxi, car, bus, travel → "Transport"
  * netflix, movies, games, subscription → "Entertainment"
  * clothes, amazon, online shopping → "Shopping"
  * rent, electricity, water → "Bills"
  * doctor, medicine, hospital → "Healthcare"
  * salary, paycheck → "Salary"
  * freelance work, side gig → "Freelance"
- Type should be income or expense based on context
- Description should be concise (max 50 chars)
- Only respond with JSON, no other text`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });

    const jsonText = response.text.trim().replace(/```json\n?|\n?```/g, "");
    const parsed = JSON.parse(jsonText);

    // Try exact match first
    let matchedCategory = categories.find(
      (cat) => cat.name.toLowerCase() === parsed.category.toLowerCase()
    );

    // If no match, try partial match
    if (!matchedCategory) {
      matchedCategory = categories.find(
        (cat) =>
          cat.name.toLowerCase().includes(parsed.category.toLowerCase()) ||
          parsed.category.toLowerCase().includes(cat.name.toLowerCase())
      );
    }

    // Fallback to "Other Expenses" or "Other Income" based on type
    if (!matchedCategory) {
      const fallbackName =
        parsed.type === "income" ? "Other Income" : "Other Expenses";
      matchedCategory = categories.find(
        (cat) => cat.name === fallbackName && cat.type === parsed.type
      );
    }

    // Log if still no match
    if (!matchedCategory) {
      console.error(
        `❌ No category match for: "${parsed.category}" (${parsed.type})`
      );
      console.log(
        "Available categories:",
        categories.map((c) => c.name).join(", ")
      );
    }

    return {
      type: parsed.type,
      amount: parseFloat(parsed.amount) || 0,
      category_id: matchedCategory ? matchedCategory.id : null,
      categoryName: matchedCategory ? matchedCategory.name : parsed.category,
      description: parsed.description || "",
      payment_method: parsed.payment_method || "upi",
      confidence: parsed.confidence || 0.7,
    };
  } catch (error) {
    console.error("Error parsing transaction:", error);
    throw new Error("Failed to understand the transaction. Please try again.");
  }
}

/**
 * Parse multiple transactions from a single input
 * @param {string} userInput - Natural language input with multiple transactions
 * @param {Array} categories - Available categories
 * @returns {Promise<Array>} Array of parsed transaction data
 */
export async function parseMultipleTransactions(userInput, categories) {
  try {
    console.log("🔍 parseMultipleTransactions called with:", {
      userInput,
      categoriesCount: categories?.length || 0,
      categories: categories?.map((c) => `${c.name} (${c.type})`).join(", "),
    });

    const categoryList = categories
      .map((cat) => `${cat.name} (${cat.type})`)
      .join(", ");

    const prompt = `You are a financial assistant helping to parse MULTIPLE transaction information from a single message.
Extract ALL transactions from the user input and respond ONLY with a valid JSON array.

Available categories: ${categoryList}

Available payment methods: upi, cash, debit_card, credit_card, bank_transfer, net_banking

User input: "${userInput}"

Respond with a JSON array of transaction objects. Each transaction object should contain:
{
  "type": "income" or "expense",
  "amount": number (extract from input),
  "category": "exact category name from the list above",
  "description": "brief description",
  "payment_method": "one of the available payment methods (default: upi)",
  "confidence": number between 0-1
}

CRITICAL RULES:
- Detect and extract ALL transactions mentioned in the input
- If only ONE transaction is mentioned, return array with one object
- If MULTIPLE transactions are mentioned, return array with all of them
- MUST use EXACT category names from the available list above
- DO NOT use generic names like "General", "Miscellaneous", or "Other"
- If uncertain, use "Other Expenses" for expenses or "Other Income" for income
- Common mappings:
  * coffee, food, restaurant, groceries, dining → "Food & Dining"
  * uber, taxi, car, bus, travel → "Transport"
  * netflix, movies, games, subscription → "Entertainment"
  * clothes, amazon, online shopping → "Shopping"
  * rent, electricity, water → "Bills"
  * doctor, medicine, hospital → "Healthcare"
  * salary, paycheck → "Salary"
  * freelance work, side gig → "Freelance"
- Description should be concise (max 50 chars) and specific to each transaction
- Only respond with JSON array, no other text

Examples:
Input: "spent 500 on coffee and 200 on uber"
Output: [{"type":"expense","amount":500,"category":"Food & Dining","description":"coffee",...}, {"type":"expense","amount":200,"category":"Transport","description":"uber",...}]

Input: "paid 1000 for groceries, 500 for netflix and got 50000 salary"
Output: [{"type":"expense","amount":1000,"category":"Food & Dining","description":"groceries",...}, {"type":"expense","amount":500,"category":"Entertainment","description":"netflix",...}, {"type":"income","amount":50000,"category":"Salary","description":"salary",...}]`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });

    const jsonText = response.text.trim().replace(/```json\n?|\n?```/g, "");
    const parsedArray = JSON.parse(jsonText);

    // Validate and find matching categories for each transaction
    return parsedArray.map((parsed) => {
      // Try exact match first
      let matchedCategory = categories.find(
        (cat) => cat.name.toLowerCase() === parsed.category.toLowerCase()
      );

      // If no match, try partial match
      if (!matchedCategory) {
        matchedCategory = categories.find(
          (cat) =>
            cat.name.toLowerCase().includes(parsed.category.toLowerCase()) ||
            parsed.category.toLowerCase().includes(cat.name.toLowerCase())
        );
      }

      // Fallback to "Other Expenses" or "Other Income" based on type
      if (!matchedCategory) {
        const fallbackName =
          parsed.type === "income" ? "Other Income" : "Other Expenses";
        matchedCategory = categories.find(
          (cat) => cat.name === fallbackName && cat.type === parsed.type
        );
      }

      // Log if still no match
      if (!matchedCategory) {
        console.error(
          `❌ No category match for: "${parsed.category}" (${parsed.type})`
        );
        console.log(
          "Available categories:",
          categories.map((c) => c.name).join(", ")
        );
      }

      return {
        type: parsed.type,
        amount: parseFloat(parsed.amount) || 0,
        category_id: matchedCategory ? matchedCategory.id : null,
        categoryName: matchedCategory ? matchedCategory.name : parsed.category,
        description: parsed.description || "",
        payment_method: parsed.payment_method || "upi",
        confidence: parsed.confidence || 0.7,
      };
    });
  } catch (error) {
    console.error("Error parsing multiple transactions:", error);
    throw new Error("Failed to understand the transactions. Please try again.");
  }
}

/**
 * Process voice transcription to transaction
 * @param {string} transcript - Voice transcript from speech recognition
 * @param {Array} categories - Available categories
 * @returns {Promise<Object>} Parsed transaction data
 */
export async function processVoiceInput(transcript, categories) {
  return await parseTransactionFromText(transcript, categories);
}

/**
 * Get AI suggestions for transaction based on context
 * @param {string} partialInput - Partial user input
 * @param {Array} recentTransactions - Recent transactions for context
 * @returns {Promise<Array>} Suggested transactions
 */
export async function getTransactionSuggestions(
  partialInput,
  recentTransactions
) {
  try {
    const recentContext = recentTransactions
      .slice(0, 5)
      .map((t) => `${t.description} - ₹${t.amount}`)
      .join(", ");

    const prompt = `Based on partial input "${partialInput}" and recent transactions (${recentContext}), 
suggest 3 possible complete transaction descriptions. 
Respond with JSON array of strings only: ["suggestion1", "suggestion2", "suggestion3"]`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });

    const jsonText = response.text.trim().replace(/```json\n?|\n?```/g, "");
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error getting suggestions:", error);
    return [];
  }
}

/**
 * Chat with AI assistant about finances
 * @param {string} message - User message
 * @param {Array} conversationHistory - Previous messages
 * @returns {Promise<string>} AI response
 */
export async function chatWithAssistant(message, conversationHistory = []) {
  try {
    const context = conversationHistory
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const prompt = `You are Sai, a witty and sarcastic transaction-adding AI assistant for the SpendsIn app.

Your ONLY task:
- Help users add transactions by understanding their natural language input
- Parse transaction details (amount, type, category, description)
- ONLY respond to transaction-related queries

Your personality:
- Sarcastic, witty, and genuinely funny
- Like a friend who roasts you but helps anyway
- Make clever observations about spending habits
- Brief and efficient (never boring!)
- DON'T introduce yourself again - you already did in the first message

Communication style:
- Keep responses SHORT (max 35 words)
- Be funny about expenses: "₹5000 on clothes? Living your best life I see 😏"
- Roast gently: "Another coffee? That's your third today but who's counting... oh wait, I am ☕"
- For non-transaction questions, be witty: "I'm a transaction bot, not Google. What did you spend?"
- Mix humor with helpfulness
- Use emojis strategically
- NEVER say "I'm Sai" or introduce yourself again

Examples of sarcastic but helpful responses:
- "₹2000 on fast food? Your wallet is crying but okay, adding it 🍔"
- "Wow, finally some income! Adding it before you spend it �"
- "Another shopping spree? I'm not judging... okay maybe a little. Added! 🛍️"
- "Nice! Salary incoming. Let's see how long it lasts this time 😅"
- "₹500 on snacks? Respect. Adding that masterpiece 🍿"
- "I only do transactions, not life advice. What did you buy?"

Previous conversation:
${context}

User: ${message}

Respond as Sai with sarcasm and humor (DON'T introduce yourself):`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error chatting with assistant:", error);
    return "Oops! I'm having a bit of trouble connecting right now. 😅 Please give me a moment and try again!";
  }
}

/**
 * Query financial data with AI - answers questions about user's spending, income, etc.
 * @param {string} query - User's question
 * @param {Object} financialData - User's financial data
 * @returns {Promise<string>} AI response with insights
 */
export async function queryFinancialData(query, financialData) {
  try {
    const {
      transactions = [],
      categories = [],
      savingsGoals = [],
      budgetGoals = [],
      recurringTransactions = [],
    } = financialData;

    // Prepare data summary for AI
    const dataSummary = `
USER'S FINANCIAL DATA (CONFIDENTIAL - THIS USER ONLY):

TRANSACTIONS (${transactions.length} total, showing most recent 50):
${transactions
  .slice(0, 50)
  .map(
    (t) =>
      `- Date: ${t.transaction_date}, ${
        t.type === "income" ? "Income" : "Expense"
      }: ₹${t.amount}, Category: ${
        t.categories?.name || "Uncategorized"
      }, Description: ${t.description || "N/A"}, Payment: ${
        t.payment_method || "N/A"
      }`
  )
  .join("\n")}
${
  transactions.length > 50
    ? `\n(... and ${transactions.length - 50} more transactions not shown)`
    : ""
}

CATEGORIES AVAILABLE:
Income: ${
      categories
        .filter((c) => c.type === "income")
        .map((c) => c.name)
        .join(", ") || "None"
    }
Expense: ${
      categories
        .filter((c) => c.type === "expense")
        .map((c) => c.name)
        .join(", ") || "None"
    }

SAVINGS GOALS (${savingsGoals.length} total):
${
  savingsGoals.length > 0
    ? savingsGoals
        .map(
          (s) =>
            `- Goal: ${s.name}, Current: ₹${s.current_amount || 0}, Target: ₹${
              s.target_amount
            }, Progress: ${Math.round(
              ((s.current_amount || 0) / s.target_amount) * 100
            )}%, Deadline: ${s.deadline || "No deadline"}`
        )
        .join("\n")
    : "No savings goals set"
}

BUDGET GOALS (${budgetGoals.length} total):
${
  budgetGoals.length > 0
    ? budgetGoals
        .map(
          (b) =>
            `- Category: ${b.category_name || "Unknown"}, Budget Limit: ₹${
              b.limit_amount || b.budget_amount || 0
            }, Period: ${b.period || "monthly"}, Current Spending: ₹${
              b.current_spending || 0
            }`
        )
        .join("\n")
    : "No budget goals set"
}

RECURRING TRANSACTIONS (${recurringTransactions.length} total):
${
  recurringTransactions.length > 0
    ? recurringTransactions
        .map(
          (r) =>
            `- ${r.type === "income" ? "Income" : "Expense"}: ₹${
              r.amount
            }, Category: ${
              r.categories?.name || r.category_id || "Unknown"
            }, Description: ${r.description}, Frequency: ${
              r.frequency
            }, Active: ${r.is_active ? "Yes" : "No"}`
        )
        .join("\n")
    : "No recurring transactions set"
}

SUMMARY CALCULATIONS:
- Total Income (all transactions): ₹${transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
      .toFixed(2)}
- Total Expenses (all transactions): ₹${transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
      .toFixed(2)}
- Total Savings in Goals: ₹${savingsGoals
      .reduce((sum, s) => sum + parseFloat(s.current_amount || 0), 0)
      .toFixed(2)}
- Net Balance: ₹${(
      transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) -
      transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
    ).toFixed(2)}
`;

    const prompt = `You are Sai, a witty financial AI assistant for the SpendsIn app.

Your task: Answer the user's question about THEIR financial data with accurate insights and calculations.

CRITICAL RULES:
1. ONLY use the exact data provided below - this is ONE USER's private financial data
2. Double-check all calculations - be mathematically accurate
3. Use the SUMMARY CALCULATIONS section for totals - don't recalculate
4. When asked about specific time periods (this month, last month, etc.), filter transactions by date
5. When asked about categories, sum up only transactions in that category
6. Be specific with numbers, dates, and currency (₹)
7. Provide insights and patterns, not just raw numbers
8. Be sarcastic and witty but ALWAYS be accurate with numbers
9. Keep responses concise (max 100 words)
10. Use emojis for personality
11. If you can't find specific data, say so clearly - don't make up numbers

IMPORTANT DATE REFERENCE:
- Current date is approximately: ${new Date().toISOString().split("T")[0]}
- "This month" means transactions in the current month
- "Last month" means transactions in the previous month
- Calculate month/year from transaction_date field

${dataSummary}

User's Question: "${query}"

Provide a helpful, witty, and ACCURATE answer based ONLY on this user's data above. Verify your calculations before responding:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error querying financial data:", error);
    return "Hmm, I'm having trouble accessing your data right now. Mind trying again? 🤔";
  }
}
