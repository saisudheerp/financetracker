# Portfolio Computation Logic - Complete Guide

## Overview

This document explains how the Finance Tracker Portfolio module handles:

- **Multiple transactions** (BUY/SELL) for the same stock
- **Weighted average pricing** calculation
- **Realized gains** (from sold stocks)
- **Unrealized gains** (from current holdings)
- **Total portfolio performance** tracking

---

## Core Concepts

### 1. Quantity Management

- **BUY** → Adds to quantity
- **SELL** → Reduces quantity
- **Quantity = 0** → Holding removed from portfolio

### 2. Average Buy Price

- Calculated using **weighted average** formula
- Updates only on BUY transactions
- Remains same during SELL transactions

### 3. Gains & Losses

- **Realized Gain/Loss**: Profit/loss from SELL transactions (locked in)
- **Unrealized Gain/Loss**: Profit/loss from current holdings (paper gains)
- **Total Gain/Loss**: Realized + Unrealized

---

## Mathematical Formulas

### Formula 1: Weighted Average Price (on BUY)

When buying more units of a stock you already hold:

```
New Avg Price = (Old Quantity × Old Avg Price) + (Buy Quantity × Buy Price)
                ────────────────────────────────────────────────────────────
                              Old Quantity + Buy Quantity
```

**Example:**

```
Current: 10 shares @ ₹100 avg
Buy:     5 shares @ ₹120

New Avg = (10 × 100) + (5 × 120)
          ─────────────────────
               10 + 5

        = (1000 + 600) / 15
        = 1600 / 15
        = ₹106.67
```

**Result:** You now hold **15 shares @ ₹106.67 avg**

---

### Formula 2: Realized Gain/Loss (on SELL)

When selling shares:

```
Realized Gain = (Sell Price - Average Buy Price) × Quantity Sold
```

**Example:**

```
Holding: 15 shares @ ₹106.67 avg
Sell:    5 shares @ ₹130

Realized Gain = (130 - 106.67) × 5
              = 23.33 × 5
              = ₹116.65 profit
```

**Result:**

