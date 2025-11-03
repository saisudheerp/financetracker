import PORTFOLIO_CONFIG from "../config/portfolioConfig";
import * as XLSX from "xlsx";

/**
 * Fetch live stock price from Yahoo Finance with NSE fallback
 * Uses yfinance-compatible API endpoints (free, no API key required)
 * Implements multiple fallback strategies for 100% reliability
 */
export async function fetchStockPrice(symbol) {
  try {
    // Always use NSE (.NS) - treat all stocks as NSE
    let fullSymbol = symbol;
    let baseSymbol = symbol.replace(".NS", "").replace(".BO", "");

    if (!symbol.includes(".NS")) {
      fullSymbol = baseSymbol + ".NS";
    }

    console.log(
      `🔍 Fetching price for ${fullSymbol} using multi-source API...`
    );

    // Method 1: Try v8 Chart API first (fastest and most reliable)
    try {
      const result = await fetchStockPriceV8Chart(fullSymbol);
      if (result) {
        console.log(`✅ Got price via v8 Chart: ₹${result.currentPrice}`);
        return result;
      }
    } catch (e) {
      console.warn("v8 Chart failed, trying v10...");
    }

    // Method 2: Try Yahoo Finance v10 API
    try {
      const result = await fetchStockPriceV10(fullSymbol);
      if (result) {
        console.log(`✅ Got price via v10 API: ₹${result.currentPrice}`);
        return result;
      }
    } catch (e) {
      console.warn("v10 API failed, trying NSE direct...");
    }

    // Method 3: Try NSE India API (CORS-free, official source)
    try {
      const result = await fetchFromNSEDirect(baseSymbol);
      if (result) {
        console.log(`✅ Got price via NSE Direct: ₹${result.currentPrice}`);
        return result;
      }
    } catch (e) {
      console.warn("NSE Direct failed:", e.message);
    }

    throw new Error("All price fetching methods failed");
  } catch (error) {
    console.error(`❌ Error fetching stock price for ${symbol}:`, error);
    throw new Error(`Failed to fetch stock price: ${error.message}`);
  }
}

// Multiple CORS proxies for reliability (Yahoo Finance blocks direct browser requests)
// Will try each one in order until success
const CORS_PROXIES = [
  "https://api.allorigins.win/raw?url=",
  "https://corsproxy.io/?",
  "https://cors-anywhere.herokuapp.com/",
];

// Helper function to try fetch with multiple proxies
async function fetchWithProxy(url, retries = 3) {
  let lastError;

  for (const proxy of CORS_PROXIES) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const proxyUrl = proxy.includes("allorigins")
          ? `${proxy}${encodeURIComponent(url)}`
          : `${proxy}${url}`;

        console.log(
          `Trying proxy: ${proxy.substring(
            0,
            30
          )}... (attempt ${attempt}/${retries})`
        );
        const response = await fetch(proxyUrl, {
          signal: AbortSignal.timeout(10000), // Increased to 10 seconds
        });

        if (response.ok) {
          return response;
        }
      } catch (error) {
        lastError = error;
        console.warn(
          `Proxy ${proxy} attempt ${attempt} failed:`,
          error.message
        );
        if (attempt < retries) {
          // Wait 1 second before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        continue;
      }
    }
  }

  throw lastError || new Error("All proxies failed");
}

/**
 * Method 1: Yahoo Finance v10 API (yfinance equivalent)
 * Most accurate, includes all market data
 */
async function fetchStockPriceV10(fullSymbol) {
  const apiUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${fullSymbol}?modules=price,summaryDetail`;

  const response = await fetchWithProxy(apiUrl);

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();

  if (data.quoteSummary?.result?.[0]?.price) {
    const price = data.quoteSummary.result[0].price;
    const currentPrice =
      price.regularMarketPrice?.raw || price.postMarketPrice?.raw;
    const previousClose = price.regularMarketPreviousClose?.raw;

    if (!currentPrice || !previousClose) {
      throw new Error("Missing price data");
    }

    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      symbol: fullSymbol,
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      previousClose: parseFloat(previousClose.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      currency: price.currency || "INR",
      marketState: price.marketState || "CLOSED",
      lastUpdated: new Date().toISOString(),
    };
  }

  throw new Error("No price data in v10 response");
}

/**
 * Method 2: Yahoo Finance v8 Chart API
 * Good for real-time data with chart metadata
 */
async function fetchStockPriceV8Chart(fullSymbol) {
  const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${fullSymbol}?interval=1d&range=1d`;

  const response = await fetchWithProxy(apiUrl);

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();

  if (data.chart?.result?.[0]) {
    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];

    const currentPrice =
      meta.regularMarketPrice || quote?.close?.[quote.close.length - 1];
    const previousClose = meta.previousClose || meta.chartPreviousClose;

    if (!currentPrice || !previousClose) {
      throw new Error("Missing price data");
    }

    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      symbol: fullSymbol,
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      previousClose: parseFloat(previousClose.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      currency: meta.currency || "INR",
      marketState: meta.marketState || "CLOSED",
      lastUpdated: new Date().toISOString(),
    };
  }

  throw new Error("No chart data in v8 response");
}

