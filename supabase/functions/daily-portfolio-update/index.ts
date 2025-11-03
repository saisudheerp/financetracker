// =============================================
// Daily Portfolio Update - Supabase Edge Function
// Runs automatically at 3:30 PM IST every weekday
// Updates stock prices and mutual fund NAVs
// =============================================

// NOTE: VS Code may show import errors for Deno modules.
// These are expected and will work correctly when deployed to Supabase.
// The function uses Deno runtime, not Node.js.

/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PriceInfo {
  currentPrice: number;
  previousClose: number;
  changePercent: number;
}

interface Holding {
  symbol: string;
  asset_type: "stock" | "mutual_fund";
  quantity?: number;
  purchase_price?: number;
  user_id?: string;
}

interface User {
  user_id: string;
}

// Fetch stock price from Yahoo Finance
async function fetchStockPrice(symbol: string): Promise<PriceInfo | null> {
  const proxies = [
    "https://api.allorigins.win/raw?url=",
    "https://corsproxy.io/?",
  ];

  const fullSymbol = symbol.includes(".") ? symbol : `${symbol}.NS`;

  for (const proxy of proxies) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${fullSymbol}?interval=1d&range=5d`;
      const response = await fetch(proxy + encodeURIComponent(url), {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const result = data?.chart?.result?.[0];

      if (!result?.meta) continue;

      const currentPrice = result.meta.regularMarketPrice;
      const previousClose =
        result.meta.chartPreviousClose || result.meta.previousClose;

      if (!currentPrice) continue;

      const changePercent = previousClose
        ? (((currentPrice - previousClose) / previousClose) * 100).toFixed(2)
        : "0.00";

      return {
        currentPrice: parseFloat(currentPrice.toFixed(2)),
        previousClose: parseFloat((previousClose || currentPrice).toFixed(2)),
        changePercent: parseFloat(changePercent),
      };
    } catch (error) {
      console.error(`Error with proxy ${proxy}:`, error);
      continue;
    }
  }

  return null;
}

// Fetch mutual fund NAV from MFAPI
async function fetchMutualFundNAV(amfiCode: string): Promise<PriceInfo | null> {
  try {
    const response = await fetch(`https://api.mfapi.in/mf/${amfiCode}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (!data?.data?.[0]?.nav) return null;

    const currentNAV = parseFloat(data.data[0].nav);
    const previousNAV = data.data[1]?.nav
      ? parseFloat(data.data[1].nav)
      : currentNAV;
    const changePercent = (
      ((currentNAV - previousNAV) / previousNAV) *
      100
    ).toFixed(2);

    return {
      currentPrice: currentNAV,
      previousClose: previousNAV,
      changePercent: parseFloat(changePercent),
    };
  } catch (error) {
    console.error(`Error fetching NAV for ${amfiCode}:`, error);
    return null;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🚀 Starting daily portfolio update...");

    // Get all unique symbols from portfolio_holdings
    const { data: holdings, error: holdingsError } = await supabase
      .from("portfolio_holdings")
      .select("symbol, asset_type")
      .order("symbol");

    if (holdingsError) {
      throw new Error(`Failed to fetch holdings: ${holdingsError.message}`);
    }

    if (!holdings || holdings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No holdings to update", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get unique symbols
    const uniqueHoldings = Array.from(
      new Map(holdings.map((h: Holding) => [h.symbol, h])).values()
    );

    console.log(
      `📊 Updating prices for ${uniqueHoldings.length} unique symbols...`
    );

    let successCount = 0;
    let failCount = 0;
    const updates = [];

    // Fetch prices for each holding
    for (const holding of uniqueHoldings) {
      const typedHolding = holding as Holding;

      try {
        let priceInfo: PriceInfo | null = null;

        if (typedHolding.asset_type === "stock") {
          priceInfo = await fetchStockPrice(typedHolding.symbol);
        } else if (typedHolding.asset_type === "mutual_fund") {
          priceInfo = await fetchMutualFundNAV(typedHolding.symbol);
        }

        if (priceInfo) {
          updates.push({
            symbol: typedHolding.symbol,
            asset_type: typedHolding.asset_type,
            current_price: priceInfo.currentPrice,
            previous_close: priceInfo.previousClose,
            change_percent: priceInfo.changePercent,
            last_updated: new Date().toISOString(),
          });
          successCount++;
          console.log(`✅ ${typedHolding.symbol}: ₹${priceInfo.currentPrice}`);
        } else {
          failCount++;
          console.warn(`⚠️ Failed to fetch price for ${typedHolding.symbol}`);
        }

        // Delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        failCount++;
        console.error(`❌ Error processing ${typedHolding.symbol}:`, error);
      }
    }

    // Batch update portfolio_prices
    if (updates.length > 0) {
      const { error: updateError } = await supabase
        .from("portfolio_prices")
        .upsert(updates, { onConflict: "symbol" });

      if (updateError) {
        console.error("Error updating prices:", updateError);
        throw new Error(`Failed to update prices: ${updateError.message}`);
      }

      console.log(`💾 Saved ${updates.length} prices to database`);
    }

    // Create portfolio snapshots for all users
    const { data: users, error: usersError } = await supabase
      .from("portfolio_holdings")
      .select("user_id")
      .order("user_id");

    if (!usersError && users) {
      const uniqueUsers = Array.from(
        new Set(users.map((u: User) => u.user_id))
      );

      for (const userId of uniqueUsers) {
        try {
          // Calculate user's portfolio value
          const { data: userHoldings } = await supabase
            .from("portfolio_holdings")
            .select("symbol, quantity, purchase_price, asset_type")
            .eq("user_id", userId);

          if (!userHoldings || userHoldings.length === 0) continue;

          let totalInvested = 0;
          let totalCurrent = 0;

          for (const holding of userHoldings) {
            const invested = holding.quantity * holding.purchase_price;
            totalInvested += invested;

            // Get current price from our updates
            const priceData = updates.find((u) => u.symbol === holding.symbol);
            const current = priceData
              ? holding.quantity * priceData.current_price
              : invested;

            totalCurrent += current;
          }

          const gainLoss = totalCurrent - totalInvested;
          const gainLossPercent =
            totalInvested > 0
              ? ((gainLoss / totalInvested) * 100).toFixed(2)
              : 0;

          // Save snapshot
          await supabase.from("portfolio_history").insert({
            user_id: userId,
            total_value: totalCurrent,
            total_invested: totalInvested,
            gain_loss: gainLoss,
            gain_loss_percent: gainLossPercent,
            recorded_at: new Date().toISOString(),
          });

          console.log(
            `📸 Snapshot saved for user ${userId}: ₹${totalCurrent.toFixed(2)}`
          );
        } catch (error) {
          console.error(`Error saving snapshot for user ${userId}:`, error);
        }
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      totalSymbols: uniqueHoldings.length,
      successCount,
      failCount,
      message: `Updated ${successCount} prices successfully, ${failCount} failed`,
    };

    console.log("✅ Daily update complete:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error in daily update:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
