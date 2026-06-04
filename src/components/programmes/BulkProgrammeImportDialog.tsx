import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProgrammeTypes } from "@/hooks/useProgrammeTypes";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ParsedRow {
  title: string;
  description: string;
  programme_type: string;
  credits: string;
  nqf_level: string;
  duration_months: string;
}

interface ValidatedRow extends ParsedRow {
  programme_type_id: string | null;
  errors: string[];
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const row: any = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return {
      title: row.title || row.programme_name || "",
      description: row.description || "",
      programme_type: row.programme_type || row.type || "",
      credits: row.credits || "",
      nqf_level: row.nqf_level || row.nqf || "",
      duration_months: row.duration_months || row.duration || "",
    };
  });
}

export default function BulkProgrammeImportDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: programmeTypes = [] } = useProgrammeTypes();
  const { user } = useAuth();
  const qc = useQueryClient();

  const reset = () => { setRows([]); setResults(null); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const parsed = parseCSV(evt.target?.result as string);
      const validated = parsed.map(r => validate(r));
      setRows(validated);
      setResults(null);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const validate = (row: ParsedRow): ValidatedRow => {
    const errors: string[] = [];
    if (!row.title.trim()) errors.push("Title is required");
    if (row.title.length > 200) errors.push("Title too long (max 200)");
    const matchedType = programmeTypes.find(
      (t: any) => t.is_active && t.name.toLowerCase() === row.programme_type.toLowerCase()
    );
    if (!row.programme_type.trim()) errors.push("Programme Type is required");
    else if (!matchedType) errors.push(`Unknown type: "${row.programme_type}"`);
    if (row.credits && isNaN(Number(row.credits))) errors.push("Credits must be a number");
    if (row.nqf_level && isNaN(Number(row.nqf_level))) errors.push("NQF Level must be a number");
    if (row.duration_months && isNaN(Number(row.duration_months))) errors.push("Duration must be a number");
    return { ...row, programme_type_id: matchedType?.id ?? null, errors };
  };

  const validRows = rows.filter(r => r.errors.length === 0);
  const invalidRows = rows.filter(r => r.errors.length > 0);

  const handleImport = async () => {
    if (!validRows.length || !user) return;
    setImporting(true);
    let success = 0, failed = 0;
    for (const row of validRows) {
      try {
        const payload: any = {
          title: row.title.trim(),
          description: row.description.trim() || null,
          programme_type_id: row.programme_type_id!,
          status: "draft",
          created_by: user.id,
          credits: row.credits ? Number(row.credits) : null,
          nqf_level: row.nqf_level ? Number(row.nqf_level) : null,
          duration_months: row.duration_months ? Number(row.duration_months) : null,
        };
        const { error } = await supabase.from("programmes").insert(payload);
        if (error) throw error;
        success++;
      } catch {
        failed++;
      }
    }
    setResults({ success, failed });
    setImporting(false);
    qc.invalidateQueries({ queryKey: ["programmes"] });
    if (success > 0) toast.success(`${success} programme(s) imported successfully`);
    if (failed > 0) toast.error(`${failed} programme(s) failed to import`);
  };

  const downloadTemplate = () => {
    const csv = "title,description,programme_type,credits,nqf_level,duration_months\nExample Programme,A sample description,Occupational Qualification (QCTO),120,5,12";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "programme_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Bulk Programme Import
          </DialogTitle>
        </DialogHeader>

        {rows.length === 0 && !results && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file to import multiple programmes at once. All programmes will be created in <Badge variant="outline" className="ml-1">Draft</Badge> status.
            </p>
            <div
              className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Click to upload CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">Required columns: title, programme_type</p>
              <p className="text-xs text-muted-foreground">Optional: description, credits, nqf_level, duration_months</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">
              <Download className="w-3.5 h-3.5 mr-2" />
              Download CSV Template
            </Button>
          </div>
        )}

        {rows.length > 0 && !results && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-xs">{rows.length} rows parsed</Badge>
                {validRows.length > 0 && (
                  <Badge className="bg-success/10 text-success border-success/20 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> {validRows.length} valid
                  </Badge>
                )}
                {invalidRows.length > 0 && (
                  <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" /> {invalidRows.length} errors
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[340px]">
                <table className="w-full text-xs">
                  <thead className="bg-secondary sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Title</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Type</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Credits</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">NQF</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Months</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r, i) => (
                      <tr key={i} className={r.errors.length > 0 ? "bg-destructive/5" : ""}>
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-foreground max-w-[180px] truncate">{r.title || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground max-w-[140px] truncate">{r.programme_type || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.credits || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.nqf_level || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.duration_months || "—"}</td>
                        <td className="px-3 py-2">
                          {r.errors.length === 0 ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                          ) : (
                            <span className="text-destructive text-[10px]" title={r.errors.join(", ")}>
                              {r.errors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleImport} disabled={validRows.length === 0 || importing}>
                {importing ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Importing...</span>
                ) : (
                  `Import ${validRows.length} Programme${validRows.length !== 1 ? "s" : ""}`
                )}
              </Button>
            </div>
          </div>
        )}

        {results && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
            <div>
              <p className="text-lg font-semibold text-foreground">Import Complete</p>
              <p className="text-sm text-muted-foreground mt-1">
                {results.success} imported successfully{results.failed > 0 ? `, ${results.failed} failed` : ""}
              </p>
            </div>
            <Button onClick={() => { setOpen(false); reset(); }}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