/**
 * Method 3: Yahoo Finance v7 Quote API (fallback)
 * Simple quote data, good reliability
 */
async function fetchStockPriceV7Quote(fullSymbol) {
  const apiUrl = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${fullSymbol}`;

  const response = await fetchWithProxy(apiUrl);

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();

  if (data.quoteResponse?.result?.[0]) {
    const quote = data.quoteResponse.result[0];
    const currentPrice = quote.regularMarketPrice;
    const previousClose = quote.regularMarketPreviousClose;

    if (!currentPrice || !previousClose) {
      throw new Error("Missing price data");
    }

    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      symbol: fullSymbol,
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      previousClose: parseFloat(previousClose.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      currency: quote.currency || "INR",
      marketState: quote.marketState || "CLOSED",
      lastUpdated: new Date().toISOString(),
    };
  }

  throw new Error("No quote data in v7 response");
}

/**
 * Fetch historical stock prices for charts
 * Uses yfinance-compatible endpoints
 * @param {string} symbol - Stock symbol (e.g., RELIANCE.NS)
 * @param {string} range - Time range: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max
 * @param {string} interval - Data interval: 1m, 5m, 15m, 1d, 1wk, 1mo
 */
export async function fetchStockHistory(
  symbol,
  range = "1mo",
  interval = "1d"
) {
  try {
    let fullSymbol = symbol;
    if (!symbol.includes(".NS") && !symbol.includes(".BO")) {
      fullSymbol = `${symbol}.NS`;
    }

    console.log(`📈 Fetching ${range} history for ${fullSymbol}...`);

    // Use Yahoo Finance Chart API (same as yfinance uses)
    const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${fullSymbol}?interval=${interval}&range=${range}`;

    const response = await fetchWithProxy(apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.chart?.result?.[0]) {
      const result = data.chart.result[0];
      const timestamps = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0];

      if (!quotes || timestamps.length === 0) {
        throw new Error("No historical data available");
      }

      const history = timestamps
        .map((timestamp, index) => ({
          date: new Date(timestamp * 1000).toISOString().split("T")[0],
          price: quotes.close?.[index] || null,
          open: quotes.open?.[index] || null,
          high: quotes.high?.[index] || null,
          low: quotes.low?.[index] || null,
          volume: quotes.volume?.[index] || null,
        }))
        .filter((item) => item.price !== null); // Remove null entries

      console.log(`✅ Fetched ${history.length} data points`);
      return history;
    }

    throw new Error("Invalid response structure");
  } catch (error) {
    console.error(`❌ Error fetching stock history for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Search for AMFI scheme code by mutual fund name
 * Uses MFAPI.in public API (no authentication required)
 */
export async function searchAMFICode(schemeName) {
  try {
    console.log(`🔍 Searching AMFI code for: ${schemeName}`);

    // MFAPI.in provides a complete list of all mutual funds
    const response = await fetch("https://api.mfapi.in/mf", {
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const allSchemes = await response.json();

    if (!Array.isArray(allSchemes) || allSchemes.length === 0) {
      throw new Error("Invalid API response");
    }

    // Normalize search term: lowercase, remove special chars
    const normalizeText = (text) => {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    const searchNormalized = normalizeText(schemeName);
    const searchWords = searchNormalized.split(" ").filter((w) => w.length > 2);

    // Find exact match first
    let bestMatch = allSchemes.find(
      (scheme) => normalizeText(scheme.schemeName) === searchNormalized
    );

    // If no exact match, find best partial match
    if (!bestMatch && searchWords.length > 0) {
      const matches = allSchemes
        .map((scheme) => {
          const schemeNormalized = normalizeText(scheme.schemeName);

          // Count matching words
          const matchCount = searchWords.filter((word) =>
            schemeNormalized.includes(word)
          ).length;

          return {
            scheme,
            matchCount,
            // Prioritize schemes with more matching words
            score: matchCount / searchWords.length,
          };
        })
        .filter((m) => m.matchCount >= Math.min(3, searchWords.length - 1)) // At least 3 words or all-1
        .sort((a, b) => b.score - a.score);

      if (matches.length > 0) {
        bestMatch = matches[0].scheme;
        console.log(
          `✅ Found AMFI code: ${bestMatch.schemeCode} for "${
            bestMatch.schemeName
          }" (${Math.round(matches[0].score * 100)}% match)`
        );
      }
    } else if (bestMatch) {
      console.log(
        `✅ Found exact AMFI match: ${bestMatch.schemeCode} for "${bestMatch.schemeName}"`
      );
    }

    if (bestMatch) {
      return bestMatch.schemeCode;
    }

    console.warn(`⚠️ No AMFI code found for: "${schemeName}"`);
    return null;
  } catch (error) {
    console.error(`❌ Error searching AMFI code:`, error.message);
    return null;
  }
}

