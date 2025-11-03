# Quick Guide: Finding AMFI Scheme Codes

## What is an AMFI Code?

The **AMFI Code** is a unique 6-digit number assigned to every mutual fund scheme in India by the Association of Mutual Funds in India (AMFI). This code is required to fetch live NAV (Net Asset Value) prices.

**Example:**

- Scheme Name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth"
- AMFI Code: **120716**

---

## Method 1: AMFI Official Website (Most Reliable)

### Steps:

1. Visit: **https://www.amfiindia.com/net-asset-value/nav-history**
2. Click on **"NAV of Schemes"** tab
3. Search for your fund name in the search box
4. Find your scheme in the list - the code is displayed next to the name

### Screenshot Reference:

```
Scheme Code | Scheme Name                                           | NAV    | Date
120716      | Parag Parikh Flexi Cap Fund - Direct Plan - Growth  | 58.45  | 26-Oct-2025
```

---

## Method 2: Groww App/Website

### Steps:

1. Open Groww: **https://groww.in/mutual-funds**
2. Search for your fund (e.g., "Groww Nifty")
3. Open the fund details page
4. Look at the **URL**: `https://groww.in/mutual-funds/groww-nifty-total-market-index-fund-direct-growth/145553`
5. The last 6 digits (`145553`) is the AMFI code

---

## Method 3: Kuvera

### Steps:

1. Visit: **https://kuvera.in/explore/all-mutual-funds**
2. Search for your fund
3. Click on the fund
4. The AMFI code is shown in the fund details section

---

## Method 4: MoneyControl

### Steps:

1. Visit: **https://www.moneycontrol.com/mutual-funds**
2. Search for your fund
3. Click on the scheme
4. Look for "Scheme Code" in the fund details

---

## Method 5: Your Broker's CAS (Consolidated Account Statement)

### Steps:

1. Download CAS from CAMS/Karvy
2. Open the PDF
3. Find your mutual fund section
4. AMFI codes are usually listed next to scheme names

### Example from CAS:

```
Folio No: 12345678
Groww Mutual Fund
  Groww Nifty Total Market Index Fund - Direct Plan - Growth (145553)
  Units: 10.543
  NAV: ₹74.20
```

---

## Common Mutual Fund AMFI Codes

### Index Funds

| Fund Name                                             | AMFI Code |
| ----------------------------------------------------- | --------- |
| Groww Nifty Total Market Index Fund - Direct - Growth | 145553    |
| Navi Nifty 50 Index Fund - Direct - Growth            | 125497    |
| ICICI Pru Nifty 50 Index Fund - Direct - Growth       | 120716    |
| UTI Nifty Index Fund - Direct - Growth                | 120716    |

### Large Cap

| Fund Name                                     | AMFI Code |
| --------------------------------------------- | --------- |
| Parag Parikh Flexi Cap Fund - Direct - Growth | 120716    |
| Axis Bluechip Fund - Direct - Growth          | 119551    |
| Mirae Asset Large Cap Fund - Direct - Growth  | 120503    |
| ICICI Pru Bluechip Fund - Direct - Growth     | 118989    |

### Mid Cap

| Fund Name                                      | AMFI Code |
| ---------------------------------------------- | --------- |
| Motilal Oswal Midcap Fund - Direct - Growth    | 122639    |
| Axis Midcap Fund - Direct - Growth             | 119550    |
| Kotak Emerging Equity Scheme - Direct - Growth | 118556    |

### Small Cap

| Fund Name                                     | AMFI Code |
| --------------------------------------------- | --------- |
| Nippon India Small Cap Fund - Direct - Growth | 125497    |
| HDFC Small Cap Fund - Direct - Growth         | 118825    |
| Axis Small Cap Fund - Direct - Growth         | 120834    |

### Hybrid/Other

| Fund Name                                           | AMFI Code |
| --------------------------------------------------- | --------- |
| Aditya Birla SL Frontline Equity - Direct - Growth  | 145440    |
| White Oak Capital Large & Mid Cap - Direct - Growth | 148243    |

_Note: These codes are for Direct Plan - Growth option. Regular plans and Dividend options have different codes._

---

## How to Use the AMFI Code in Your Portfolio

### Step-by-Step:

