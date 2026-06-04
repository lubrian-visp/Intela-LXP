import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CriterionItem {
  id: string;
  criterion: string;
  description: string;
  yes: boolean;
  no: boolean;
  comments: string;
}

interface LearnerOutcome {
  no: number;
  surname: string;
  names: string;
  gender: string;
  id_number: string;
  outcome: string;
  comments: string;
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

    // Verify JWT using anon client
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

    // Service role client for data access (after auth verified)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authorization: only staff roles can export reports
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const allowedRoles = ["super_admin", "systems_admin", "operations", "programme_manager", "facilitator", "assessor", "moderator"];
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
      .from("assessor_reports")
      .select("*")
      .eq("id", reportId)
      .single();
    if (rErr || !report) throw new Error("Report not found");

    const { data: modules } = await supabase
      .from("programme_modules")
      .select("title, credits, unit_standard_code, nqf_level, credential_label")
      .eq("programme_id", report.programme_id)
      .order("sequence_order");

    const unitStandards = (modules || []).map((m: any) => ({
      code: m.unit_standard_code || m.credential_label || "",
      title: m.title,
      level: m.nqf_level || 0,
      credits: m.credits || 0,
    }));
    const totalCredits = unitStandards.reduce((s: number, u: any) => s + u.credits, 0);

