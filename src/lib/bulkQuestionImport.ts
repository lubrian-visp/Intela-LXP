/**
 * Bulk question import parsers for CSV, QTI 2.1 XML, and GIFT format.
 * Output normalised to an internal ParsedQuestion shape that the
 * Assessment Builder V2 can persist via useCreateQuizQuestion.
 */

import { parseQtiXml } from "./qtiUtils";

export interface ParsedQuestion {
  question_text: string;
  question_type:
    | "multiple_choice"
    | "true_false"
    | "short_answer"
    | "matching"
    | "ordering"
    | "fill_blank"
    | "numerical";
  points: number;
  explanation?: string | null;
  options?: { option_text: string; is_correct: boolean }[];
  metadata?: Record<string, unknown>;
}

/* ---------------- CSV ---------------- */
/**
 * Expected columns (header row required, case-insensitive):
 *   question_text, question_type, points, correct, options, explanation
 *
 * - `options` is pipe-separated for MCQ / true_false (e.g. "Paris|London|Rome")
 * - `correct` is the option text (or "True"/"False"); for numerical it's the
 *   expected number; for fill_blank it's pipe-separated accepted answers.
 */
export function parseCsv(text: string): ParsedQuestion[] {
  const rows = csvToRows(text.trim());
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  const out: ParsedQuestion[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.every((c) => !c.trim())) continue;
    const qText = r[idx("question_text")] || "";
    const qType = (r[idx("question_type")] || "multiple_choice").toLowerCase().trim();
    const points = Number(r[idx("points")] || 1) || 1;
    const correct = r[idx("correct")] || "";
    const optsRaw = r[idx("options")] || "";
    const explanation = idx("explanation") >= 0 ? r[idx("explanation")] : null;

    const base: ParsedQuestion = {
      question_text: qText,
      question_type: "multiple_choice",
      points,
      explanation: explanation || null,
    };

    if (qType === "true_false" || qType === "true/false" || qType === "tf") {
      base.question_type = "true_false";
      base.options = [
        { option_text: "True", is_correct: correct.toLowerCase() === "true" },
        { option_text: "False", is_correct: correct.toLowerCase() === "false" },
      ];
    } else if (qType === "short_answer" || qType === "short" || qType === "essay") {
      base.question_type = "short_answer";
    } else if (qType === "numerical") {
      base.question_type = "numerical";
      base.metadata = { answer: Number(correct) || 0, tolerance: 0, unit: "" };
    } else if (qType === "fill_blank" || qType === "fill_in_blank") {
      base.question_type = "fill_blank";
      base.metadata = {
        blanks: [{ answers: correct.split("|").map((s) => s.trim()), case_sensitive: false }],
      };
    } else if (qType === "matching") {
      base.question_type = "matching";
      const pairs = optsRaw.split("|").map((p) => {
        const [left, right] = p.split("=>").map((s) => s.trim());
        return { left: left || "", right: right || "" };
      });
      base.metadata = { pairs };
    } else if (qType === "ordering") {
      base.question_type = "ordering";
      base.metadata = { items: optsRaw.split("|").map((s) => s.trim()).filter(Boolean) };
    } else {
      // multiple_choice
      base.question_type = "multiple_choice";
      const corrects = correct.split("|").map((c) => c.trim().toLowerCase());
      base.options = optsRaw
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((opt) => ({ option_text: opt, is_correct: corrects.includes(opt.toLowerCase()) }));
    }

    if (base.question_text) out.push(base);
  }
  return out;
}

/** Minimal RFC4180-ish CSV row parser handling quoted fields and embedded commas. */
function csvToRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/* ---------------- GIFT ---------------- */
/**
 * Subset of Moodle GIFT supported:
 *   ::Title:: Question text { =correct ~wrong ~wrong }      (MCQ)
 *   Question {T}  / {F}                                      (true/false)
 *   Question {#42:0.5}                                       (numerical, tolerance)
 *   Question {=acc1 =acc2}                                   (short answer / fill)
 * Blank lines separate questions. Lines starting with // are comments.
 */