/**
 * Fetch Mutual Fund NAV with retry and fallback
 * Uses free MFAPI.in service (no API key required)
 */
export async function fetchMutualFundNAV(schemeCode) {
  try {
    console.log(`🔍 Fetching NAV for mutual fund: ${schemeCode}`);

    const url = `${PORTFOLIO_CONFIG.MUTUAL_FUND_API_BASE}/${schemeCode}`;

    // Try with 10-second timeout and retry
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Attempt ${attempt}/3 for MF ${schemeCode}...`);

        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();

        if (data.status === "SUCCESS" && data.data && data.data.length > 0) {
          const latestNav = data.data[0];
          const previousNav = data.data[1];

          const currentPrice = parseFloat(latestNav.nav);
          const prevPrice = previousNav
            ? parseFloat(previousNav.nav)
            : currentPrice;

          const change = currentPrice - prevPrice;
          const changePercent =
            prevPrice > 0 ? ((change / prevPrice) * 100).toFixed(2) : "0.00";

          console.log(
            `✅ Got MF NAV: ${data.meta.scheme_name} = ₹${currentPrice}`
          );

          return {
            symbol: schemeCode,
            name: data.meta.scheme_name,
            currentPrice: currentPrice,
            previousClose: prevPrice,
            changePercent: `${changePercent}%`,
            change: change.toFixed(2),
            date: latestNav.date,
            lastUpdated: new Date().toISOString(),
          };
        }

        throw new Error("Invalid response format from MFAPI");
      } catch (error) {
        lastError = error;
        console.warn(`MF fetch attempt ${attempt} failed:`, error.message);

        if (attempt < 3) {
          // Wait 1 second before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError || new Error("All retry attempts failed");
  } catch (error) {
    console.error(`❌ Error fetching MF NAV for ${schemeCode}:`, error);
    throw new Error(`Failed to fetch mutual fund data: ${error.message}`);
  }
}

/**
 * Fetch Mutual Fund history for charts
 */
export async function fetchMutualFundHistory(schemeCode, days = 30) {
  try {
    const url = `${PORTFOLIO_CONFIG.MUTUAL_FUND_API_BASE}/${schemeCode}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "SUCCESS" && data.data) {
      // Get last N days of data
      const history = data.data
        .slice(0, days)
        .reverse()
        .map((item) => ({
          date: item.date,
          price: parseFloat(item.nav),
        }));

      return history;
    }

    throw new Error("Invalid mutual fund code");
  } catch (error) {
    console.error(`Error fetching MF history for ${schemeCode}:`, error);
    throw error;
  }
}

/**
 * Search for mutual funds by name or code
 */