1. **Import your Excel file** - Holdings will be imported with full scheme names
2. **See the warning banner** - "Mutual Funds Need AMFI Scheme Code"
3. **Find the AMFI code** - Use any method above
4. **Click Edit** - Click the pencil icon next to the mutual fund
5. **Update Symbol field** - Replace the scheme name with the 6-digit code
   ```
   Before: "GrowwNifty" or "Groww Nifty Total Market Index Fund"
   After:  "145553"
   ```
6. **Save** - Click Save button
7. **Refresh Prices** - Click the "Refresh Prices" button
8. **Verify** - Check that NAV is now showing correctly

---

## Pro Tips

### 1. **Direct vs Regular Plans**

- **Direct Plan**: Lower expense ratio, better returns (recommended)
- **Regular Plan**: Higher expense ratio (distributor commission included)
- **Different AMFI Codes**: Same fund with Direct and Regular plans have different codes

### 2. **Growth vs Dividend Options**

- **Growth**: NAV grows, no dividends (recommended for long-term)
- **Dividend**: Pays dividends periodically, NAV doesn't grow as much
- **Different AMFI Codes**: Same fund with Growth and Dividend options have different codes

### 3. **Finding Your Exact Plan**

Always check your CAS or broker statement to know if you have:

- Direct or Regular
- Growth or Dividend

Enter the AMFI code for the **exact** plan you hold.

### 4. **Saving Codes for Future**

Once you find your codes, save them in a spreadsheet:

```
Scheme Name                        | AMFI Code | Plan Type
Groww Nifty TMI Fund              | 145553    | Direct-Growth
Parag Parikh Flexi Cap            | 120716    | Direct-Growth
```

---

## Troubleshooting

### "I entered the code but still getting 404 error"

**Possible Causes:**

1. **Wrong code** - Double-check on AMFI website
2. **Fund closed** - Some old schemes are closed to fresh subscriptions
3. **New fund** - Very new funds might not be on MFAPI yet

**Solution:**

- Verify code on AMFI website
- Try fetching manually: `https://api.mfapi.in/mf/145553`
- If 404 persists, the fund might not be on MFAPI (rare)

### "Which plan do I have?"

Check your latest CAS or broker statement. Look for keywords:

- "Direct Plan" or "Regular Plan"
- "Growth" or "Dividend" or "IDCW"

### "Can I use scheme name instead of code?"

**No.** The MFAPI.in API only accepts numeric AMFI codes. Scheme names will not work.

---

## Quick Checklist

Before importing:

- [ ] Downloaded latest Excel statement from broker
- [ ] Noted down all mutual fund scheme names
- [ ] Found AMFI codes for each scheme
- [ ] Verified codes on AMFI website

After importing:

- [ ] Warning banner appeared for mutual funds
- [ ] Clicked Edit for each mutual fund
- [ ] Entered 6-digit AMFI code in Symbol field
- [ ] Saved each entry
- [ ] Clicked Refresh Prices button
- [ ] Verified NAV is showing correctly
- [ ] Console shows no 404 errors

---

## API Testing

### Test if AMFI code works:

**Browser Method:**
Open in browser: `https://api.mfapi.in/mf/120716`

**Expected Response:**

```json
{
  "meta": {
    "fund_house": "Parag Parikh Mutual Fund",
    "scheme_type": "Open Ended Schemes",
    "scheme_category": "Equity Scheme - Flexi Cap Fund",
    "scheme_code": "120716",
    "scheme_name": "Parag Parikh Flexi Cap Fund - Direct Plan - Growth"
  },
  "data": [
    {
      "date": "26-10-2025",
      "nav": "58.45"
    }
  ],
  "status": "SUCCESS"
}
```

**If you get 404:**

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "The scheme code you've entered doesn't exist."
}
```

→ Wrong code - double-check on AMFI website

---

## External Resources

### Official Sources:

- **AMFI NAV**: https://www.amfiindia.com/net-asset-value/nav-history
- **CAMS**: https://www.camsonline.com/
- **Karvy**: https://mfs.kfintech.com/

### Third-Party Tools:

- **Groww**: https://groww.in/mutual-funds
- **Kuvera**: https://kuvera.in/
- **MoneyControl**: https://www.moneycontrol.com/mutual-funds
- **Value Research**: https://www.valueresearchonline.com/

### API Documentation:

- **MFAPI**: https://www.mfapi.in/

---

**Last Updated**: October 27, 2025  
**For**: Finance Tracker - Portfolio Module
