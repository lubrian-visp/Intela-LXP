import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project
    const { data: project, error: pErr } = await supabase.from("wbt_projects").select("*").eq("id", project_id).single();
    if (pErr || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch sprint reviews
    const { data: reviews } = await supabase.from("wbt_sprint_reviews").select("*").eq("project_id", project_id).order("sprint_number");

    // Fetch backlog items
    const { data: backlog } = await supabase.from("wbt_backlog_items").select("*").eq("project_id", project_id).order("priority_order");

    // Fetch escrow transactions
    const { data: escrow } = await supabase.from("wbt_escrow_transactions").select("*").eq("project_id", project_id).order("created_at");

    // Fetch applications
    const { data: apps } = await supabase.from("wbt_project_applications").select("*").eq("project_id", project_id);

    // Build HTML for PDF
    const totalStoryPoints = (backlog || []).reduce((sum: number, b: any) => sum + (b.story_points || 0), 0);
    const completedItems = (backlog || []).filter((b: any) => b.status === "done").length;
    const totalEscrow = (escrow || []).reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
    const releasedEscrow = (escrow || []).filter((e: any) => e.status === "released").reduce((sum: number, e: any) => sum + (Number(e.net_amount) || 0), 0);

    const sprintRows = (reviews || []).map((r: any) => `
      <tr>
        <td>Sprint ${r.sprint_number}</td>
        <td>${r.decision || "pending"}</td>
        <td>${r.reviewer_id?.slice(0, 8) || "N/A"}...</td>
        <td>${r.created_at ? new Date(r.created_at).toLocaleDateString() : "N/A"}</td>
        <td>${r.notes || ""}</td>
      </tr>
    `).join("");

    const escrowRows = (escrow || []).map((e: any) => `
      <tr>
        <td>${e.transaction_type}</td>
        <td>${e.currency} ${Number(e.amount).toFixed(2)}</td>
        <td>${e.status}</td>
        <td>${e.created_at ? new Date(e.created_at).toLocaleDateString() : "N/A"}</td>
      </tr>
    `).join("");

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; font-size: 12px; }
    h1 { color: #1e3a5f; border-bottom: 3px solid #1e3a5f; padding-bottom: 10px; }
    h2 { color: #2d5986; margin-top: 30px; }
    .meta { background: #f0f4f8; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .meta p { margin: 4px 0; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat-box { background: #e8f0fe; padding: 15px; border-radius: 8px; text-align: center; flex: 1; }
    .stat-box .value { font-size: 24px; font-weight: bold; color: #1e3a5f; }
    .stat-box .label { font-size: 11px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #1e3a5f; color: white; padding: 10px; text-align: left; font-size: 11px; }
    td { padding: 8px 10px; border-bottom: 1px solid #ddd; font-size: 11px; }
    tr:nth-child(even) { background: #f9f9f9; }
    .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; color: #888; text-align: center; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
    .badge-active { background: #d4edda; color: #155724; }
    .badge-completed { background: #cce5ff; color: #004085; }
    .badge-draft { background: #fff3cd; color: #856404; }
  </style>
</head>
<body>
  <h1>Sprint Report: ${project.title}</h1>
  
  <div class="meta">
    <p><strong>Project ID:</strong> ${project.id.slice(0, 8)}...</p>
    <p><strong>Framework:</strong> ${project.agile_framework} | <strong>Model:</strong> ${project.project_model === "external_client" ? "Client-Led" : "Mentor-Led"}</p>
    <p><strong>Payment:</strong> ${project.payment_model} | <strong>Status:</strong> <span class="badge badge-${project.status}">${project.status}</span></p>
    <p><strong>Sprint Length:</strong> ${project.sprint_length_weeks} week(s)</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  </div>

  <div class="stats">
    <div class="stat-box"><div class="value">${backlog?.length || 0}</div><div class="label">Backlog Items</div></div>
    <div class="stat-box"><div class="value">${completedItems}</div><div class="label">Completed</div></div>
    <div class="stat-box"><div class="value">${totalStoryPoints}</div><div class="label">Total Points</div></div>
    <div class="stat-box"><div class="value">${apps?.length || 0}</div><div class="label">Learners</div></div>
  </div>

  <h2>Sprint Reviews</h2>
  ${(reviews || []).length > 0 ? `
  <table>
    <tr><th>Sprint</th><th>Decision</th><th>Reviewer</th><th>Date</th><th>Notes</th></tr>
    ${sprintRows}
  </table>` : "<p>No sprint reviews recorded yet.</p>"}

  ${project.payment_model === "paid" ? `
  <h2>Financial Summary</h2>
  <div class="stats">
    <div class="stat-box"><div class="value">${project.currency} ${totalEscrow.toFixed(2)}</div><div class="label">Total Escrowed</div></div>
    <div class="stat-box"><div class="value">${project.currency} ${releasedEscrow.toFixed(2)}</div><div class="label">Released</div></div>
  </div>
  ${(escrow || []).length > 0 ? `
  <table>
    <tr><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr>
    ${escrowRows}
  </table>` : "<p>No transactions yet.</p>"}` : ""}

  <div class="footer">
    <p>INTELA SKILLCHAIN - Agile Work-Based Training Sprint Report</p>
    <p>This report was auto-generated. For queries, contact your programme manager.</p>
  </div>
</body>
</html>`;

    return new Response(JSON.stringify({ html, project_title: project.title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("wbt-sprint-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