- **Realized Gain**: ₹116.65 (locked in)
- **Remaining**: 10 shares @ ₹106.67 avg (avg doesn't change)

---

### Formula 3: Unrealized Gain/Loss

For current holdings:

```
Unrealized Gain = (Current Price - Average Buy Price) × Quantity Held
```

**Example:**

```
Holding:       10 shares @ ₹106.67 avg
Current Price: ₹140

Unrealized Gain = (140 - 106.67) × 10
                = 33.33 × 10
                = ₹333.30 (paper profit)
```

---

### Formula 4: Total Gain/Loss

```
Total Gain = Realized Gain + Unrealized Gain
```

**Example (continuing from above):**

```
Realized Gain:   ₹116.65  (from 5 shares sold @ ₹130)
Unrealized Gain: ₹333.30  (from 10 shares held @ ₹140 current)
───────────────────────────
Total Gain:      ₹449.95
```

---

## Transaction Scenarios

### Scenario 1: Simple BUY

**Transaction:**

```
BUY 10 shares of RELIANCE @ ₹2,500
```

**Computation:**

```javascript
// First purchase - no averaging needed
quantity = 10
avg_price = 2500
total_invested = 10 × 2500 = ₹25,000
```

**Database State:**

```sql
INSERT INTO portfolio_holdings VALUES (
  quantity: 10,
  purchase_price: 2500,
  realized_gains: 0
);
```

---

### Scenario 2: Second BUY (Averaging)

**Current State:**

```
10 shares @ ₹2,500 avg
```

**Transaction:**

```
BUY 5 shares @ ₹2,700
```

**Computation:**

```javascript
old_qty = 10
old_avg = 2500
buy_qty = 5
buy_price = 2700

new_qty = 10 + 5 = 15
new_avg = ((10 × 2500) + (5 × 2700)) / 15
        = (25000 + 13500) / 15
        = 38500 / 15
        = 2566.67

total_invested = 15 × 2566.67 = ₹38,500
```

**Database State:**

```sql
UPDATE portfolio_holdings SET
  quantity = 15,
  purchase_price = 2566.67;
```

---

### Scenario 3: Partial SELL (Profit)

**Current State:**

```
15 shares @ ₹2,566.67 avg
```

**Transaction:**

```
SELL 5 shares @ ₹2,800
```

**Computation:**

```javascript
sell_qty = 5
sell_price = 2800
avg_price = 2566.67

// Calculate realized gain
realized_gain = (2800 - 2566.67) × 5
              = 233.33 × 5
              = ₹1,166.65 profit

// Update quantity (avg stays same)
new_qty = 15 - 5 = 10
avg_price = 2566.67 (unchanged)
```

**Database State:**

```sql
UPDATE portfolio_holdings SET
  quantity = 10,
  realized_gains = realized_gains + 1166.65;

INSERT INTO portfolio_transactions VALUES (
  transaction_type: 'SELL',
  quantity: 5,
  price: 2800,
  realized_gain: 1166.65,
  avg_price_at_sell: 2566.67
);
```

---

### Scenario 4: Partial SELL (Loss)

**Current State:**

```
10 shares @ ₹2,566.67 avg
```

**Transaction:**

```
SELL 3 shares @ ₹2,400
```

**Computation:**

```javascript
sell_qty = 3
sell_price = 2400
avg_price = 2566.67

// Calculate realized loss
realized_gain = (2400 - 2566.67) × 3
              = -166.67 × 3
              = -₹500.01 loss

// Update quantity
new_qty = 10 - 3 = 7
avg_price = 2566.67 (unchanged)
```

**Database State:**

```sql
UPDATE portfolio_holdings SET
  quantity = 7,
  realized_gains = 1166.65 + (-500.01) = 666.64;
```

---

### Scenario 5: Complete SELL (Close Position)

**Current State:**

```
7 shares @ ₹2,566.67 avg
Previous realized gains: ₹666.64
```

**Transaction:**

```
SELL 7 shares @ ₹2,900
```

**Computation:**

```javascript
sell_qty = 7
sell_price = 2900
avg_price = 2566.67

// Calculate final realized gain
realized_gain = (2900 - 2566.67) × 7
              = 333.33 × 7
              = ₹2,333.31 profit

// Total realized from this stock
total_realized = 666.64 + 2333.31 = ₹2,999.95
```

**Database State:**

```sql
-- Record final transaction
INSERT INTO portfolio_transactions VALUES (
  transaction_type: 'SELL',
  quantity: 7,
  price: 2900,
  realized_gain: 2333.31,
  avg_price_at_sell: 2566.67
);

-- Delete holding (quantity = 0)
DELETE FROM portfolio_holdings WHERE id = holding_id;
```

**Note:** The `realized_gains` value (₹2,999.95) is preserved in the transaction history even though the holding is deleted.

---

### Scenario 6: Rebuy After Complete Sell

**Previous State:**

```
All shares sold
Total realized: ₹2,999.95 (from past transactions)
```

**Transaction:**

```
BUY 20 shares @ ₹3,000
```

**Computation:**

```javascript
// Fresh start - previous realized gains don't affect new position
quantity = 20
avg_price = 3000
realized_gains = 0  // Reset for new position
total_invested = 20 × 3000 = ₹60,000
```

**Database State:**

```sql
INSERT INTO portfolio_holdings VALUES (
  quantity: 20,
  purchase_price: 3000,
  realized_gains: 0  -- Fresh position
);
```

**Important:** Past realized gains are stored in `portfolio_transactions` for historical tracking, but the new holding starts with `realized_gains = 0`.

---

## Portfolio Metrics Calculation

### Current Implementation (Portfolio.jsx)

**1. Total Invested:**

```javascript
const totalInvested = holdings.reduce((sum, h) => {
  return sum + h.quantity * h.purchase_price;
}, 0);
```

**2. Current Value:**

```javascript
const totalCurrent = holdings.reduce((sum, h) => {
  const currentPrice = prices[h.symbol]?.currentPrice || h.purchase_price;
  return sum + h.quantity * currentPrice;
}, 0);
```

**3. Unrealized Gain/Loss:**

```javascript
const unrealizedGainLoss = totalCurrent - totalInvested;
```

**4. Realized Gains (from all holdings):**

```javascript
const totalRealized = holdings.reduce((sum, h) => {
  return sum + (h.realized_gains || 0);
}, 0);
```

**5. Total Gain/Loss:**

```javascript
const totalGainLoss = unrealizedGainLoss + totalRealized;
```

---

## Enhanced Portfolio Summary View

The SQL view `portfolio_summary` provides a complete picture:

```sql
SELECT
  symbol,
  name,
  quantity,
  avg_buy_price,
  current_price,

  -- Amounts
  (quantity * avg_buy_price) AS total_invested,
  (quantity * current_price) AS current_value,

  -- Unrealized (paper gains)
  (current_price - avg_buy_price) * quantity AS unrealized_gain,
  ((current_price - avg_buy_price) / avg_buy_price * 100) AS unrealized_gain_percent,

  -- Realized (locked in)
  realized_gains,

  -- Total performance
  (realized_gains + (current_price - avg_buy_price) * quantity) AS total_gain

FROM portfolio_summary
WHERE user_id = 'user-uuid';
```

**Example Output:**

```
Symbol  | Qty | Avg    | Current | Invested | Value  | Unrealized | Realized | Total
────────┼─────┼────────┼─────────┼──────────┼────────┼────────────┼──────────┼───────
TCS.NS  | 10  | 3500   | 3800    | 35,000   | 38,000 | +3,000     | +1,500   | +4,500
INFY.NS | 15  | 1400   | 1350    | 21,000   | 20,250 | -750       | +500     | -250
────────┴─────┴────────┴─────────┴──────────┴────────┴────────────┴──────────┴───────
TOTAL          Portfolio         | 56,000   | 58,250 | +2,250     | +2,000   | +4,250
```

---

## Database Functions Usage

### 1. Buy Stock

```sql
SELECT process_buy_transaction(
  'user-uuid',           -- user_id
  'RELIANCE.NS',         -- symbol
  'stock',               -- asset_type
  'Reliance Industries', -- name
  10,                    -- quantity
  2500,                  -- price
  '2025-01-15',         -- transaction_date
  'Energy',             -- sector
  'NSE'                 -- exchange
);
```

### 2. Sell Stock

```sql
SELECT process_sell_transaction(
  'user-uuid',           -- user_id
  'RELIANCE.NS',         -- symbol
  5,                     -- quantity
  2700,                  -- price
  '2025-03-20'          -- transaction_date
);
```

### 3. View Complete Transaction History

```sql
SELECT
  transaction_date,
  transaction_type,
  symbol,
  quantity,
  price,
  total_amount,
  realized_gain,
  avg_price_at_sell
FROM portfolio_transactions
WHERE user_id = 'user-uuid'
ORDER BY transaction_date DESC;
```

**Example Output:**

```
Date       | Type | Symbol      | Qty | Price | Amount  | Realized | Avg at Sell
───────────┼──────┼─────────────┼─────┼───────┼─────────┼──────────┼────────────
2025-03-20 | SELL | RELIANCE.NS | 5   | 2700  | 13,500  | +666.65  | 2566.67
2025-02-10 | BUY  | RELIANCE.NS | 5   | 2700  | 13,500  | -        | -
2025-01-15 | BUY  | RELIANCE.NS | 10  | 2500  | 25,000  | -        | -
```

---

## Import Logic (Excel/CSV)

The `portfolioService.js` import function now properly aggregates transactions:

```javascript
// Pseudo-code
holdings = {}

for each row in excel:
  if row.type == 'BUY':
    if holdings[symbol] exists:
      // Weighted average
      total_qty = holdings[symbol].qty + row.qty
      total_value = (holdings[symbol].qty * holdings[symbol].avg) + (row.qty * row.price)
      holdings[symbol].qty = total_qty
      holdings[symbol].avg = total_value / total_qty
    else:
      // New holding
      holdings[symbol] = { qty: row.qty, avg: row.price }

  else if row.type == 'SELL':
    if holdings[symbol] exists:
      holdings[symbol].qty -= row.qty

      // Remove if zero
      if holdings[symbol].qty <= 0:
        delete holdings[symbol]

// Filter and return only positive quantities
return holdings.filter(h => h.qty > 0)
```

---

## API Integration Plan

### Current State

✅ Stock prices: Yahoo Finance API  
✅ Mutual funds: MFAPI.in  
✅ Import: Excel/CSV with BUY/SELL aggregation  
⏳ Transaction recording: Manual (via AddHoldingModal)

### Future Enhancement

- Add "Add Transaction" button
- Modal with BUY/SELL selector
- Auto-calculate and update holdings
- Store in `portfolio_transactions` table
- Generate P&L reports

---

## Testing Checklist

- [ ] Buy stock first time → Correct avg price
- [ ] Buy same stock again → Weighted avg calculated correctly
- [ ] Sell partial → Realized gain calculated, avg unchanged
- [ ] Sell all → Holding removed, realized gain stored
- [ ] Rebuy after complete sell → Fresh position, old realized separated
- [ ] Import Excel with multiple BUY/SELL → Net position correct
- [ ] Import Excel with sold stocks → Zero quantity filtered out
- [ ] Current value calculation → Uses latest price
- [ ] Unrealized gain → Calculated from current price vs avg
- [ ] Total gain → Realized + Unrealized summed correctly

---

## Common Pitfalls & Solutions

### ❌ Pitfall 1: Averaging on SELL

**Wrong:**

```javascript
// DON'T recalculate average when selling
new_avg = (old_qty * old_avg - sell_qty * sell_price) / new_qty;
```

**Correct:**

```javascript
// Average stays same, only reduce quantity
new_qty = old_qty - sell_qty;
avg = old_avg; // Unchanged
```

---

### ❌ Pitfall 2: Forgetting Realized Gains

**Wrong:**

```javascript
// Only showing unrealized
total_gain = current_value - invested;
```

**Correct:**

```javascript
// Include both
total_gain = current_value - invested + realized_gains;
```

---

### ❌ Pitfall 3: Not Removing Zero Quantity

**Wrong:**

```javascript
// Keeping stocks with 0 shares
holdings.filter((h) => h.qty >= 0);
```

**Correct:**

```javascript
// Remove when quantity becomes zero
holdings.filter((h) => h.qty > 0);
```

---

## References

- **Portfolio Theory**: https://www.investopedia.com/terms/a/averagecostmethod.asp
- **Weighted Average**: https://en.wikipedia.org/wiki/Weighted_arithmetic_mean
- **Capital Gains Tax** (India): https://cleartax.in/s/capital-gain-tax

---

**Last Updated**: October 27, 2025  
**Module**: Finance Tracker - Portfolio Module  
**Version**: 2.0 (with Realized Gains tracking)
