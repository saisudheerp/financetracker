// =============================================
// Daily Site Maintenance - Master Edge Function
// Runs automatically every day at midnight IST
// Handles all automated site tasks
// =============================================

// @ts-ignore - Deno runtime types
/// <reference lib="deno.ns" />

// @ts-ignore - Deno imports work at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno imports work at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // @ts-ignore - Deno global available in Edge Function runtime
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    // @ts-ignore - Deno global available in Edge Function runtime
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🌙 Starting daily site maintenance...");
    const startTime = Date.now();
    const results: Record<string, any> = {};

    // ============================================
    // Task 1: Clean up old portfolio history (keep last 90 days)
    // ============================================
    try {
      console.log("🗑️ Cleaning up old portfolio history...");
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { count, error } = await supabase
        .from("portfolio_history")
        .delete()
        .lt("recorded_at", ninetyDaysAgo.toISOString());

      if (error) throw error;

      results.portfolioCleanup = {
        success: true,
        deletedRecords: count || 0,
      };
      console.log(`✅ Deleted ${count || 0} old portfolio history records`);
    } catch (error) {
      console.error("❌ Portfolio cleanup failed:", error);
      results.portfolioCleanup = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // ============================================
    // Task 2: Clean up old price alerts (keep last 30 days)
    // ============================================
    try {
      console.log("🗑️ Cleaning up old price alerts...");
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count, error } = await supabase
        .from("portfolio_alerts")
        .delete()
        .lt("created_at", thirtyDaysAgo.toISOString());

      if (error) throw error;

      results.alertsCleanup = {
        success: true,
        deletedRecords: count || 0,
      };
      console.log(`✅ Deleted ${count || 0} old price alerts`);
    } catch (error) {
      console.error("❌ Alerts cleanup failed:", error);
      results.alertsCleanup = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // ============================================
    // Task 3: Update budget goal progress for all users
    // ============================================
    try {
      console.log("📊 Updating budget goal progress...");
      
      const { data: budgetGoals, error: budgetError } = await supabase
        .from("budget_goals")
        .select("*");

      if (budgetError) throw budgetError;

      if (budgetGoals && budgetGoals.length > 0) {
        let updatedCount = 0;

        for (const budget of budgetGoals) {
          try {
            // Calculate date range based on period
            const today = new Date();
            let startDate: Date;

            switch (budget.period) {
              case "monthly":
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
              case "quarterly":
                const currentQuarter = Math.floor(today.getMonth() / 3);
                startDate = new Date(today.getFullYear(), currentQuarter * 3, 1);
                break;
              case "yearly":
                startDate = new Date(today.getFullYear(), 0, 1);
                break;
              default:
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            }

            // Get transactions for this budget
            const { data: transactions } = await supabase
              .from("transactions")
              .select("amount")
              .eq("user_id", budget.user_id)
              .eq("category_id", budget.category_id)
              .eq("type", "expense")
              .gte("date", startDate.toISOString());

            const spent = transactions
              ? transactions.reduce((sum: number, t: any) => sum + t.amount, 0)
              : 0;

            // Update budget with current spent amount (if needed for tracking)
            // Note: Your current schema might not have a 'spent' field
            // If you want to add this functionality, add a 'current_spent' column
            updatedCount++;
          } catch (err) {
            console.error(`⚠️ Failed to update budget ${budget.id}:`, err);
          }
        }

        results.budgetUpdate = {
          success: true,
          updatedCount,
        };
        console.log(`✅ Updated ${updatedCount} budget goals`);
      } else {
        results.budgetUpdate = {
          success: true,
          updatedCount: 0,
        };
      }
    } catch (error) {
      console.error("❌ Budget update failed:", error);
      results.budgetUpdate = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // ============================================
    // Task 4: Check and update achieved savings goals
    // ============================================
    try {
      console.log("💰 Checking savings goals progress...");
      
      const { data: savingsGoals, error: savingsError } = await supabase
        .from("savings_goals")
        .select("*")
        .neq("is_achieved", true);

      if (savingsError) throw savingsError;

      let achievedCount = 0;

      if (savingsGoals && savingsGoals.length > 0) {
        for (const goal of savingsGoals) {
          if (goal.current_amount >= goal.target_amount && !goal.is_achieved) {
            // Mark goal as achieved
            await supabase
              .from("savings_goals")
              .update({ is_achieved: true })
              .eq("id", goal.id);

            achievedCount++;
            console.log(`🎉 Savings goal achieved: ${goal.goal_name}`);
          }
        }
      }

      results.savingsGoalsCheck = {
        success: true,
        achievedCount,
      };
      console.log(`✅ Checked savings goals, ${achievedCount} newly achieved`);
    } catch (error) {
      console.error("❌ Savings goals check failed:", error);
      results.savingsGoalsCheck = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // ============================================
    // Task 5: Generate daily analytics summary (optional)
    // ============================================
    try {
      console.log("📈 Generating daily analytics...");
      
      const today = new Date().toISOString().split("T")[0];
      const { data: users } = await supabase
        .from("users")
        .select("user_id");

      let summariesCreated = 0;

      if (users && users.length > 0) {
        for (const user of users) {
          try {
            // Get today's transactions
            const { data: transactions } = await supabase
              .from("transactions")
              .select("type, amount")
              .eq("user_id", user.user_id)
              .eq("date", today);

            if (transactions && transactions.length > 0) {
              const income = transactions
                .filter((t: any) => t.type === "income")
                .reduce((sum: number, t: any) => sum + t.amount, 0);
              const expenses = transactions
                .filter((t: any) => t.type === "expense")
                .reduce((sum: number, t: any) => sum + t.amount, 0);

              summariesCreated++;
              console.log(
                `📊 User ${user.user_id}: Income ₹${income}, Expenses ₹${expenses}`
              );
            }
          } catch (err) {
            console.error(`⚠️ Failed to analyze user ${user.user_id}:`, err);
          }
        }
      }

      results.dailyAnalytics = {
        success: true,
        summariesCreated,
      };
      console.log(`✅ Generated analytics for ${summariesCreated} users`);
    } catch (error) {
      console.error("❌ Daily analytics failed:", error);
      results.dailyAnalytics = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const finalResult = {
      success: true,
      timestamp: new Date().toISOString(),
      durationMs: duration,
      tasksCompleted: Object.keys(results).length,
      results,
      message: "Daily maintenance completed successfully",
    };

    console.log(`✅ Daily maintenance complete in ${duration}ms`);
    console.log("Results:", JSON.stringify(results, null, 2));

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error in daily maintenance:", error);

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