export function parseGift(text: string): ParsedQuestion[] {
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b && !b.startsWith("//"));
  const out: ParsedQuestion[] = [];

  for (const block of blocks) {
    const cleaned = block.replace(/^\/\/.*$/gm, "").trim();
    const m = cleaned.match(/^(?:::([^:]+)::)?\s*([\s\S]*?)\{([\s\S]*?)\}\s*$/);
    if (!m) continue;
    const stem = m[2].trim();
    const body = m[3].trim();

    if (/^T$/i.test(body) || /^TRUE$/i.test(body)) {
      out.push({
        question_text: stem, question_type: "true_false", points: 1,
        options: [
          { option_text: "True", is_correct: true },
          { option_text: "False", is_correct: false },
        ],
      });
      continue;
    }
    if (/^F$/i.test(body) || /^FALSE$/i.test(body)) {
      out.push({
        question_text: stem, question_type: "true_false", points: 1,
        options: [
          { option_text: "True", is_correct: false },
          { option_text: "False", is_correct: true },
        ],
      });
      continue;
    }
    if (body.startsWith("#")) {
      const num = body.slice(1).trim();
      const [val, tol] = num.split(":").map((s) => s.trim());
      out.push({
        question_text: stem, question_type: "numerical", points: 1,
        metadata: { answer: Number(val) || 0, tolerance: Number(tol) || 0, unit: "" },
      });
      continue;
    }

    // Choice / short answer
    const tokens = body.match(/[=~][^=~]+/g) || [];
    const opts = tokens.map((t) => ({
      option_text: t.slice(1).trim(),
      is_correct: t.startsWith("="),
    }));
    const onlyEquals = opts.length > 0 && opts.every((o) => o.is_correct);
    if (onlyEquals) {
      out.push({
        question_text: stem, question_type: "fill_blank", points: 1,
        metadata: {
          blanks: [{
            answers: opts.map((o) => o.option_text),
            case_sensitive: false,
          }],
        },
      });
    } else {
      out.push({ question_text: stem, question_type: "multiple_choice", points: 1, options: opts });
    }
  }
  return out;
}

/* ---------------- QTI bridge ---------------- */
/** Adapt the existing qtiUtils parser into ParsedQuestion shape. */
export function parseQti(xml: string): ParsedQuestion[] {
  const items = parseQtiXml(xml);
  return items.map((q) => {
    const type = (q.question_type || "short_answer") as string;
    const base: ParsedQuestion = {
      question_text: q.question_text || "",
      question_type: "short_answer",
      points: Number(q.points || 1),
    };
    if (type === "multiple_choice" || type === "multiple_select") {
      base.question_type = "multiple_choice";
      base.options = (q.options as any[] | undefined)?.map((o) => ({
        option_text: o.option_text || "",
        is_correct: !!o.is_correct,
      })) || [];
    } else if (type === "true_false") {
      base.question_type = "true_false";
      base.options = (q.options as any[] | undefined)?.map((o) => ({
        option_text: o.option_text || "",
        is_correct: !!o.is_correct,
      })) || [];
    } else if (type === "matching") {
      base.question_type = "matching";
      base.metadata = {
        pairs: (q.matching_pairs as any[] | undefined)?.map((p) => ({
          left: p.left || p.term || "",
          right: p.right || p.definition || "",
        })) || [],
      };
    } else if (type === "ordering") {
      base.question_type = "ordering";
      base.metadata = {
        items: (q.ordering_items as any[] | undefined)?.map((i: any) =>
          typeof i === "string" ? i : i.text || ""
        ) || [],
      };
    } else if (type === "fill_in_blank") {
      base.question_type = "fill_blank";
      base.metadata = { blanks: [{ answers: [""], case_sensitive: false }] };
    } else {
      base.question_type = "short_answer";
    }
    return base;
  });
}

/** Auto-detect format from filename / content and parse. */
export function parseBulkImport(filename: string, content: string): ParsedQuestion[] {
  const name = filename.toLowerCase();
  if (name.endsWith(".csv")) return parseCsv(content);
  if (name.endsWith(".xml") || content.trim().startsWith("<")) return parseQti(content);
  if (name.endsWith(".gift") || name.endsWith(".txt")) return parseGift(content);
  // Last-resort sniff
  if (content.includes("{") && content.includes("}")) return parseGift(content);
  return parseCsv(content);
}