    if (format === "xlsx") {
      const content = generateExcelContent(report, unitStandards, totalCredits);
      const base64 = btoa(unescape(encodeURIComponent(content)));
      return new Response(JSON.stringify({ base64 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (format === "docx" || format === "pdf") {
      const html = generateWordHTML(report, unitStandards, totalCredits);
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

function generateWordHTML(report: any, unitStandards: any[], totalCredits: number): string {
  const s2 = (report.section2_criteria || []) as CriterionItem[];
  const s3 = (report.section3_criteria || []) as CriterionItem[];
  const learners = (report.section4_learners || []) as LearnerOutcome[];
  const mode = report.report_mode === "learner" ? "Per Learner" : "Cohort";

  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Assessor Feedback Report</title>
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
.section-desc{font-size:9pt;color:#555;padding:2pt 6pt}
.mode-badge{font-size:9pt;color:#666;text-align:center;margin-bottom:10pt}
</style></head><body>
<h1>ASSESSOR FEEDBACK REPORT</h1>
<p class="mode-badge">Report Mode: ${mode}</p>

<table class="header-table">
<tr><td class="header-label">Assessor Name:</td><td>${esc(report.assessor_name)}</td><td class="header-label">Date of Submission:</td><td>${esc(report.submission_date)}</td></tr>
<tr><td class="header-label">Client Name:</td><td>${esc(report.client_name)}</td><td class="header-label">Venue:</td><td>${esc(report.venue)}</td></tr>
<tr><td class="header-label">Programme Name:</td><td>${esc(report.programme_name)}</td><td class="header-label">Module (US Covered):</td><td>${esc(report.module_us_covered)}</td></tr>
<tr><td class="header-label">Start Date:</td><td>${esc(report.start_date)}</td><td class="header-label">End Date:</td><td>${esc(report.end_date)}</td></tr>
</table>

<h2>1. Content Covered in Assessment Block</h2>
<p class="section-desc">The following unit standards were covered in the block and should be communicated to relevant parties.</p>
<table>
<tr><th>Unit Standard Code</th><th>Unit Standard Title</th><th style="text-align:center">Level</th><th style="text-align:center">Credits</th></tr>
${unitStandards.map(u => `<tr><td>${esc(u.code)}</td><td>${esc(u.title)}</td><td style="text-align:center">${u.level}</td><td style="text-align:center">${u.credits}</td></tr>`).join("")}
<tr><td><b>Total Credits</b></td><td></td><td></td><td style="text-align:center"><b>${totalCredits}</b></td></tr>
</table>

<h2>2. Demonstrate Understanding of Outcomes-Based Assessment</h2>
${criteriaTableHTML(s2)}
<p><b>PROBLEMS & WEAKNESSES:</b></p><p>${esc(report.section2_problems)}</p>
<p><b>STRENGTHS:</b></p><p>${esc(report.section2_strengths)}</p>

<h2>3. Prepare Candidate for Assessments</h2>
${criteriaTableHTML(s3)}
<p><b>PROBLEMS & WEAKNESSES:</b></p><p>${esc(report.section3_problems)}</p>
<p><b>STRENGTHS:</b></p><p>${esc(report.section3_strengths)}</p>
<p><b>RECOMMENDATIONS:</b></p><p>${esc(report.section3_recommendations)}</p>
<p><b>EVIDENCE AVAILABLE:</b></p><p>${esc(report.section3_evidence)}</p>

<h2>4. Learners Assessed and Outcome</h2>
<table>
<tr><th>No.</th><th>Surname</th><th>Learner Names</th><th>Gender</th><th>ID Number</th><th>Outcome</th><th>Comments</th></tr>
${learners.map(l => `<tr><td>${l.no}</td><td>${esc(l.surname)}</td><td>${esc(l.names)}</td><td>${esc(l.gender)}</td><td>${esc(l.id_number)}</td><td>${esc(l.outcome)}</td><td>${esc(l.comments)}</td></tr>`).join("")}
</table>

<h2>5. Learner with Difficulties</h2>
<table>
<tr><td style="width:50%"><b>Learner with Difficulties:</b><br/>${esc(report.section5_difficulties) || "Nil"}</td>
<td><b>Conflict Arising:</b><br/>${esc(report.section5_conflicts) || "Nil"}</td></tr>
</table>
<p><b>Mentor Update:</b></p><p>${esc(report.section5_mentor_update)}</p>
<div class="declaration">${esc(report.section5_declaration)}</div>

<br/><br/>
<table style="border:none">
<tr style="border:none">
<td style="border:none;width:50%"><b>Assessor Signature:</b><br/><div class="sig-box"></div><br/>Date: ${esc(report.assessor_signature_date)}</td>
<td style="border:none;width:50%"><b>Admin Signature:</b><br/><div class="sig-box"></div><br/>Date: ${esc(report.admin_signature_date)}</td>
</tr></table>
</body></html>`;
}

function generateExcelContent(report: any, unitStandards: any[], totalCredits: number): string {
  const sep = "\t";
  const lines: string[] = [];
  const mode = report.report_mode === "learner" ? "Per Learner" : "Cohort";

  lines.push("ASSESSOR FEEDBACK REPORT");
  lines.push(`Report Mode:${sep}${mode}`);
  lines.push("");
  lines.push(`Assessor Name${sep}${report.assessor_name || ""}${sep}Date of Submission${sep}${report.submission_date || ""}`);
  lines.push(`Client Name${sep}${report.client_name || ""}${sep}Venue${sep}${report.venue || ""}`);
  lines.push(`Programme Name${sep}${report.programme_name || ""}${sep}Module (US Covered)${sep}${report.module_us_covered || ""}`);
  lines.push(`Start Date${sep}${report.start_date || ""}${sep}End Date${sep}${report.end_date || ""}`);
  lines.push("");

  lines.push("1. CONTENT COVERED IN ASSESSMENT BLOCK");
  lines.push(`Unit Standard Code${sep}Unit Standard Title${sep}Level${sep}Credits`);
  unitStandards.forEach(u => lines.push(`${u.code}${sep}${u.title}${sep}${u.level}${sep}${u.credits}`));
  lines.push(`Total Credits${sep}${sep}${sep}${totalCredits}`);
  lines.push("");

  lines.push("2. DEMONSTRATE UNDERSTANDING OF OUTCOMES-BASED ASSESSMENT");
  lines.push(`Criteria${sep}Yes${sep}No${sep}Comments`);
  ((report.section2_criteria || []) as CriterionItem[]).forEach(c =>
    lines.push(`${c.criterion}${sep}${c.yes ? "Yes" : ""}${sep}${c.no ? "No" : ""}${sep}${c.comments}`)
  );
  lines.push(`Problems & Weaknesses:${sep}${report.section2_problems || ""}`);
  lines.push(`Strengths:${sep}${report.section2_strengths || ""}`);
  lines.push("");

  lines.push("3. PREPARE CANDIDATE FOR ASSESSMENTS");
  lines.push(`Criteria${sep}Yes${sep}No${sep}Comments`);
  ((report.section3_criteria || []) as CriterionItem[]).forEach(c =>
    lines.push(`${c.criterion}${sep}${c.yes ? "Yes" : ""}${sep}${c.no ? "No" : ""}${sep}${c.comments}`)
  );
  lines.push(`Problems & Weaknesses:${sep}${report.section3_problems || ""}`);
  lines.push(`Strengths:${sep}${report.section3_strengths || ""}`);
  lines.push(`Recommendations:${sep}${report.section3_recommendations || ""}`);
  lines.push(`Evidence Available:${sep}${report.section3_evidence || ""}`);
  lines.push("");

  lines.push("4. LEARNERS ASSESSED AND OUTCOME");
  lines.push(`No.${sep}Surname${sep}Learner Names${sep}Gender${sep}ID Number${sep}Outcome${sep}Comments`);
  ((report.section4_learners || []) as LearnerOutcome[]).forEach(l =>
    lines.push(`${l.no}${sep}${l.surname}${sep}${l.names}${sep}${l.gender}${sep}${l.id_number}${sep}${l.outcome}${sep}${l.comments}`)
  );
  lines.push("");

  lines.push("5. LEARNER WITH DIFFICULTIES");
  lines.push(`Learner with Difficulties:${sep}${report.section5_difficulties || "Nil"}`);
  lines.push(`Conflict Arising:${sep}${report.section5_conflicts || "Nil"}`);
  lines.push(`Mentor Update:${sep}${report.section5_mentor_update || ""}`);
  lines.push(`Declaration:${sep}${report.section5_declaration || ""}`);

  return "\uFEFF" + lines.join("\n");
}

function criteriaTableHTML(criteria: CriterionItem[]): string {
  return `<table>
<tr><th style="width:45%">Criteria</th><th style="width:8%;text-align:center">Yes</th><th style="width:8%;text-align:center">No</th><th>Comments</th></tr>
${criteria.map(c => `<tr>
<td><b>${esc(c.criterion)}</b>${c.description ? `<br/><span style="font-size:9pt;color:#555">${esc(c.description)}</span>` : ""}</td>
<td style="text-align:center">${c.yes ? "✓" : ""}</td>
<td style="text-align:center">${c.no ? "✓" : ""}</td>
<td>${esc(c.comments)}</td></tr>`).join("")}
</table>`;
}

function esc(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
