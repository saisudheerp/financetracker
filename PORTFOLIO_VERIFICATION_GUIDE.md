# Quick Setup Guide - Portfolio with Realized Gains

## Current Status ✅

Your code is **already working correctly**:

### 1. Weighted Average Pricing ✅

**Location:** `src/utils/portfolioService.js` (Lines 505-507)

```javascript
// When you BUY more of same stock:
const totalQty = existing.quantity + quantity;
const totalValue =
  existing.quantity * existing.purchase_price + quantity * price;
existing.purchase_price = totalValue / totalQty; // ← Weighted average
```

**Example:**

- You have 10 shares @ ₹100 avg
- You buy 5 shares @ ₹120
- New avg: (10×100 + 5×120) / 15 = **₹106.67**

### 2. Current Price Fetching ✅

**Location:** `src/pages/Portfolio.jsx` (Lines 92-115)

```javascript
// Fetches live prices on page load and refresh
for (const holding of holdings) {
  if (holding.asset_type === "stock") {
    priceInfo = await fetchStockPrice(holding.symbol); // Yahoo Finance
  } else {
    priceInfo = await fetchMutualFundNAV(holding.symbol); // MFAPI
  }
  pricesData[holding.symbol] = priceInfo;
}
```

### 3. Stats Calculation ✅

**Location:** `src/utils/portfolioService.js` (calculatePortfolioStats)

```javascript
// Total Invested = Σ(quantity × avg_buy_price)
// Current Value = Σ(quantity × current_price)
// Gain/Loss = Current Value - Total Invested
```

---

## What's Missing (Optional Enhancement)

### Realized Gains Column

The `realized_gains` column is **optional** - only needed if you want to track profit/loss from sold stocks.

**Current behavior:**

- Sold stocks are removed from portfolio ✅
- You only see unrealized gains (current holdings) ✅

**With realized_gains:**

- Tracks profit/loss from sold stocks
- Shows total P&L (realized + unrealized)

---

## How to Verify It's Working

### Test 1: Check Weighted Average

1. **Import your Excel** with these transactions:

   ```
   BUY  10 GOLDBEES @ ₹74.00
   BUY   5 GOLDBEES @ ₹75.00
   ```

2. **Expected Result:**

   ```
   Quantity: 15
   Avg Price: (10×74 + 5×75) / 15 = 74.33
   ```

3. **Check in Console:**
   ```
   ✅ Added GOLDBEES.NS: 10 units
   ✅ Updated GOLDBEES.NS: 15 units
   ```

### Test 2: Check Current Price Fetching

1. **Open Portfolio page**

2. **Open Console (F12)**

3. **Look for:**

   ```
   🔄 Fetching prices for 6 holdings...
   📊 Fetching price for GOLDBEES.NS (stock)...
   ✅ GOLDBEES.NS: ₹74.20
   ✅ Price fetch complete: 6 successful, 0 failed
   ```

4. **Verify in UI:**
   - Buy Price column shows: ₹74.33 (your avg)
   - Current Price column shows: ₹74.20 (live from API)
   - Gain/Loss calculated correctly

### Test 3: Check Sell Removes Stock

1. **Import Excel with:**

   ```
   BUY  10 VBL @ ₹100
   SELL 10 VBL @ ₹120
   ```

2. **Expected:** VBL does NOT appear in portfolio (quantity = 0)

3. **Check Console:**
   ```
   ✅ Added VBL.NS: 10 units
   📉 Sold VBL.NS: -10 units, remaining: 0
   🗑️ Removed VBL.NS (zero holdings)
   Final holdings count: 5 (1 sold stocks removed)
   ```

---

## Optional: Add Realized Gains Tracking

**Only do this if you want to track profit from sold stocks.**

### Step 1: Run SQL Migration

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Go to:** SQL Editor
3. **Copy entire content** of: `SQL Scripts/PORTFOLIO_ADD_REALIZED_GAINS.sql`
4. **Paste and Run**
5. **Verify Success:**
   ```
   ✅ Realized gains tracking added successfully!
   ```

### Step 2: Update Portfolio Display

Add realized gains to holdings table (optional UI enhancement).

---

## Troubleshooting

