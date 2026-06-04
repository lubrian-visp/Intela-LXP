import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Find all issued invoices past their due date
  const today = new Date().toISOString().split("T")[0];

  const { data: overdueInvoices, error: fetchErr } = await supabase
    .from("sponsor_invoices")
    .select("id, sponsor_id, invoice_number, amount, currency, due_date")
    .eq("status", "issued")
    .lt("due_date", today);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const updated: string[] = [];

  for (const inv of overdueInvoices ?? []) {
    // Mark as overdue
    await supabase
      .from("sponsor_invoices")
      .update({ status: "overdue" })
      .eq("id", inv.id);

    // Notify the sponsor
    await supabase.from("notifications").insert({
      user_id: inv.sponsor_id,
      title: `Invoice Overdue: ${inv.invoice_number}`,
      body: `Invoice for ${inv.currency} ${Number(inv.amount).toLocaleString()} was due on ${inv.due_date}. Please arrange payment.`,
      category: "general",
      reference_table: "sponsor_invoices",
      action_url: "/sponsor/invoices",
    });

    updated.push(inv.id);
  }

  return new Response(
    JSON.stringify({
      message: `${updated.length} invoice(s) marked overdue`,
      ids: updated,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
