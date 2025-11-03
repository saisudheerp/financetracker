import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import { useToast } from "../context/ToastContext";
import Navbar from "../components/Navbar";
import AddHoldingModal from "../components/AddHoldingModal";
import PortfolioCharts from "../components/PortfolioCharts";
import {
  fetchStockPrice,
  fetchMutualFundNAV,
  exportPortfolioToCSV,
  importPortfolioFromCSV,
  calculatePortfolioStats,
} from "../utils/portfolioService";
import { formatINR } from "../utils/currencyUtils";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  Download,
  Upload,
  Bell,
  Trash2,
  Edit,
  X,
  PieChart,
  BarChart3,
  LineChart,
  AlertCircle,
} from "lucide-react";

const Portfolio = ({ onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [holdings, setHoldings] = useState([]);
  const [prices, setPrices] = useState({});
  const [stats, setStats] = useState({
    totalInvested: 0,
    totalCurrent: 0,
    gainLoss: 0,
    gainLossPercent: 0,
    sectorAllocation: {},
  });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    if (user) {
      fetchHoldings();
      fetchAlerts();
    }
  }, [user]);

  useEffect(() => {
    if (holdings.length > 0) {
      fetchAllPrices();
    }
  }, [holdings]);

  useEffect(() => {
    if (Object.keys(prices).length > 0 && holdings.length > 0) {
      const newStats = calculatePortfolioStats(holdings, prices);
      setStats(newStats);
    }
  }, [prices, holdings]);

  // Daily 3:30 PM auto-refresh scheduler (market close)
  useEffect(() => {
    if (!user || holdings.length === 0) return;

    const scheduleDailyRefresh = () => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
      const istTime = new Date(now.getTime() + istOffset);

      // Target: 3:30 PM IST (market close)
      const targetTime = new Date(istTime);
      targetTime.setHours(15, 30, 0, 0);

      // If it's already past 3:30 PM today, schedule for tomorrow
      if (istTime >= targetTime) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      const timeUntilRefresh = targetTime.getTime() - istTime.getTime();

      console.log(
        `⏰ Next auto-refresh scheduled for: ${targetTime.toLocaleString(
          "en-IN",
          { timeZone: "Asia/Kolkata" }
        )}`
      );

      const timerId = setTimeout(async () => {
        console.log("🔔 Daily 3:30 PM auto-refresh triggered!");

        // First refresh
        console.log("🔄 Auto-refresh #1...");
        await fetchAllPrices(true);

        // Wait 3 seconds, then second refresh
        await new Promise((resolve) => setTimeout(resolve, 3000));
        console.log("🔄 Auto-refresh #2...");
        await fetchAllPrices(true);

        console.log("✅ Daily auto-refresh complete (2x)");

        scheduleDailyRefresh(); // Schedule next day
      }, timeUntilRefresh);

      return timerId;
    };

    const timerId = scheduleDailyRefresh();

    return () => clearTimeout(timerId);
  }, [user, holdings]);

  const fetchHoldings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("portfolio_holdings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHoldings(data || []);

      // Load cached prices immediately after loading holdings
      await loadCachedPrices(data || []);
    } catch (error) {
      console.error("Error fetching holdings:", error);
      showToast("Failed to load portfolio", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadCachedPrices = async (holdingsList) => {
    try {
      console.log("📦 Loading cached prices from database...");
      const symbols = holdingsList.map((h) => h.symbol);
      console.log("🔍 Looking for symbols:", symbols);

      const { data: cachedPrices, error } = await supabase
        .from("portfolio_prices")
        .select("*")
        .in("symbol", symbols);

      if (error) throw error;

      console.log("📊 Found cached prices in database:", cachedPrices);

      if (cachedPrices && cachedPrices.length > 0) {
        const pricesData = {};
        cachedPrices.forEach((cache) => {
          pricesData[cache.symbol] = {
            currentPrice: cache.current_price,
            previousClose: cache.previous_close,
            changePercent: cache.change_percent,
            lastUpdated: cache.last_updated,
            isCached: true, // Flag to indicate this is cached data
          };
        });
        setPrices(pricesData);
        console.log(
          `✅ Loaded ${cachedPrices.length} cached prices from database`
        );
        console.log("💾 Prices state updated:", pricesData);

        // Show when the prices were last updated
        if (cachedPrices.length > 0 && cachedPrices[0].last_updated) {
          const lastUpdate = new Date(cachedPrices[0].last_updated);
          const now = new Date();
          const hoursSinceUpdate = Math.floor(
            (now - lastUpdate) / (1000 * 60 * 60)
          );
          console.log(`📊 Prices last updated: ${hoursSinceUpdate} hours ago`);
        }
      } else {
        console.log(
          "ℹ️ No cached prices found in database for symbols:",
          symbols
        );
      }
    } catch (error) {
      console.error("Error loading cached prices:", error);
    }
  };

  const fetchAllPrices = async (forceFetch = false) => {
    try {
      setRefreshing(true);

      // Check if market is open (9:15 AM to 3:30 PM IST) - but allow override
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
      const istTime = new Date(now.getTime() + istOffset);
      const hours = istTime.getUTCHours();
      const minutes = istTime.getUTCMinutes();
      const currentTimeInMinutes = hours * 60 + minutes;

      const marketOpenTime = 9 * 60 + 15; // 9:15 AM
      const marketCloseTime = 15 * 60 + 30; // 3:30 PM
      const isMarketOpen =
        currentTimeInMinutes >= marketOpenTime &&
        currentTimeInMinutes <= marketCloseTime;

      // Get day of week (0 = Sunday, 6 = Saturday)
      const dayOfWeek = istTime.getUTCDay();
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday

      console.log(
        `🕐 Market Status: ${
          isMarketOpen && isWeekday ? "OPEN" : "CLOSED"
        } (IST: ${hours}:${minutes.toString().padStart(2, "0")})`
      );

      // If market is closed and not forced, don't fetch stock prices
      if (!forceFetch && (!isMarketOpen || !isWeekday)) {
        console.log("⏸️ Market is closed. Using cached prices from database.");

        // Silently use cached prices - no toast notification
        setRefreshing(false);
        return;
      }

      if (forceFetch) {
        console.log(
          "🔄 Force fetch enabled - fetching prices regardless of market hours"
        );
      }

      console.log("🔄 Fetching prices for", holdings.length, "holdings...");
      const pricesData = { ...prices }; // Keep existing prices - CRITICAL for persistence
      let successCount = 0;
      let failCount = 0;

      // Process holdings with small delays to avoid rate limiting
      for (let i = 0; i < holdings.length; i++) {
        const holding = holdings[i];

        try {
          console.log(
            `📊 Fetching price for ${holding.symbol} (${
              holding.asset_type
            })... [${i + 1}/${holdings.length}]`
          );

          let priceInfo;
          if (holding.asset_type === "stock") {
            priceInfo = await fetchStockPrice(holding.symbol);
          } else {
            priceInfo = await fetchMutualFundNAV(holding.symbol);
          }

          if (priceInfo && priceInfo.currentPrice) {
            pricesData[holding.symbol] = priceInfo;
            successCount++;
            console.log(`✅ ${holding.symbol}: ₹${priceInfo.currentPrice}`);

            // Check for price alerts (±5% change)
            const changePercent = parseFloat(priceInfo.changePercent);
            if (Math.abs(changePercent) >= 5) {
              await createAlert(holding.id, changePercent, holding.name);
            }

            // Update price cache in database
            await updatePriceCache(
              holding.symbol,
              priceInfo,
              holding.asset_type
            );
          } else {
            console.warn(`⚠️ No price data returned for ${holding.symbol}`);
            failCount++;
          }

          // Small delay between requests (except last item)
          if (i < holdings.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error) {
          failCount++;
          console.error(
            `❌ Error fetching price for ${holding.symbol}:`,
            error
          );
          // Keep old price if fetch fails - pricesData already has it from spread
        }
      }

      setPrices(pricesData); // Always update state with pricesData (includes old + new)
      console.log(
        `✅ Price fetch complete: ${successCount} successful, ${failCount} failed`
      );

      // Save portfolio snapshot to history after successful price update
      if (successCount > 0) {
        await savePortfolioSnapshot();
        // Only show toast if there were failures
        if (failCount > 0) {
          showToast(
            `Updated ${successCount} prices (${failCount} failed)`,
            "warning"
          );
        }
      } else if (failCount > 0) {
        showToast(`Failed to fetch prices`, "error");
      }
    } catch (error) {
      console.error("Error fetching prices:", error);
      showToast("Error updating prices", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const savePortfolioSnapshot = async () => {
    try {
      // Calculate current portfolio value
      let totalInvested = 0;
      let totalCurrent = 0;

      holdings.forEach((holding) => {
        const priceData = prices[holding.symbol];
        const invested = holding.quantity * holding.purchase_price;
        const current = priceData
          ? holding.quantity * priceData.currentPrice
          : invested;

        totalInvested += invested;
        totalCurrent += current;
      });

      const gainLoss = totalCurrent - totalInvested;
      const gainLossPercent =
        totalInvested > 0 ? ((gainLoss / totalInvested) * 100).toFixed(2) : 0;

      // Save to portfolio_history table
      const { error } = await supabase.from("portfolio_history").insert({
        user_id: user.id,
        total_value: totalCurrent,
        total_invested: totalInvested,
        gain_loss: gainLoss,
        gain_loss_percent: gainLossPercent,
        recorded_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error saving portfolio snapshot:", error);
      } else {
        console.log(`📸 Portfolio snapshot saved: ₹${totalCurrent.toFixed(2)}`);
      }
    } catch (error) {
      console.error("Error saving portfolio snapshot:", error);
    }
  };

  const fetchPricesAfterImport = async (holdingsList) => {
    try {
      setRefreshing(true);
      console.log(
        "🆕 Fetching prices for newly imported holdings (ignoring market hours)..."
      );
      const pricesData = { ...prices }; // Keep existing prices
      let successCount = 0;
      let failCount = 0;

      // Process holdings with small delays to avoid rate limiting
      for (let i = 0; i < holdingsList.length; i++) {
        const holding = holdingsList[i];

        // Skip holdings without valid symbols
        if (!holding.symbol || String(holding.symbol).trim() === "") {
          console.warn(`⚠️ Skipping holding without symbol:`, holding);
          failCount++;
          continue;
        }

        try {
          console.log(
            `📊 Fetching price for ${holding.symbol} (${
              holding.asset_type
            })... [${i + 1}/${holdingsList.length}]`
          );

          let priceInfo;
          if (holding.asset_type === "stock") {
            priceInfo = await fetchStockPrice(holding.symbol);
          } else if (holding.asset_type === "mutual_fund") {
            console.log(
              `🔍 Calling fetchMutualFundNAV with symbol: "${
                holding.symbol
              }" (type: ${typeof holding.symbol})`
            );
            priceInfo = await fetchMutualFundNAV(holding.symbol);
          } else {
            console.warn(
              `⚠️ Unknown asset_type: ${holding.asset_type} for ${holding.symbol}`
            );
          }

          if (priceInfo && priceInfo.currentPrice) {
            pricesData[holding.symbol] = priceInfo;
            successCount++;
            console.log(`✅ ${holding.symbol}: ₹${priceInfo.currentPrice}`);

            // Update price cache in database
            await updatePriceCache(
              holding.symbol,
              priceInfo,
              holding.asset_type
            );
          } else {
            console.warn(`⚠️ No price data returned for ${holding.symbol}`);
            failCount++;
          }

          // Small delay between requests to improve proxy success rate (except last item)
          if (i < holdingsList.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
          }
        } catch (error) {
          failCount++;
          console.error(
            `❌ Error fetching price for ${holding.symbol}:`,
            error
          );
        }
      }

      setPrices(pricesData);
      console.log(
        `✅ Import price fetch complete: ${successCount} successful, ${failCount} failed`
      );

      // Only show notification if all failed
      if (failCount > 0 && successCount === 0) {
        showToast("Failed to fetch prices. Please try refreshing.", "error");
      }
    } catch (error) {
      console.error("Error fetching prices after import:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const updatePriceCache = async (symbol, priceInfo, assetType) => {
    try {
      console.log(
        `💾 Updating price cache: ${symbol} (${assetType}) = ₹${priceInfo.currentPrice}`
      );

      // Clean change_percent - remove % sign and convert to number
      const changePercentValue =
        typeof priceInfo.changePercent === "string"
          ? parseFloat(priceInfo.changePercent.replace("%", ""))
          : priceInfo.changePercent;

      // Check if entry exists
      const { data: existing } = await supabase
        .from("portfolio_prices")
        .select("symbol")
        .eq("symbol", symbol)
        .single();

      let result;
      if (existing) {
        // Update existing record
        result = await supabase
          .from("portfolio_prices")
          .update({
            current_price: priceInfo.currentPrice,
            previous_close: priceInfo.previousClose,
            change_percent: changePercentValue,
            last_updated: new Date().toISOString(),
          })
          .eq("symbol", symbol);
      } else {
        // Insert new record
        result = await supabase.from("portfolio_prices").insert({
          symbol,
          asset_type: assetType,
          current_price: priceInfo.currentPrice,
          previous_close: priceInfo.previousClose,
          change_percent: changePercentValue,
          last_updated: new Date().toISOString(),
        });
      }

      if (result.error) {
        console.error(`❌ Error caching price for ${symbol}:`, result.error);
        throw result.error;
      }

      console.log(`✅ Successfully cached price for ${symbol}`);
    } catch (error) {
      console.error("Error updating price cache:", error);
    }
  };

  const createAlert = async (holdingId, changePercent, holdingName) => {
    try {
      const message = `${holdingName} has changed by ${
        changePercent > 0 ? "+" : ""
      }${changePercent}% today!`;

      const { error } = await supabase.from("portfolio_alerts").insert({
        user_id: user.id,
        holding_id: holdingId,
        alert_type: "price_change",
        message,
        change_percent: changePercent,
      });

      if (error) throw error;
      fetchAlerts();
    } catch (error) {
      console.error("Error creating alert:", error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("portfolio_alerts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  const markAlertAsRead = async (alertId) => {
    try {
      const { error } = await supabase
        .from("portfolio_alerts")
        .update({ is_read: true })
        .eq("id", alertId);

      if (error) throw error;

      // Update local state - no toast notification
      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    } catch (error) {
      console.error("Error marking alert as read:", error);
      showToast("Failed to dismiss alert", "error");
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      // No "Refreshing..." toast - user can see the spinning icon

      // First refresh
      console.log("🔄 Refresh #1...");
      await fetchAllPrices(true); // Force fetch regardless of market hours

      // Wait 2 seconds, then second refresh
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log("🔄 Refresh #2...");
      await fetchAllPrices(true);

      // Recalculate stats after refresh
      if (Object.keys(prices).length > 0 && holdings.length > 0) {
        const newStats = calculatePortfolioStats(holdings, prices);
        setStats(newStats);
      }

      setRefreshing(false);
      showToast("Prices updated!", "success");
    } catch (error) {
      console.error("Error during refresh:", error);
      setRefreshing(false);
      showToast("Error refreshing prices", "error");
    }
  };

  const handleAddHolding = async (holdingData) => {
    try {
      if (editingHolding) {
        // Update existing
        const { error } = await supabase
          .from("portfolio_holdings")
          .update(holdingData)
          .eq("id", editingHolding.id);

        if (error) throw error;
        showToast("Holding updated successfully!", "success");
      } else {
        // Add new
        const { error } = await supabase
          .from("portfolio_holdings")
          .insert({ ...holdingData, user_id: user.id });

        if (error) throw error;
        showToast("Holding added successfully!", "success");
      }

      setIsModalOpen(false);
      setEditingHolding(null);
      fetchHoldings();
    } catch (error) {
      console.error("Error adding/updating holding:", error);
      showToast("Failed to save holding", "error");
    }
  };

  const handleDeleteHolding = async (id) => {
    if (!confirm("Are you sure you want to delete this holding?")) return;

    try {
      const { error } = await supabase
        .from("portfolio_holdings")
        .delete()
        .eq("id", id);

      if (error) throw error;
      // No toast - deletion is obvious from UI update
      fetchHoldings();
    } catch (error) {
      console.error("Error deleting holding:", error);
      showToast("Failed to delete holding", "error");
    }
  };

  const handleClearPortfolio = async () => {
    if (
      !confirm(
        "⚠️ DEVELOPMENT MODE: This will DELETE ALL your portfolio holdings. Are you absolutely sure?"
      )
    )
      return;

    if (!confirm("This action cannot be undone. Clear entire portfolio?"))
      return;

    try {
      const { error } = await supabase
        .from("portfolio_holdings")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      showToast("Portfolio cleared successfully", "success");
      setHoldings([]);
      setPrices({});
      setStats({
        totalInvested: 0,
        totalCurrent: 0,
        gainLoss: 0,
        gainLossPercent: 0,
        sectorAllocation: {},
      });
    } catch (error) {
      console.error("Error clearing portfolio:", error);
      showToast("Failed to clear portfolio", "error");
    }
  };

  const handleExport = () => {
    exportPortfolioToCSV(holdings);
    showToast("Portfolio exported!", "success");
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      showToast("Processing file and fetching AMFI codes...", "info");
      const importedHoldings = await importPortfolioFromCSV(file);

      if (importedHoldings.length === 0) {
        showToast("No valid holdings found in file", "warning");
        return;
      }

      // Filter out zero or negative quantity holdings
      const validHoldings = importedHoldings.filter((h) => h.quantity > 0);

      // Normalize symbols and asset_type to avoid type errors (ensure symbol is a string)
      validHoldings.forEach((h) => {
        // Coerce symbol to string and trim
        if (h.symbol === undefined || h.symbol === null) {
          h.symbol = "";
        } else {
          h.symbol = String(h.symbol).trim();
        }

        // If symbol contains a 6-digit AMFI code inside the name, extract it
        const amfiMatch = String(h.symbol).match(/\b(\d{6})\b/);
        if (amfiMatch) {
          h.symbol = amfiMatch[1];
        }

        // Normalize asset_type (best-effort). If not present, infer from name.
        if (!h.asset_type) {
          if (h.name && /fund/i.test(h.name)) {
            h.asset_type = "mutual_fund";
          } else {
            h.asset_type = "stock";
          }
        }
      });

      if (validHoldings.length === 0) {
        showToast(
          "All stocks have been sold (zero holdings). Nothing to import.",
          "warning"
        );
        return;
      }

      // Get existing holdings to check for duplicates
      const { data: existingHoldings } = await supabase
        .from("portfolio_holdings")
        .select("symbol, name")
        .eq("user_id", user.id);

      // Normalize existing symbols to strings for accurate duplicate detection
      const existingSymbols = new Set(
        (existingHoldings || []).map((h) =>
          h && h.symbol !== undefined && h.symbol !== null
            ? String(h.symbol).trim()
            : ""
        )
      );
      const originalExistingSymbols = new Set(existingSymbols); // Keep track of originally existing symbols

      // Insert only new holdings (skip duplicates)
      let successCount = 0;
      let duplicateCount = 0;

      for (const holding of validHoldings) {
        // Check if this holding already exists
        if (existingSymbols.has(holding.symbol)) {
          duplicateCount++;
          console.log("Skipping duplicate:", holding.symbol);
          continue;
        }

        try {
          // Remove temporary fields before inserting to database
          const { _latest_nav, ...holdingData } = holding;

          const { error } = await supabase
            .from("portfolio_holdings")
            .insert({ ...holdingData, user_id: user.id });

          if (!error) {
            successCount++;
            existingSymbols.add(holding.symbol); // Track newly added symbols
          }
        } catch (err) {
          console.error("Error inserting holding:", holding, err);
        }
      }

      if (successCount > 0 || duplicateCount > 0) {
        const soldCount = importedHoldings.length - validHoldings.length;
        const mfWithAMFI = validHoldings.filter(
          (h) =>
            h.asset_type === "mutual_fund" && String(h.symbol).match(/^\d{6}$/)
        ).length;
        const mfWithoutCodes = validHoldings.filter(
          (h) =>
            h.asset_type === "mutual_fund" && !String(h.symbol).match(/^\d{6}$/)
        ).length;

        let message = "";
        if (successCount > 0)
          message += `✅ Imported ${successCount} new holdings!`;
        if (duplicateCount > 0)
          message += ` ⚠️ Skipped ${duplicateCount} duplicates.`;
        if (soldCount > 0) message += ` 📊 ${soldCount} sold stocks ignored.`;
        if (mfWithAMFI > 0) message += ` ✅ ${mfWithAMFI} MFs with AMFI codes.`;
        if (mfWithoutCodes > 0)
          message += ` ⚠️ ${mfWithoutCodes} MFs need manual AMFI code.`;

        showToast(message, successCount > 0 ? "success" : "info");

        // FIRST: Save NAV from Excel to database cache for mutual funds (before fetching holdings)
        console.log("💾 Saving NAV from Excel to database...");
        for (const h of validHoldings) {
          if (h.asset_type === "mutual_fund" && h._latest_nav) {
            try {
              console.log(
                `🔍 Attempting to save: symbol="${h.symbol}", nav=${h._latest_nav}`
              );

              // First, check if entry exists
              const { data: existing } = await supabase
                .from("portfolio_prices")
                .select("symbol")
                .eq("symbol", h.symbol)
                .single();

              let result;
              if (existing) {
                // Update existing record
                console.log(`📝 Updating existing record for ${h.symbol}`);
                result = await supabase
                  .from("portfolio_prices")
                  .update({
                    current_price: h._latest_nav,
                    previous_close: h._latest_nav,
                    change_percent: 0.0,
                    last_updated: new Date().toISOString(),
                  })
                  .eq("symbol", h.symbol);
              } else {
                // Insert new record
                console.log(`➕ Inserting new record for ${h.symbol}`);
                result = await supabase.from("portfolio_prices").insert({
                  symbol: h.symbol,
                  asset_type: "mutual_fund",
                  current_price: h._latest_nav,
                  previous_close: h._latest_nav,
                  change_percent: 0.0,
                  last_updated: new Date().toISOString(),
                });
              }

              if (result.error) {
                console.error(
                  `❌ Database error for ${h.symbol}:`,
                  result.error
                );
              } else {
                console.log(
                  `✅ Successfully saved NAV to database: ${h.symbol} = ₹${h._latest_nav}`
                );
              }
            } catch (err) {
              console.error(`❌ Exception saving NAV for ${h.symbol}:`, err);
            }
          }
        }

        // THEN: Refresh holdings (which will automatically load cached prices including the NAV we just saved)
        await fetchHoldings();

        // Fetch prices for newly imported holdings (even if market is closed)
        if (successCount > 0) {
          const newlyImportedHoldings = validHoldings.filter(
            (h) => !originalExistingSymbols.has(h.symbol)
          );
          if (newlyImportedHoldings.length > 0) {
            console.log(
              "🎯 Newly imported holdings to fetch prices for:",
              newlyImportedHoldings.map((h) => ({
                symbol: h.symbol,
                name: h.name,
                asset_type: h.asset_type,
              }))
            );
            showToast(
              "Fetching current prices for imported holdings...",
              "info"
            );
            await fetchPricesAfterImport(newlyImportedHoldings);
          }
        }
      } else {
        showToast(
          "No new holdings to import. All are duplicates or already exist.",
          "info"
        );
      }
    } catch (error) {
      console.error("Error importing file:", error);
      showToast(error.message || "Failed to import portfolio", "error");
    }

    event.target.value = "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar currentPage="portfolio" onNavigate={onNavigate} />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="font-playfair text-3xl sm:text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent dark:from-teal-400 dark:to-cyan-400 flex items-center gap-3">
              <PieChart className="w-8 h-8 sm:w-10 sm:h-10 text-teal-600 dark:text-teal-400" />
              Portfolio Tracker
            </h1>
            <p className="font-poppins text-sm text-gray-600 dark:text-gray-400 mt-1">
              Track your investments in real-time
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 transition-all transform hover:scale-105"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="font-semibold text-sm">Refresh</span>
            </button>

            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="relative bg-white dark:bg-gray-800 border-2 border-teal-200 dark:border-gray-600 text-teal-700 dark:text-gray-300 px-4 py-2 rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all transform hover:scale-105"
            >
              <Bell className="w-4 h-4" />
              {alerts.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-md">
                  {alerts.length}
                </span>
              )}
            </button>

            <button
              onClick={handleExport}
              className="bg-white dark:bg-gray-800 border-2 border-teal-200 dark:border-gray-600 text-teal-700 dark:text-gray-300 px-4 py-2 rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all transform hover:scale-105"
            >
              <Download className="w-4 h-4" />
              <span className="font-semibold text-sm">Export</span>
            </button>

            <label className="bg-white dark:bg-gray-800 border-2 border-teal-200 dark:border-gray-600 text-teal-700 dark:text-gray-300 px-4 py-2 rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer transform hover:scale-105">
              <Upload className="w-4 h-4" />
              <span className="font-semibold text-sm">Import</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImport}
                className="hidden"
              />
            </label>

            {/* Development-only Clear Portfolio button */}
            {process.env.NODE_ENV === "development" && holdings.length > 0 && (
              <button
                onClick={handleClearPortfolio}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                title="Development Only: Clear all holdings"
              >
                <Trash2 className="w-4 h-4" />
                <span className="font-semibold text-sm">Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* REST OF THE COMPONENT CONTINUES... */}

        {/* Alerts Panel */}
        {showAlerts && alerts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-playfair text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Price Alerts ({alerts.length})
              </h3>
              <button
                onClick={() => setShowAlerts(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start justify-between"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {alert.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(alert.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <button
                    onClick={() => markAlertAsRead(alert.id)}
                    className="text-gray-400 hover:text-gray-600 ml-4"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simplified Portfolio Summary - Net Investment and Profit Only */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Net Investment */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-shadow">
            <p className="text-blue-100 text-sm font-semibold mb-2 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Net Investment
            </p>
            <p className="text-4xl font-bold font-oswald">
              {formatINR(stats.totalInvested)}
            </p>
            <p className="text-blue-100 text-xs mt-2 flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-blue-200 rounded-full"></span>
              {holdings.length} Holdings
            </p>
          </div>

          {/* Total Profit/Loss */}
          <div
            className={`rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-shadow ${
              stats.gainLoss >= 0
                ? "bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700"
                : "bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700"
            }`}
          >
            <p
              className={`text-sm font-semibold mb-2 flex items-center gap-2 ${
                stats.gainLoss >= 0 ? "text-green-100" : "text-red-100"
              }`}
            >
              {stats.gainLoss >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              Total Profit/Loss
            </p>
            <p className="text-4xl font-bold font-oswald flex items-center gap-2">
              {formatINR(Math.abs(stats.gainLoss))}
            </p>
            <p
              className={`text-xs mt-2 flex items-center gap-1 ${
                stats.gainLoss >= 0 ? "text-green-100" : "text-red-100"
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  stats.gainLoss >= 0 ? "bg-green-200" : "bg-red-200"
                }`}
              ></span>
              {stats.gainLoss >= 0 ? "+" : ""}
              {stats.gainLossPercent}% Overall
            </p>
          </div>
        </div>

        {/* Charts Section */}
        {holdings.length > 0 && Object.keys(prices).length > 0 && (
          <div className="mb-6">
            <PortfolioCharts
              holdings={holdings}
              prices={prices}
              stats={stats}
            />
          </div>
        )}

        {/* Holdings Table */}
        {holdings.length > 0 ? (
          <>
            {/* Warning for mutual funds without scheme codes */}
            {holdings.some(
              (h) =>
                h.asset_type === "mutual_fund" &&
                !String(h.symbol || "").match(/^\d+$/)
            ) && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
                      Mutual Funds Need AMFI Scheme Code
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Some mutual funds were imported without proper scheme
                      codes. Click "Edit" on each mutual fund and enter the
                      6-digit AMFI code in the Symbol field to enable price
                      fetching. You can find AMFI codes on{" "}
                      <a
                        href="https://www.amfiindia.com/net-asset-value/nav-history"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-amber-900 dark:hover:text-amber-200"
                      >
                        AMFI India
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Stocks Section */}
            {holdings.filter((h) => h.asset_type === "stock").length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-6">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-playfair text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                    Stocks (
                    {holdings.filter((h) => h.asset_type === "stock").length})
                  </h3>

                  {/* Stocks Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(() => {
                      const stocks = holdings.filter(
                        (h) => h.asset_type === "stock"
                      );
                      const stocksInvested = stocks.reduce(
                        (sum, h) => sum + h.quantity * h.purchase_price,
                        0
                      );
                      const stocksCurrentValue = stocks.reduce((sum, h) => {
                        const priceData = prices[h.symbol];
                        return (
                          sum +
                          (priceData
                            ? h.quantity * priceData.currentPrice
                            : h.quantity * h.purchase_price)
                        );
                      }, 0);
                      const stocksGainLoss =
                        stocksCurrentValue - stocksInvested;
                      const stocksGainPercent =
                        stocksInvested > 0
                          ? (stocksGainLoss / stocksInvested) * 100
                          : 0;

                      return (
                        <>
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Invested
                            </p>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {formatINR(stocksInvested)}
                            </p>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Current
                            </p>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {formatINR(stocksCurrentValue)}
                            </p>
                          </div>
                          <div
                            className={`rounded-lg p-3 ${
                              stocksGainLoss >= 0
                                ? "bg-green-50 dark:bg-green-900/20"
                                : "bg-red-50 dark:bg-red-900/20"
                            }`}
                          >
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Gain/Loss
                            </p>
                            <p
                              className={`text-lg font-bold ${
                                stocksGainLoss >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {stocksGainLoss >= 0 ? "+" : ""}
                              {formatINR(stocksGainLoss)}
                            </p>
                          </div>
                          <div
                            className={`rounded-lg p-3 ${
                              stocksGainLoss >= 0
                                ? "bg-green-50 dark:bg-green-900/20"
                                : "bg-red-50 dark:bg-red-900/20"
                            }`}
                          >
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Returns
                            </p>
                            <p
                              className={`text-lg font-bold ${
                                stocksGainLoss >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {stocksGainLoss >= 0 ? "+" : ""}
                              {stocksGainPercent.toFixed(2)}%
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-blue-50 dark:bg-blue-900/20">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Stock Name
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Buy Price
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Current Price
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Invested
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Current Value
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Gain/Loss
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {holdings
                        .filter((h) => h.asset_type === "stock")
                        .map((holding) => {
                          const priceData = prices[holding.symbol];
                          const invested =
                            holding.quantity * holding.purchase_price;
                          const currentValue = priceData
                            ? holding.quantity * priceData.currentPrice
                            : invested;
                          const gainLoss = currentValue - invested;
                          const gainLossPercent =
                            invested > 0 ? (gainLoss / invested) * 100 : 0;

                          return (
                            <tr
                              key={holding.id}
                              className="hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div>
                                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                                    {holding.name}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {holding.symbol}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-100">
                                {holding.quantity}
                              </td>
                              <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-100">
                                {formatINR(holding.purchase_price)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {priceData ? (
                                  <div>
                                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                                      {formatINR(priceData.currentPrice)}
                                    </div>
                                    <div
                                      className={`text-xs ${
                                        parseFloat(priceData.changePercent) >= 0
                                          ? "text-green-600 dark:text-green-400"
                                          : "text-red-600 dark:text-red-400"
                                      }`}
                                    >
                                      {parseFloat(priceData.changePercent) >= 0
                                        ? "+"
                                        : ""}
                                      {priceData.changePercent}%
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">
                                    Loading...
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-100">
                                {formatINR(invested)}
                              </td>
                              <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                                {formatINR(currentValue)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div
                                  className={`font-semibold ${
                                    gainLoss >= 0
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-red-600 dark:text-red-400"
                                  }`}
                                >
                                  {gainLoss >= 0 ? "+" : "-"}
                                  {formatINR(Math.abs(gainLoss))}
                                </div>
                                <div
                                  className={`text-xs ${
                                    gainLoss >= 0
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-red-600 dark:text-red-400"
                                  }`}
                                >
                                  {gainLoss >= 0 ? "+" : "-"}
                                  {Math.abs(gainLossPercent).toFixed(2)}%
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingHolding(holding);
                                      setIsModalOpen(true);
                                    }}
                                    className="text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteHolding(holding.id)
                                    }
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mutual Funds Section */}
            {holdings.filter((h) => h.asset_type === "mutual_fund").length >
              0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-playfair text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                    Mutual Funds (
                    {
                      holdings.filter((h) => h.asset_type === "mutual_fund")
                        .length
                    }
                    )
                  </h3>

                  {/* Mutual Funds Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(() => {
                      const mutualFunds = holdings.filter(
                        (h) => h.asset_type === "mutual_fund"
                      );
                      const mfInvested = mutualFunds.reduce(
                        (sum, h) => sum + h.quantity * h.purchase_price,
                        0
                      );
                      const mfCurrentValue = mutualFunds.reduce((sum, h) => {
                        const priceData = prices[h.symbol];
                        return (
                          sum +
                          (priceData
                            ? h.quantity * priceData.currentPrice
                            : h.quantity * h.purchase_price)
                        );
                      }, 0);
                      const mfGainLoss = mfCurrentValue - mfInvested;
                      const mfGainPercent =
                        mfInvested > 0 ? (mfGainLoss / mfInvested) * 100 : 0;

                      return (
                        <>
                          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Invested
                            </p>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {formatINR(mfInvested)}
                            </p>
                          </div>
                          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Current
                            </p>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {formatINR(mfCurrentValue)}
                            </p>
                          </div>
                          <div
                            className={`rounded-lg p-3 ${
                              mfGainLoss >= 0
                                ? "bg-green-50 dark:bg-green-900/20"
                                : "bg-red-50 dark:bg-red-900/20"
                            }`}
                          >
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Gain/Loss
                            </p>
                            <p
                              className={`text-lg font-bold ${
                                mfGainLoss >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {mfGainLoss >= 0 ? "+" : ""}
                              {formatINR(mfGainLoss)}
                            </p>
                          </div>
                          <div
                            className={`rounded-lg p-3 ${
                              mfGainLoss >= 0
                                ? "bg-green-50 dark:bg-green-900/20"
                                : "bg-red-50 dark:bg-red-900/20"
                            }`}
                          >
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Returns
                            </p>
                            <p
                              className={`text-lg font-bold ${
                                mfGainLoss >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {mfGainLoss >= 0 ? "+" : ""}
                              {mfGainPercent.toFixed(2)}%
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-purple-50 dark:bg-purple-900/20">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Fund Name
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Units
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Buy NAV
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Current NAV
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Invested
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Current Value
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Gain/Loss
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {holdings
                        .filter((h) => h.asset_type === "mutual_fund")
                        .map((holding) => {
                          const priceData = prices[holding.symbol];
                          const invested =
                            holding.quantity * holding.purchase_price;
                          const currentValue = priceData
                            ? holding.quantity * priceData.currentPrice
                            : invested;
                          const gainLoss = currentValue - invested;
                          const gainLossPercent =
                            invested > 0 ? (gainLoss / invested) * 100 : 0;

                          return (
                            <tr
                              key={holding.id}
                              className="hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div>
                                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                                    {holding.name}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {holding.symbol}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-100">
                                {holding.quantity}
                              </td>
                              <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-100">
                                {formatINR(holding.purchase_price)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {priceData ? (
                                  <div>
                                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                                      {formatINR(priceData.currentPrice)}
                                    </div>
                                    <div
                                      className={`text-xs ${
                                        parseFloat(priceData.changePercent) >= 0
                                          ? "text-green-600 dark:text-green-400"
                                          : "text-red-600 dark:text-red-400"
                                      }`}
                                    >
                                      {parseFloat(priceData.changePercent) >= 0
                                        ? "+"
                                        : ""}
                                      {priceData.changePercent}%
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">
                                    Loading...
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-100">
                                {formatINR(invested)}
                              </td>
                              <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                                {formatINR(currentValue)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div
                                  className={`font-semibold ${
                                    gainLoss >= 0
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-red-600 dark:text-red-400"
                                  }`}
                                >
                                  {gainLoss >= 0 ? "+" : "-"}
                                  {formatINR(Math.abs(gainLoss))}
                                </div>
                                <div
                                  className={`text-xs ${
                                    gainLoss >= 0
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-red-600 dark:text-red-400"
                                  }`}
                                >
                                  {gainLoss >= 0 ? "+" : "-"}
                                  {Math.abs(gainLossPercent).toFixed(2)}%
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingHolding(holding);
                                      setIsModalOpen(true);
                                    }}
                                    className="text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteHolding(holding.id)
                                    }
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center">
            <PieChart className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="font-playfair text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              No Holdings Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start tracking your investments by adding your first holding
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all"
            >
              Add Your First Holding
            </button>
          </div>
        )}
      </main>

      {/* Floating Add Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 sm:bottom-8 right-4 sm:right-8 bg-gradient-to-r from-teal-500 to-cyan-500 dark:from-indigo-600 dark:to-purple-600 text-white p-4 sm:p-4 rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 group z-40"
        aria-label="Add Holding"
      >
        <Plus className="w-7 h-7 sm:w-8 sm:h-8" />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-teal-700 dark:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm font-poppins whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Add Holding
        </span>
      </button>

      {/* Modals */}
      <AddHoldingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingHolding(null);
        }}
        onSave={handleAddHolding}
        editData={editingHolding}
      />
    </div>
  );
};

export default Portfolio;