export async function searchMutualFunds(query) {
  try {
    // This is a mock implementation - in production, use a proper search API
    // For now, return popular mutual funds
    const popularFunds = [
      {
        code: "120503",
        name: "SBI Blue Chip Fund - Direct Plan - Growth",
        category: "Equity",
      },
      {
        code: "118989",
        name: "ICICI Prudential Bluechip Fund - Direct Plan - Growth",
        category: "Equity",
      },
      {
        code: "119551",
        name: "Axis Bluechip Fund - Direct Plan - Growth",
        category: "Equity",
      },
      {
        code: "120716",
        name: "Mirae Asset Large Cap Fund - Direct - Growth",
        category: "Equity",
      },
      {
        code: "119062",
        name: "HDFC Index Fund - Nifty 50 Plan - Direct Plan - Growth",
        category: "Index",
      },
      {
        code: "120828",
        name: "Parag Parikh Flexi Cap Fund - Direct - Growth",
        category: "Flexi Cap",
      },
      {
        code: "118556",
        name: "Kotak Emerging Equity Scheme - Direct Plan - Growth",
        category: "Mid Cap",
      },
      {
        code: "119550",
        name: "Axis Midcap Fund - Direct Plan - Growth",
        category: "Mid Cap",
      },
      {
        code: "125497",
        name: "Nippon India Small Cap Fund - Direct Plan - Growth",
        category: "Small Cap",
      },
      {
        code: "118825",
        name: "HDFC Small Cap Fund - Direct Plan - Growth",
        category: "Small Cap",
      },
    ];

    if (!query) return popularFunds;

    return popularFunds.filter(
      (fund) =>
        fund.name.toLowerCase().includes(query.toLowerCase()) ||
        fund.code.includes(query)
    );
  } catch (error) {
    console.error("Error searching mutual funds:", error);
    return [];
  }
}

/**
 * Export portfolio to CSV
 */
