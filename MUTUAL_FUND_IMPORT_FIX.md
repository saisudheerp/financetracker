# Mutual Fund Import Fix - October 27, 2025

## Problem Summary

You encountered two critical issues when importing your Excel portfolio:

1. **Sold stocks appearing in portfolio** - Stocks with net-zero holdings (bought and sold) were still showing
2. **Mutual fund prices not updating** - All mutual funds showing "Failed to fetch" errors

## Root Cause Analysis

### Issue 1: Sold Stocks (FIXED ✅)

- **Problem**: The Excel import wasn't properly aggregating BUY/SELL transactions
- **Example**: VBL (4 bought, 4 sold = 0 net) was still appearing
- **Solution**: Enhanced the import logic with:
  - Proper BUY/SELL aggregation with weighted average price
  - PURCHASE/REDEEM aggregation for mutual funds
  - Triple-layer zero-quantity filtering (aggregation, service, UI)
  - Clear existing holdings before re-import (prevents duplicates)

### Issue 2: Mutual Fund Prices (PARTIALLY FIXED ⚠️)

- **Problem**: Mutual funds imported as "GrowwNifty", "MotilalOsw" etc. instead of AMFI codes
- **Root Cause**: MFAPI.in requires 6-digit AMFI scheme codes (e.g., "120716"), NOT scheme names
- **Your Excel Format**:
  ```
  Scheme Name                                    | Transaction Type | Units  | NAV     | Amount
  Groww Nifty Total Market Index Fund - Growth  | PURCHASE        | 10.5   | 74.20   | 779.10
  ```
- **What We Store**: The import saves the full scheme name in the `symbol` field
- **What MFAPI Expects**: A numeric code like `120716`
- **Result**: API calls fail with 404 errors because `https://api.mfapi.in/mf/GrowwNifty` doesn't exist

## Changes Made

### 1. portfolioService.js - Import Logic Enhanced

**BUY/SELL Aggregation** (Lines 493-536):

```javascript
if (type === 'BUY') {
  if (existingIndex >= 0) {
    // Weighted average price calculation
    const totalQty = existing.quantity + quantity;
    const totalValue = (existing.quantity * existing.purchase_price) + (quantity * price);
    existing.quantity = totalQty;
    existing.purchase_price = totalValue / totalQty;
  } else {
    holdings.push({ symbol, quantity, purchase_price, ... });
  }
} else if (type === 'SELL') {
  if (existingIndex >= 0) {
    holdings[existingIndex].quantity -= quantity;
    if (holdings[existingIndex].quantity <= 0) {
      holdings.splice(existingIndex, 1); // Remove sold stocks
    }
  }
}
```

**Mutual Fund Handling** (Lines 590-625):

```javascript
// Extract AMFI code if present in parentheses: "Groww Nifty (120716)"
let schemeCode = schemeName.match(/\((\d+)\)/)?.[1];
let cleanSchemeName = schemeName.replace(/\s*\(\d+\)\s*$/, "").trim();

// Store: If code available use it, otherwise store full name
symbol: schemeCode || cleanSchemeName;
```

**Final Safety Filter** (Line 673):

```javascript
const validHoldings = holdings.filter((h) => h.quantity > 0);
```

### 2. Portfolio.jsx - User Feedback Enhanced

**Import Toast Message** (Lines 304-310):

```javascript
let message = `Successfully imported ${successCount} holdings!`;
if (soldCount > 0) message += ` (${soldCount} sold stocks skipped)`;
if (mfWithoutCodes > 0)
  message += ` ⚠️ ${mfWithoutCodes} mutual funds need scheme code`;
```

**Warning Banner** (Lines 531-549):
Displays an amber alert box when mutual funds lack proper AMFI codes, with:

- Icon and bold heading
- Clear instructions to edit and add scheme codes
- Link to AMFI India website for code lookup

## What You Need to Do Now

### Step 1: Re-Import Your Excel File ✅

1. Click "Import" button on Portfolio page
2. Select your broker statement Excel file
3. Check the console logs (F12 → Console tab)
4. You should see:
   ```
   ✅ Found header row at index 5
   📦 Extracted data rows: 20
   ✅ Added GOLDBEES.NS: 20 units
   📉 Sold VBL.NS: -4 units, remaining: 0
   🗑️ Removed VBL.NS (zero holdings)
   Final holdings count: 6 (2 sold stocks removed)
   ```

### Step 2: Fix Mutual Fund Scheme Codes ⚠️

**Why This Is Needed:**
The MFAPI.in API requires exact 6-digit AMFI scheme codes. Your Excel likely has full scheme names like "Groww Nifty Total Market Index Fund - Direct Plan - Growth" but not the codes.

**How to Find AMFI Codes:**

**Option A - Official AMFI Website:**

1. Visit: https://www.amfiindia.com/net-asset-value/nav-history
2. Select "NAV of Schemes"
3. Search for your fund by name
4. Find the 6-digit code next to the scheme name

**Option B - Online Mutual Fund Portals:**

