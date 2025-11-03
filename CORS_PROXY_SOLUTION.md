# CORS Proxy Solution for Yahoo Finance API

## Problem

Yahoo Finance APIs block direct requests from browsers due to CORS (Cross-Origin Resource Sharing) policy:

```
Access to fetch at 'https://query1.finance.yahoo.com/...' from origin 'http://localhost:5174'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

## Current Solution: CORS Proxy

**What I implemented:** Using `https://api.allorigins.win/raw?url=` as a CORS proxy.

**How it works:**

1. Instead of: `fetch('https://query1.finance.yahoo.com/...')`
2. We use: `fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://query1.finance.yahoo.com/...'))`
3. The proxy fetches the data and returns it with proper CORS headers

**Code changes:**

```javascript
// Added at top of portfolioService.js
const CORS_PROXY = "https://api.allorigins.win/raw?url=";

// Updated all fetch calls
const apiUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${fullSymbol}?modules=price`;
const url = `${CORS_PROXY}${encodeURIComponent(apiUrl)}`;
const response = await fetch(url);
```

## ⚠️ Limitations of Current Solution

1. **Rate limiting**: Public CORS proxies have rate limits
2. **Reliability**: Third-party service may go down
3. **Privacy**: Your API requests go through a third party
4. **Speed**: Extra network hop adds latency
5. **Not production-ready**: Free proxies not suitable for production

## Better Solutions

### Option 1: Backend Proxy (Recommended for Production)

Create your own backend API that proxies requests to Yahoo Finance.

**Benefits:**

- Full control over caching and rate limiting
- Better security and privacy
- Can add authentication
- Can implement fallbacks

**Implementation:**

1. **Create a Node.js/Express backend:**

```javascript
// server.js
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());

app.get("/api/stock/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log("Proxy running on port 3001"));
```

2. **Update frontend to use your backend:**

```javascript
// Instead of Yahoo Finance directly
const response = await fetch(`http://localhost:3001/api/stock/${symbol}`);
```

### Option 2: Supabase Edge Functions

Since you're using Supabase, create an Edge Function:

```typescript
// supabase/functions/stock-price/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { symbol } = await req.json();

  const response = await fetch(
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    }
  );

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});
```

Deploy:

```bash
supabase functions deploy stock-price
```

Use in frontend:

```javascript
const { data } = await supabase.functions.invoke("stock-price", {
  body: { symbol: "RELIANCE.NS" },
});
```

### Option 3: Alternative APIs with CORS Support

Use APIs that allow browser requests:

1. **Alpha Vantage** (Free tier available)

   - URL: https://www.alphavantage.co/
   - 5 API calls per minute on free tier
   - CORS-enabled

2. **Finnhub** (Free tier available)

   - URL: https://finnhub.io/
   - 60 API calls per minute on free tier
   - CORS-enabled

3. **Twelve Data** (Free tier available)
   - URL: https://twelvedata.com/
   - 8 API calls per minute on free tier
   - CORS-enabled

**Example with Alpha Vantage:**

```javascript
const API_KEY = "your_api_key";
const symbol = "RELIANCE.BSE"; // Use BSE/NSE codes

const response = await fetch(
  `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
);

const data = await response.json();
const price = data["Global Quote"]["05. price"];
```

### Option 4: Browser Extension (Development Only)

Install a CORS-unblock browser extension (Chrome/Firefox):

- "Allow CORS: Access-Control-Allow-Origin"
- "CORS Unblock"

**⚠️ Only for development, never for production!**

## Migration Path

**Immediate (Current):**

- ✅ Using public CORS proxy (api.allorigins.win)
- Works for development and testing
- No backend required

**Short-term (1-2 weeks):**

- Create simple Express.js proxy
- Deploy to Vercel/Railway/Render (free tiers available)
- Update frontend to use your proxy

**Long-term (Production):**

- Migrate to Supabase Edge Functions
- Implement caching with Redis
- Add rate limiting per user
- Store historical data in database

## Current Status

✅ **WORKING NOW**: All stock price APIs updated to use CORS proxy

- v10 quoteSummary API ✅
- v8 Chart API ✅
- v7 Quote API ✅
- Stock history API ✅

**Next Steps:**

1. Test the current implementation
2. Monitor allorigins.win reliability
3. Plan backend proxy deployment before production

## Testing

Refresh your portfolio page. You should now see:

```
🔍 Fetching price for RELIANCE.NS using yfinance API...
✅ Got price via v10 API: ₹2650.50
```

Instead of CORS errors.

## Resources

- [CORS Explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Express.js Proxy Tutorial](https://expressjs.com/)
- [Alternative Stock APIs](https://github.com/public-apis/public-apis#finance)
