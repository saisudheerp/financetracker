// =============================================
// Process Recurring Transactions - Supabase Edge Function
// Runs every hour to process due recurring transactions
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

interface RecurringTransaction {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  type: "income" | "expense";
  description: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  start_date: string;
  next_due_date: string;
  is_active: boolean;
  last_processed: string | null;
}

// Calculate next due date based on frequency
function calculateNextDueDate(currentDueDate: Date, frequency: string): Date {
  const nextDate = new Date(currentDueDate);

  switch (frequency) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case "quarterly":
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case "yearly":
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }

  return nextDate;
}

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

    console.log("🔄 Starting recurring transactions processing...");

    const now = new Date();
    const todayIST = now.toISOString().split("T")[0]; // YYYY-MM-DD format

    // Get all active recurring transactions that are due today or before
    const { data: recurringTransactions, error: fetchError } = await supabase
      .from("recurring_transactions")
      .select("*")
      .eq("is_active", true)
      .lte("next_due_date", todayIST)
      .order("next_due_date");

    if (fetchError) {
      throw new Error(`Failed to fetch recurring transactions: ${fetchError.message}`);
    }

    if (!recurringTransactions || recurringTransactions.length === 0) {
      console.log("✅ No recurring transactions due today");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No recurring transactions due", 
          processed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📊 Found ${recurringTransactions.length} recurring transactions to process`);

    let successCount = 0;
    let failCount = 0;
    const processedIds: string[] = [];

    for (const recurring of recurringTransactions as RecurringTransaction[]) {
      try {
        // Create the actual transaction
        const { error: insertError } = await supabase.from("transactions").insert({
          user_id: recurring.user_id,
          category_id: recurring.category_id,
          amount: recurring.amount,
          type: recurring.type,
          description: `${recurring.description} (Auto-generated)`,
          date: todayIST,
          payment_method: "Auto", // Mark as automatic
          notes: `Automatically created from recurring transaction`,
        });

        if (insertError) {
          console.error(`❌ Failed to create transaction for ${recurring.description}:`, insertError);
          failCount++;
          continue;
        }

        // Calculate next due date
        const currentDueDate = new Date(recurring.next_due_date);
        const nextDueDate = calculateNextDueDate(currentDueDate, recurring.frequency);

        // Update the recurring transaction with new next_due_date and last_processed
        const { error: updateError } = await supabase
          .from("recurring_transactions")
          .update({
            next_due_date: nextDueDate.toISOString().split("T")[0],
            last_processed: todayIST,
          })
          .eq("id", recurring.id);

        if (updateError) {
          console.error(`⚠️ Warning: Failed to update recurring transaction ${recurring.id}:`, updateError);
        }

        processedIds.push(recurring.id);
        successCount++;
        console.log(
          `✅ Processed: ${recurring.description} (${recurring.type}) - ₹${recurring.amount}`
        );
      } catch (error) {
        console.error(`❌ Error processing recurring transaction ${recurring.id}:`, error);
        failCount++;
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      totalDue: recurringTransactions.length,
      processed: successCount,
      failed: failCount,
      processedIds,
      message: `Processed ${successCount} recurring transactions, ${failCount} failed`,
    };

    console.log("✅ Recurring transactions processing complete:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error in recurring transactions processing:", error);

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