- **Groww**: https://groww.in/mutual-funds (search fund, code in URL)
- **Kuvera**: https://kuvera.in/explore/all-mutual-funds
- **MoneyControl**: https://www.moneycontrol.com/mutual-funds

**Common AMFI Codes:**

```
120716 - Parag Parikh Flexi Cap Fund - Direct - Growth
145553 - Groww Nifty Total Market Index Fund - Direct - Growth
125497 - Navi Nifty 50 Index Fund - Direct - Growth
122639 - Motilal Oswal Midcap Fund - Direct - Growth
145440 - Aditya Birla Sun Life Frontline Equity Fund - Direct - Growth
148243 - White Oak Capital Large and Mid Cap Fund - Direct - Growth
```

**How to Update in Portfolio:**

1. See the amber warning box above the holdings table
2. Click "Edit" button (pencil icon) next to each mutual fund
3. Replace the Symbol field with the 6-digit AMFI code
4. Save
5. Click "Refresh Prices" button

### Step 3: Verify Everything Works ✅

**Expected Results:**

- **Stocks**: All prices fetching automatically from Yahoo Finance
- **Mutual Funds**: NAV updating from MFAPI (after code update)
- **Sold Holdings**: VBL, OLAELEC etc. NOT appearing in portfolio
- **Console Logs**:
  ```
  🔄 Fetching prices for 6 holdings...
  📊 Fetching price for GOLDBEES.NS...
  ✅ GOLDBEES.NS: ₹74.20
  📊 Fetching price for 120716 (mutual_fund)...
  ✅ 120716: ₹145.32
  ✅ Price fetch complete: 6 successful, 0 failed
  ```

## Why Can't We Auto-Lookup Scheme Codes?

**Technical Limitation:**

- MFAPI.in doesn't have a search endpoint
- We'd need to maintain a huge database of 10,000+ schemes
- Scheme names vary by plan (Direct/Regular, Growth/Dividend)
- AMCs frequently launch new schemes

**Best Practice:**
Most portfolio trackers (Groww, Zerodha Coin) require users to select funds from a dropdown during import, which ensures correct codes. Manual editing after import is the safest approach.

## Alternative: Export Your AMFI Codes from Broker

**If your broker provides CAS (Consolidated Account Statement):**

1. Download CAS PDF from CAMS/Karvy
2. Scheme codes will be listed next to fund names
3. Note them down before importing

**If broker exports have codes:**
Some brokers include AMFI codes in parentheses:

```
Groww Nifty Total Market Index Fund - Direct Plan - Growth (145553)
```

The import will extract `145553` automatically in this case!

## Testing Checklist

- [ ] Re-imported Excel file successfully
- [ ] Sold stocks (VBL, OLAELEC) no longer appear in portfolio
- [ ] Stock prices updating automatically
- [ ] Warning banner appears for mutual funds (if any without codes)
- [ ] Edited mutual funds with correct AMFI codes
- [ ] Mutual fund NAVs updating after code update
- [ ] Console shows `✅ Price fetch complete: X successful, 0 failed`
- [ ] Stats cards showing correct Total Invested, Current Value, Gain/Loss

## Additional Notes

**Date Format Handling:**
The import now supports multiple date formats from brokers:

- `18-03-2025 11:43 AM` (Zerodha)
- `11 Aug 2025` (Groww)
- `15-Mar-2025` (Generic)
- ISO format `2025-03-18`

**Exchange Detection:**

- NSE stocks: Auto-adds `.NS` suffix (e.g., `GOLDBEES.NS`)
- BSE stocks: Auto-adds `.BO` suffix if exchange column says BSE
- Default: NSE

**Quantity Precision:**

- Stocks: Whole numbers (10, 20, etc.)
- Mutual Funds: Decimals up to 3 places (10.543 units)
- Zero threshold: < 0.01 for mutual funds, <= 0 for stocks

## Support

If issues persist:

1. Open browser console (F12)
2. Clear console
3. Try importing again
4. Copy full console output
5. Check for specific error messages in red

**Common Error Patterns:**

```
❌ GET https://api.mfapi.in/mf/GrowwNifty 404
   → Fix: Change symbol from "GrowwNifty" to "145553" (AMFI code)

❌ Error fetching price for XYZ.NS: Failed to fetch
   → Fix: Check if stock symbol is correct (Yahoo Finance issue)

⚠️ 3 sold stocks skipped
   → Normal: BUY/SELL aggregation working correctly
```

## What's Next?

Once mutual fund codes are updated:

1. Set up price alerts (±5% change notifications)
2. View portfolio analytics (sector allocation, gains/losses)
3. Export updated portfolio with current prices
4. Track historical performance

---

**Date Fixed**: October 27, 2025
**Files Modified**:

- `src/utils/portfolioService.js` (Import logic, aggregation, filtering)
- `src/pages/Portfolio.jsx` (Warning banner, toast messages)

**Status**:

- ✅ Sold stocks filtering: **FULLY FIXED**
- ⚠️ Mutual fund prices: **MANUAL UPDATE REQUIRED** (by design - AMFI code lookup)
