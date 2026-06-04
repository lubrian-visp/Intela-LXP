import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AssessorPerfEntry {
  assessor_name: string;
  items_reviewed: number;
  approved: number;
  rejected: number;
  rejection_rate: number;
  consistency_score: number;
  common_rejection_categories: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify JWT
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authorization: only staff roles can export moderator QA reports
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const allowedRoles = ["super_admin", "systems_admin", "operations", "programme_manager", "moderator"];
    const hasAccess = roles?.some((r: any) => allowedRoles.includes(r.role));
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reportId, format } = await req.json();
    if (!reportId || !format) throw new Error("Missing reportId or format");

    const { data: report, error: rErr } = await supabase
      .from("moderator_reports")
      .select("*, programmes(title)")
      .eq("id", reportId)
      .single();
    if (rErr || !report) throw new Error("Report not found");

    const programmeName = (report as any).programmes?.title || "Programme";
    const assessors = (report.assessor_performance || []) as AssessorPerfEntry[];
    const mode = report.report_mode === "programme" ? "Programme-Wide" : "Cohort";

    if (format === "xlsx") {
      const content = generateExcel(report, programmeName, assessors, mode);
      const base64 = btoa(unescape(encodeURIComponent(content)));
      return new Response(JSON.stringify({ base64 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (format === "docx" || format === "pdf") {
      const html = generateWordHTML(report, programmeName, assessors, mode);
      const base64 = btoa(unescape(encodeURIComponent(html)));
      return new Response(JSON.stringify({ base64 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unsupported format: " + format);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateWordHTML(r: any, progName: string, assessors: AssessorPerfEntry[], mode: string): string {
  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Moderator QA Report</title>
<style>
body{font-family:Calibri,sans-serif;font-size:11pt;margin:2cm}
h1{font-size:16pt;text-align:center;margin-bottom:6pt;text-transform:uppercase}
h2{font-size:12pt;background:#e8e8e8;padding:6pt 8pt;border-bottom:2pt solid #333;margin-top:16pt;text-transform:uppercase}
table{width:100%;border-collapse:collapse;margin:8pt 0}
th,td{border:1pt solid #999;padding:5pt 6pt;font-size:10pt;vertical-align:top}
th{background:#e0e0e0;font-weight:bold;text-align:left}
.header-table td{border:1pt solid #ccc;padding:4pt 8pt}
.header-label{font-weight:bold;background:#f5f5f5;width:25%}
.sig-box{border-bottom:1pt solid #333;width:200pt;height:40pt;display:inline-block;margin:10pt 0}
.declaration{font-style:italic;padding:8pt;background:#f9f9f9;border-left:3pt solid #333;margin:10pt 0}
.stat-box{display:inline-block;text-align:center;padding:8pt 16pt;border:1pt solid #ccc;margin:4pt;border-radius:4pt}
.stat-value{font-size:18pt;font-weight:bold}
.stat-label{font-size:8pt;color:#666}
.mode-badge{font-size:9pt;color:#666;text-align:center;margin-bottom:10pt}
</style></head><body>
<h1>MODERATOR QUALITY ASSURANCE REPORT</h1>
<p class="mode-badge">Report Mode: ${mode}</p>

<table class="header-table">
<tr><td class="header-label">Programme:</td><td>${esc(progName)}</td><td class="header-label">Report Date:</td><td>${esc(r.report_date)}</td></tr>
<tr><td class="header-label">Period:</td><td>${esc(r.period_start)} — ${esc(r.period_end)}</td><td class="header-label">Status:</td><td>${esc(r.status)}</td></tr>
</table>

<h2>1. Moderation Summary</h2>
<table>
<tr><th>Total Items Reviewed</th><th>Approved</th><th>Rejected</th><th>Avg Turnaround (hrs)</th><th>Sampling Target %</th><th>Sampling Achieved %</th></tr>
<tr>
<td style="text-align:center;font-weight:bold">${r.total_items_reviewed ?? 0}</td>
<td style="text-align:center;color:green;font-weight:bold">${r.approved_count ?? 0}</td>
<td style="text-align:center;color:red;font-weight:bold">${r.rejected_count ?? 0}</td>
<td style="text-align:center">${r.avg_turnaround_hours ?? 0}</td>
<td style="text-align:center">${r.sampling_target_pct ?? 25}%</td>
<td style="text-align:center">${r.sampling_achieved_pct ?? 0}%</td>
</tr></table>
${r.summary_notes ? `<p><b>Summary Notes:</b></p><p>${esc(r.summary_notes)}</p>` : ""}

<h2>2. Assessor Performance</h2>
<table>
<tr><th>Assessor</th><th style="text-align:center">Reviewed</th><th style="text-align:center">Approved</th><th style="text-align:center">Rejected</th><th style="text-align:center">Rejection Rate</th><th style="text-align:center">Consistency</th><th>Common Issues</th></tr>
${assessors.map(a => `<tr>
<td>${esc(a.assessor_name)}</td>
<td style="text-align:center">${a.items_reviewed}</td>
<td style="text-align:center">${a.approved}</td>
<td style="text-align:center">${a.rejected}</td>
<td style="text-align:center">${a.rejection_rate}%</td>
<td style="text-align:center">${a.consistency_score}%</td>
<td>${esc(a.common_rejection_categories.join(", "))}</td>
</tr>`).join("")}
</table>

<h2>3. Findings & Recommendations</h2>
<p><b>Systemic Issues:</b></p><p>${esc(r.systemic_issues) || "None identified."}</p>
<p><b>Patterns Observed:</b></p><p>${esc(r.patterns_observed) || "None noted."}</p>
<p><b>Recommendations:</b></p><p>${esc(r.recommendations) || "None."}</p>
<p><b>Improvement Actions:</b></p><p>${esc(r.improvement_actions) || "None required."}</p>

<h2>4. Compliance Declaration</h2>
<div class="declaration">${esc(r.declaration_text)}</div>
<br/><br/>
<table style="border:none">
<tr style="border:none">
<td style="border:none;width:50%"><b>Moderator Signature:</b><br/><div class="sig-box"></div><br/>Date: ${esc(r.moderator_signature_date)}</td>
<td style="border:none;width:50%"><b>QA Manager Signature:</b><br/><div class="sig-box"></div><br/>Date: ${esc(r.qa_manager_signature_date)}</td>
</tr></table>
</body></html>`;
}

function generateExcel(r: any, progName: string, assessors: AssessorPerfEntry[], mode: string): string {
  const sep = "\t";
  const lines: string[] = [];

  lines.push("MODERATOR QUALITY ASSURANCE REPORT");
  lines.push(`Report Mode:${sep}${mode}`);
  lines.push(`Programme:${sep}${progName}`);
  lines.push(`Report Date:${sep}${r.report_date || ""}`);
  lines.push(`Period:${sep}${r.period_start || ""} — ${r.period_end || ""}`);
  lines.push("");

  lines.push("1. MODERATION SUMMARY");
  lines.push(`Total Items Reviewed${sep}Approved${sep}Rejected${sep}Avg Turnaround (hrs)${sep}Sampling Target %${sep}Sampling Achieved %`);
  lines.push(`${r.total_items_reviewed ?? 0}${sep}${r.approved_count ?? 0}${sep}${r.rejected_count ?? 0}${sep}${r.avg_turnaround_hours ?? 0}${sep}${r.sampling_target_pct ?? 25}${sep}${r.sampling_achieved_pct ?? 0}`);
  lines.push(`Summary Notes:${sep}${r.summary_notes || ""}`);
  lines.push("");

  lines.push("2. ASSESSOR PERFORMANCE");
  lines.push(`Assessor${sep}Reviewed${sep}Approved${sep}Rejected${sep}Rejection Rate${sep}Consistency${sep}Common Issues`);
  assessors.forEach(a => {
    lines.push(`${a.assessor_name}${sep}${a.items_reviewed}${sep}${a.approved}${sep}${a.rejected}${sep}${a.rejection_rate}%${sep}${a.consistency_score}%${sep}${a.common_rejection_categories.join(", ")}`);
  });
  lines.push("");

  lines.push("3. FINDINGS & RECOMMENDATIONS");
  lines.push(`Systemic Issues:${sep}${r.systemic_issues || "None"}`);
  lines.push(`Patterns Observed:${sep}${r.patterns_observed || "None"}`);
  lines.push(`Recommendations:${sep}${r.recommendations || "None"}`);
  lines.push(`Improvement Actions:${sep}${r.improvement_actions || "None"}`);
  lines.push("");

  lines.push("4. COMPLIANCE DECLARATION");
  lines.push(`Declaration:${sep}${r.declaration_text || ""}`);
  lines.push(`Moderator Signature Date:${sep}${r.moderator_signature_date || ""}`);
  lines.push(`QA Manager Signature Date:${sep}${r.qa_manager_signature_date || ""}`);

  return "\uFEFF" + lines.join("\n");
}

function esc(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