export function exportPortfolioToCSV(holdings) {
  const headers = PORTFOLIO_CONFIG.CSV_HEADERS;
  const csvRows = [headers.join(",")];

  holdings.forEach((holding) => {
    const row = [
      holding.asset_type,
      holding.symbol,
      `"${holding.name}"`, // Quoted in case of commas
      holding.quantity,
      holding.purchase_price,
      holding.purchase_date,
      holding.sector || "",
      holding.exchange || "",
    ];
    csvRows.push(row.join(","));
  });

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `portfolio_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Parse CSV/XLSX file and import holdings
 * Supports both .csv and .xlsx/.xls formats
 * Auto-detects format: Stock format or Mutual Fund format
 */
export async function importPortfolioFromCSV(file) {
  return new Promise((resolve, reject) => {
    const fileExtension = file.name.split(".").pop().toLowerCase();

    // Handle XLSX/XLS files
    if (fileExtension === "xlsx" || fileExtension === "xls") {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

          // Read as array of arrays to handle header rows properly
          const rawData = XLSX.utils.sheet_to_json(firstSheet, {
            header: 1,
            defval: "",
          });

          console.log(
            "📊 Excel Raw Data Preview (first 10 rows):",
            rawData.slice(0, 10)
          );
          console.log("📋 Total rows in sheet:", rawData.length);

          // Find the actual header row
          let headerRowIndex = -1;
          let headers = [];

          for (let i = 0; i < Math.min(rawData.length, 20); i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;

            const rowStr = row.join("|").toLowerCase();

            // Look for stock or mutual fund headers
            if (
              rowStr.includes("stock name") ||
              rowStr.includes("scheme name")
            ) {
              headerRowIndex = i;
              headers = row.map((h) => String(h || "").trim()).filter((h) => h);
              console.log(
                "✅ Found header row at index",
                i,
                "Headers:",
                headers
              );
              break;
            }
          }

          if (headerRowIndex === -1) {
            console.error("❌ Could not find header row");
            reject(
              new Error(
                'Could not find "Stock name" or "Scheme Name" headers in Excel file'
              )
            );
            return;
          }

          // Convert data rows to objects
          const jsonData = [];
          for (let i = headerRowIndex + 1; i < rawData.length; i++) {
            const row = rawData[i];

            // Skip empty rows
            if (
              !row ||
              row.every((cell) => !cell || String(cell).trim() === "")
            ) {
              continue;
            }

            const rowObj = {};
            headers.forEach((header, colIndex) => {
              if (header && row[colIndex] !== undefined) {
                rowObj[header] = row[colIndex];
              }
            });

            // Only add rows that have some data
            if (Object.keys(rowObj).length > 0) {
              jsonData.push(rowObj);
            }
          }

          console.log("� Extracted data rows:", jsonData.length);
          if (jsonData.length > 0) {
            console.log("📌 Sample data:", jsonData[0]);
          }

          const holdings = [];

          // Detect format by checking header names
          if (jsonData.length === 0) {
            reject(new Error("No data found after header row"));
            return;
          }

          console.log("📌 Column Headers:", headers);

          // Check if it's Stock format or Mutual Fund format
          const isStockFormat = headers.some(
            (h) =>
              h.toLowerCase().includes("stock name") ||
              h.toLowerCase().includes("isin") ||
              h.toLowerCase().includes("execution date")
          );

          const isMutualFundFormat = headers.some(
            (h) =>
              h.toLowerCase().includes("scheme name") ||
              h.toLowerCase().includes("nav") ||
              h.toLowerCase().includes("units")
          );

          console.log("🔍 Format Detection:", {
            isStockFormat,
            isMutualFundFormat,
          });

          let processedCount = 0;
          let skippedCount = 0;

          // Process STOCKS: top-to-bottom (normal order)
          // Process MUTUAL FUNDS: bottom-to-top (reverse order)
          const dataToProcess = isMutualFundFormat
            ? [...jsonData].reverse()
            : jsonData;

          if (isStockFormat) {
            console.log(
              "📈 Processing STOCKS from top to bottom (chronological order)..."
            );
          } else if (isMutualFundFormat) {
            console.log("� Processing MUTUAL FUNDS from bottom to top...");
          }

          dataToProcess.forEach((row, index) => {
            if (isStockFormat) {
              // Stock format: Stock name | Symbol | ISIN | Type | Quantity | Value | Exchange | Exchange Order Id | Execution date and time | Order status
              const stockName = row["Stock name"] || row["stock name"] || "";
              const symbol = row["Symbol"] || row["symbol"] || "";
              const type = (row["Type"] || row["type"] || "")
                .toString()
                .toUpperCase();
              const quantity = parseFloat(
                row["Quantity"] || row["quantity"] || 0
              );
              const value = parseFloat(row["Value"] || row["value"] || 0);
              const exchange = row["Exchange"] || row["exchange"] || "NSE";
              const executionDate =
                row["Execution date and time"] ||
                row["execution date and time"] ||
                new Date().toISOString().split("T")[0];
              const orderStatus = (
                row["Order status"] ||
                row["order status"] ||
                ""
              ).toLowerCase();

              // Log first few rows
              if (index < 3) {
                console.log(`📝 Stock Row ${index + 1}:`, {
                  stockName,
                  symbol,
                  type,
                  quantity,
                  value,
                  orderStatus,
                });
              }

              // Only process executed orders
              if (!orderStatus.includes("executed")) {
                skippedCount++;
                return;
              }

              // Calculate purchase price from value and quantity
              const price = quantity > 0 ? value / quantity : 0;

              // Extract date from execution date time (format: DD-MMM-YYYY HH:MM:SS or "18-03-2025 11:43 AM")
              let purchaseDate = new Date().toISOString().split("T")[0];
              if (executionDate) {
                try {
                  const dateStr = executionDate.toString();
                  const dateMatch = dateStr.match(/(\d{1,2})-(\d{2})-(\d{4})/);
                  if (dateMatch) {
                    const [, day, month, year] = dateMatch;
                    purchaseDate = `${year}-${month}-${day.padStart(2, "0")}`;
                  } else {
                    const dateMatch2 = dateStr.match(
                      /(\d{1,2})-(\w{3})-(\d{4})/
                    );
                    if (dateMatch2) {
                      const [, day, month, year] = dateMatch2;
                      const monthMap = {
                        Jan: "01",
                        Feb: "02",
                        Mar: "03",
                        Apr: "04",
                        May: "05",
                        Jun: "06",
                        Jul: "07",
                        Aug: "08",
                        Sep: "09",
                        Oct: "10",
                        Nov: "11",
                        Dec: "12",
                      };
                      purchaseDate = `${year}-${monthMap[month]}-${day.padStart(
                        2,
                        "0"
                      )}`;
                    } else {
                      const parsed = new Date(executionDate);
                      if (!isNaN(parsed)) {
                        purchaseDate = parsed.toISOString().split("T")[0];
                      }
                    }
                  }
                } catch (err) {
                  console.warn("Date parsing failed, using current date");
                }
              }

              // Force NSE exchange for all stocks (treat all as NSE)
              let fullSymbol = symbol;
              if (symbol && !symbol.includes(".NS")) {
                // Remove .BO if present and always add .NS
                fullSymbol =
                  symbol.replace(".BO", "").replace(".NS", "") + ".NS";
                console.log(
                  `🔄 Converting ${symbol} → ${fullSymbol} (Force NSE)`
                );
              }

              if (stockName && fullSymbol && quantity > 0 && price > 0) {
                processedCount++;
                // Find if we already have this stock
                const existingIndex = holdings.findIndex(
                  (h) => h.symbol === fullSymbol
                );

                if (type === "BUY") {
                  if (existingIndex >= 0) {
                    // Update existing holding - weighted average price
                    const existing = holdings[existingIndex];
                    const totalQty = existing.quantity + quantity;
                    const totalValue =
                      existing.quantity * existing.purchase_price +
                      quantity * price;
                    existing.quantity = totalQty;
                    existing.purchase_price = totalValue / totalQty;
                    if (index < 3)
                      console.log(
                        `✅ Updated ${fullSymbol}: ${totalQty} units`
                      );
                  } else {
                    // Add new holding
                    holdings.push({
                      asset_type: "stock",
                      symbol: fullSymbol,
                      name: stockName,
                      quantity: quantity,
                      purchase_price: price,
                      purchase_date: purchaseDate,
                      sector: null,
                      exchange: "NSE", // Always NSE
                    });
                    if (index < 3)
                      console.log(`✅ Added ${fullSymbol}: ${quantity} units`);
                  }
                } else if (type === "SELL") {
                  if (existingIndex >= 0) {
                    // Reduce quantity
                    holdings[existingIndex].quantity -= quantity;
                    if (index < 3)
                      console.log(
                        `📉 Sold ${fullSymbol}: -${quantity} units, remaining: ${holdings[existingIndex].quantity}`
                      );
                    // Remove if quantity becomes zero or negative
                    if (holdings[existingIndex].quantity <= 0) {
                      holdings.splice(existingIndex, 1);
                      if (index < 3)
                        console.log(`🗑️ Removed ${fullSymbol} (zero holdings)`);
                    }
                  }
                }
              } else {
                skippedCount++;
              }
            } else if (isMutualFundFormat) {
              // Mutual Fund format: Scheme Name | Transaction Type | Units | NAV | Amount | Date
              const schemeName = row["Scheme Name"] || row["scheme name"] || "";
              const units = parseFloat(row["Units"] || row["units"] || 0);
              const nav = parseFloat(row["NAV"] || row["nav"] || 0);
              const amount = parseFloat(
                (row["Amount"] || row["amount"] || "0")
                  .toString()
                  .replace(/,/g, "")
              );
              const date =
                row["Date"] ||
                row["date"] ||
                new Date().toISOString().split("T")[0];
              const transactionType = (
                row["Transaction Type"] ||
                row["transaction type"] ||
                ""
              )
                .toString()
                .toUpperCase();

              // Parse date (format: "11 Aug 2025" or "DD MMM YYYY")
              let purchaseDate = new Date().toISOString().split("T")[0];
              if (date) {
                try {
                  const dateStr = date.toString();
                  const dateMatch = dateStr.match(
                    /(\d{1,2})\s+(\w{3})\s+(\d{4})/
                  );
                  if (dateMatch) {
                    const [, day, month, year] = dateMatch;
                    const monthMap = {
                      Jan: "01",
                      Feb: "02",
                      Mar: "03",
                      Apr: "04",
                      May: "05",
                      Jun: "06",
                      Jul: "07",
                      Aug: "08",
                      Sep: "09",
                      Oct: "10",
                      Nov: "11",
                      Dec: "12",
                    };
                    purchaseDate = `${year}-${monthMap[month]}-${day.padStart(
                      2,
                      "0"
                    )}`;
                  } else {
                    const dateMatch2 = dateStr.match(
                      /(\d{1,2})-(\w{3})-(\d{4})/
                    );
                    if (dateMatch2) {
                      const [, day, month, year] = dateMatch2;
                      const monthMap = {
                        Jan: "01",
                        Feb: "02",
                        Mar: "03",
                        Apr: "04",
                        May: "05",
                        Jun: "06",
                        Jul: "07",
                        Aug: "08",
                        Sep: "09",
                        Oct: "10",
                        Nov: "11",
                        Dec: "12",
                      };
                      purchaseDate = `${year}-${monthMap[month]}-${day.padStart(
                        2,
                        "0"
                      )}`;
                    } else {
                      const parsed = new Date(date);
                      if (!isNaN(parsed)) {
                        purchaseDate = parsed.toISOString().split("T")[0];
                      }
                    }
                  }
                } catch (err) {
                  console.warn("Date parsing failed, using current date");
                }
              }

              if (schemeName && units > 0 && nav > 0) {
                processedCount++;

                // Extract scheme code from name if in parentheses: "Groww Nifty Total Market Index Fund (123456)"
                let schemeCode = String(schemeName || "").match(
                  /\((\d+)\)/
                )?.[1];

                // Clean scheme name (remove code if present)
                let cleanSchemeName = schemeName
                  .replace(/\s*\(\d+\)\s*$/, "")
                  .trim();

                // Log first few rows
                if (index < 3) {
                  console.log(
                    `📝 MF Row ${dataToProcess.length - index} (from bottom):`,
                    {
                      schemeName,
                      schemeCode,
                      cleanSchemeName,
                      units,
                      nav,
                      transactionType,
                    }
                  );
                }

                // Find if we already have this mutual fund (match by name)
                const existingIndex = holdings.findIndex(
                  (h) => h.name === cleanSchemeName
                );

                if (
                  transactionType.includes("PURCHASE") ||
                  transactionType.includes("BUY")
                ) {
                  if (existingIndex >= 0) {
                    // Update existing holding - weighted average NAV
                    const existing = holdings[existingIndex];
                    const totalUnits = existing.quantity + units;
                    const totalValue =
                      existing.quantity * existing.purchase_price + units * nav;
                    existing.quantity = totalUnits;
                    existing.purchase_price = totalValue / totalUnits;
                    existing._latest_nav = nav; // Temp field for Excel NAV (not saved to DB)
                    if (index < 3)
                      console.log(
                        `✅ Updated ${cleanSchemeName}: ${totalUnits} units @ NAV ₹${nav}`
                      );
                  } else {
                    // Add new holding - store scheme code if available, otherwise store name for later lookup
                    holdings.push({
                      asset_type: "mutual_fund",
                      symbol: schemeCode || cleanSchemeName, // Use code if available, otherwise full name
                      name: cleanSchemeName,
                      quantity: units,
                      purchase_price: nav,
                      _latest_nav: nav, // Temp field for Excel NAV (not saved to DB)
                      purchase_date: purchaseDate,
                      sector: null,
                      exchange: null,
                    });
                    if (index < 3)
                      console.log(
                        `✅ Added ${cleanSchemeName}: ${units} units @ NAV ₹${nav}, code: ${
                          schemeCode || "PENDING_LOOKUP"
                        }`
                      );
                  }
                } else if (
                  transactionType.includes("REDEEM") ||
                  transactionType.includes("SELL")
                ) {
                  if (existingIndex >= 0) {
                    // Reduce units
                    holdings[existingIndex].quantity -= units;
                    if (index < 3)
                      console.log(
                        `📉 Redeemed ${cleanSchemeName}: -${units} units, remaining: ${holdings[existingIndex].quantity}`
                      );
                    // Remove if units become zero or negative
                    if (holdings[existingIndex].quantity <= 0.01) {
                      holdings.splice(existingIndex, 1);
                      if (index < 3)
                        console.log(
                          `🗑️ Removed ${cleanSchemeName} (zero holdings)`
                        );
                    }
                  }
                }
              } else {
                skippedCount++;
              }
            } else {
              // Generic CSV format fallback
              const holding = {
                asset_type: row["asset_type"] || row["Asset Type"] || "stock",
                symbol: row["symbol"] || row["Symbol"] || "",
                name: row["name"] || row["Name"] || "",
                quantity: parseFloat(row["quantity"] || row["Quantity"] || 0),
                purchase_price: parseFloat(
                  row["purchase_price"] || row["Purchase Price"] || 0
                ),
                purchase_date:
                  row["purchase_date"] ||
                  row["Purchase Date"] ||
                  new Date().toISOString().split("T")[0],
                sector: row["sector"] || row["Sector"] || null,
                exchange: row["exchange"] || row["Exchange"] || null,
              };

              if (
                holding.symbol &&
                holding.quantity > 0 &&
                holding.purchase_price > 0
              ) {
                holdings.push(holding);
              }
            }
          });

          console.log(`📊 Processing Summary:`);
          console.log(`   Total rows processed: ${jsonData.length}`);
          console.log(`   Transactions processed: ${processedCount}`);
          console.log(`   Transactions skipped: ${skippedCount}`);
          console.log(`   Raw holdings count: ${holdings.length}`);

          // Final filter: Remove any holdings with zero or negative quantity
          const validHoldings = holdings.filter((h) => h.quantity > 0);

          console.log(
            `   Final holdings count (after filtering zero quantity): ${validHoldings.length}`
          );

          if (validHoldings.length === 0) {
            console.error("❌ No valid holdings found. This could be because:");
            console.error("1. All stocks were bought and sold (net zero)");
            console.error("2. Date format or data parsing failed");
            console.error("3. Sheet might have header rows before data");
            reject(
              new Error(
                "No valid holdings found in Excel file. All stocks may have been sold (net zero holdings)."
              )
            );
            return;
          }

          console.log("✅ Successfully parsed holdings:", validHoldings);
          console.log(`📦 Total holdings to import: ${validHoldings.length}`);

          // Auto-fetch AMFI codes for mutual funds without scheme codes
          const mfWithoutCodes = validHoldings.filter(
            (h) =>
              h.asset_type === "mutual_fund" &&
              !String(h.symbol || "").match(/^\d{6}$/)
          );

          if (mfWithoutCodes.length > 0) {
            console.log(
              `🔎 Auto-fetching AMFI codes for ${mfWithoutCodes.length} mutual funds...`
            );

            for (const mf of mfWithoutCodes) {
              try {
                const amfiCode = await searchAMFICode(mf.name);
                if (amfiCode) {
                  mf.symbol = amfiCode;
                  console.log(`✅ ${mf.name} → AMFI: ${amfiCode}`);
                } else {
                  console.warn(`⚠️ Could not find AMFI code for: ${mf.name}`);
                }

                // Small delay to avoid rate limiting
                await new Promise((resolve) => setTimeout(resolve, 500));
              } catch (error) {
                console.error(
                  `❌ Error fetching AMFI code for ${mf.name}:`,
                  error
                );
              }
            }

            console.log("✅ AMFI code lookup complete");
          }

          resolve(validHoldings);
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error.message}`));
        }
      };

      reader.onerror = () => reject(new Error("Failed to read Excel file"));
      reader.readAsArrayBuffer(file);
    }
    // Handle CSV files
    else {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split("\n");
          const headers = lines[0].split(",");
          const holdings = [];

          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = lines[i].split(",");
            const holding = {
              asset_type: values[0]?.trim(),
              symbol: values[1]?.trim(),
              name: values[2]?.replace(/"/g, "").trim(),
              quantity: parseFloat(values[3]),
              purchase_price: parseFloat(values[4]),
              purchase_date: values[5]?.trim(),
              sector: values[6]?.trim() || null,
              exchange: values[7]?.trim() || null,
            };

            // Validate required fields
            if (
              holding.asset_type &&
              holding.symbol &&
              holding.quantity &&
              holding.purchase_price
            ) {
              holdings.push(holding);
            }
          }

          resolve(holdings);
        } catch (error) {
          reject(new Error("Failed to parse CSV file"));
        }
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    }
  });
}