### Problem: "Prices not updating"

**Cause:** Mutual funds need AMFI codes

**Solution:**

1. See amber warning banner
2. Edit mutual fund holdings
3. Replace symbol with 6-digit AMFI code
4. Example: "GrowwNifty" → "145553"
5. See `AMFI_CODE_GUIDE.md` for help

### Problem: "Average not calculating"

**Verify import logs:**

```
✅ Added SYMBOL: 10 units
✅ Updated SYMBOL: 15 units  ← Should show "Updated"
```

If shows "Added" twice → Bug in matching logic

### Problem: "Sold stocks still showing"

**Check:**

1. Excel has both BUY and SELL for same stock?
2. Console shows "Removed" message?
3. If not, check `Order status` column = "Executed"

---

## Complete Example Walkthrough

### Your Excel File:

```
Stock name  | Symbol    | Type | Quantity | Value   | Order status
GOLDBEES    | GOLDBEES  | BUY  | 10       | 740     | Executed
GOLDBEES    | GOLDBEES  | BUY  | 5        | 375     | Executed
GOLDBEES    | GOLDBEES  | SELL | 3        | 228     | Executed
VBL         | VBL       | BUY  | 4        | 400     | Executed
VBL         | VBL       | SELL | 4        | 480     | Executed
```

### Processing Steps:

**Row 1:** BUY 10 GOLDBEES @ ₹74

```javascript
holdings = {
  "GOLDBEES.NS": { qty: 10, avg: 74 },
};
```

**Row 2:** BUY 5 GOLDBEES @ ₹75

```javascript
// Weighted average
new_avg = (10×74 + 5×75) / 15 = 74.33
holdings = {
  "GOLDBEES.NS": { qty: 15, avg: 74.33 }
}
```

**Row 3:** SELL 3 GOLDBEES @ ₹76

```javascript
// Reduce quantity
holdings = {
  "GOLDBEES.NS": { qty: 12, avg: 74.33 }, // avg unchanged
};
```

**Row 4:** BUY 4 VBL @ ₹100

```javascript
holdings = {
  "GOLDBEES.NS": { qty: 12, avg: 74.33 },
  "VBL.NS": { qty: 4, avg: 100 },
};
```

**Row 5:** SELL 4 VBL @ ₹120

```javascript
// Quantity = 0, remove
holdings = {
  "GOLDBEES.NS": { qty: 12, avg: 74.33 },
};
// VBL removed (sold out)
```

### Final Result in Database:

```sql
SELECT * FROM portfolio_holdings;

symbol        | quantity | purchase_price
──────────────┼──────────┼────────────────
GOLDBEES.NS   | 12       | 74.33
```

### UI Display:

```
Asset       | Qty | Buy Price | Current | Invested | Value  | Gain/Loss
────────────┼─────┼───────────┼─────────┼──────────┼────────┼──────────
GOLDBEES    | 12  | ₹74.33    | ₹75.50  | ₹892     | ₹906   | +₹14 (+1.57%)
```

**Calculation:**

- Invested: 12 × 74.33 = ₹892
- Current: 12 × 75.50 = ₹906 (live price from API)
- Gain: 906 - 892 = +₹14

---

## Summary

### ✅ What's Already Working:

1. **Weighted Average Pricing** - Calculated during import
2. **Current Price Fetching** - Yahoo Finance + MFAPI
3. **BUY/SELL Aggregation** - Multiple transactions combined
4. **Zero Quantity Removal** - Sold stocks filtered out
5. **Unrealized Gains** - Calculated from current prices
6. **Development Clear Button** - Reset portfolio easily

### ⚠️ What Needs Action:

1. **Mutual Fund AMFI Codes** - Edit and add 6-digit codes
2. **SQL Migration** (Optional) - Only if you want realized gains tracking

### 📊 How to Use:

1. **Import Excel** → Click Import button, select file
2. **Check Console** → Verify processing logs
3. **Edit MFs** → Add AMFI codes if needed
4. **Refresh Prices** → Click Refresh button
5. **View Stats** → See total invested, current value, gains

---

**Last Updated:** October 27, 2025  
**Status:** Fully Functional ✅  
**Optional:** Add realized gains migration