/**
 * Calculate portfolio statistics
 */
export function calculatePortfolioStats(holdings, prices) {
  let totalInvested = 0;
  let totalCurrent = 0;
  const sectorAllocation = {};

  holdings.forEach((holding) => {
    const invested = holding.quantity * holding.purchase_price;
    totalInvested += invested;

    const priceData = prices[holding.symbol];
    if (priceData) {
      const currentValue = holding.quantity * priceData.currentPrice;
      totalCurrent += currentValue;

      // Sector allocation
      const sector = holding.sector || "Others";
      if (!sectorAllocation[sector]) {
        sectorAllocation[sector] = 0;
      }
      sectorAllocation[sector] += currentValue;
    }
  });

  const gainLoss = totalCurrent - totalInvested;
  const gainLossPercent =
    totalInvested > 0 ? ((gainLoss / totalInvested) * 100).toFixed(2) : 0;

  return {
    totalInvested,
    totalCurrent,
    gainLoss,
    gainLossPercent,
    sectorAllocation,
  };
}

/**
 * Method 4: NSE India Direct API (CORS-free fallback)
 * Official NSE API for Indian stocks - works without proxy
 */
async function fetchFromNSEDirect(baseSymbol) {
  try {
    // NSE API requires exact symbol format
    const nseUrl = `https://www.nseindia.com/api/quote-equity?symbol=${baseSymbol}`;

    const response = await fetch(nseUrl, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`NSE API returned ${response.status}`);
    }

    const data = await response.json();

    if (data && data.priceInfo) {
      const currentPrice = parseFloat(data.priceInfo.lastPrice);
      const previousClose = parseFloat(
        data.priceInfo.previousClose || data.priceInfo.close
      );
      const change = currentPrice - previousClose;
      const changePercent =
        previousClose > 0
          ? ((change / previousClose) * 100).toFixed(2)
          : "0.00";

      return {
        currentPrice,
        previousClose,
        changePercent: `${changePercent}%`,
        lastUpdated: new Date().toISOString(),
      };
    }

    throw new Error("Invalid NSE response format");
  } catch (error) {
    throw new Error(`NSE Direct API failed: ${error.message}`);
  }
}
