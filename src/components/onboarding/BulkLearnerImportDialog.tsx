import { useState, useMemo } from "react";
import { Upload, Download, Users, AlertTriangle, CheckCircle2, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProgrammesList } from "@/hooks/useProgrammesList";
import { useCohorts } from "@/hooks/useCoreData";
import { useQueryClient } from "@tanstack/react-query";
import { maskNationalId } from "@/lib/privacyUtils";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ParsedRow {
  full_name: string;
  email: string;
  phone?: string;
  national_id?: string;
  date_of_birth?: string;
  gender?: string;
  country?: string;
  education_level?: string;
  error?: string;
}

const CSV_TEMPLATE_HEADERS = [
  "full_name", "email", "phone", "national_id", "date_of_birth", "gender", "country", "education_level"
];

function downloadTemplate() {
  const csv = CSV_TEMPLATE_HEADERS.join(",") + "\nJohn Doe,john@example.com,+27821234567,9001015026081,1990-01-01,male,South Africa,matric";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "learner_bulk_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const nameIdx = headers.indexOf("full_name");
  const emailIdx = headers.indexOf("email");

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = line.split(",").map(c => c.trim());
    const row: ParsedRow = {
      full_name: cols[nameIdx] || "",
      email: cols[emailIdx] || "",
      phone: cols[headers.indexOf("phone")] || undefined,
      national_id: cols[headers.indexOf("national_id")] || undefined,
      date_of_birth: cols[headers.indexOf("date_of_birth")] || undefined,
      gender: cols[headers.indexOf("gender")] || undefined,
      country: cols[headers.indexOf("country")] || undefined,
      education_level: cols[headers.indexOf("education_level")] || undefined,
    };
    if (!row.full_name) row.error = "Missing full_name";
    else if (!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) row.error = "Invalid email";
    return row;
  });
}

export default function BulkLearnerImportDialog({ open, onClose }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const { data: programmes = [] } = useProgrammesList();
  const { data: allCohorts = [] } = useCohorts();
  const queryClient = useQueryClient();

  const cohorts = useMemo(() =>
    allCohorts.filter(c => c.programme_id === programmeId && c.status === "active"),
    [allCohorts, programmeId]
  );

  const validRows = rows.filter(r => !r.error);
  const invalidRows = rows.filter(r => !!r.error);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (validRows.length === 0 || !programmeId) return;
    setIsSubmitting(true);
    setResults(null);

    try {
      const programmeName = programmes.find(p => p.id === programmeId)?.title || "";

      const { data, error } = await supabase.functions.invoke("bulk-learner-import", {
        body: {
          learners: validRows.map(r => ({
            full_name: r.full_name,
            email: r.email,
            phone: r.phone || null,
            national_id: r.national_id || null,
            date_of_birth: r.date_of_birth || null,
            gender: r.gender || null,
            country: r.country || null,
            education_level: r.education_level || null,
          })),
          programme_id: programmeId,
          programme_name: programmeName,
          cohort_id: cohortId || null,
          auto_approve: autoApprove,
        },
      });

      if (error) throw error;

      setResults(data);
      queryClient.invalidateQueries({ queryKey: ["learner_registrations"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
      queryClient.invalidateQueries({ queryKey: ["enrolments"] });

      if (data.success > 0) {
        toast.success(`${data.success} learner(s) imported successfully.`);
      }
      if (data.failed > 0) {
        toast.error(`${data.failed} learner(s) failed.`);
      }
    } catch (err: any) {
      toast.error(err.message || "Bulk import failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRows([]);
    setFileName("");
    setProgrammeId("");
    setCohortId("");
    setAutoApprove(false);
    setResults(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            Bulk Learner Import
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Step 1: Download template & upload */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> Download Template
            </Button>
            <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg px-4 py-2 hover:bg-muted/50 transition-colors text-xs">
              <Upload className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{fileName || "Upload CSV file…"}</span>
              <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
            </label>
          </div>

          {/* Step 2: Configure */}
          {rows.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Programme *</Label>
                <Select value={programmeId} onValueChange={v => { setProgrammeId(v); setCohortId(""); }}>
                  <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select programme" /></SelectTrigger>
                  <SelectContent>
                    {programmes.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cohort {autoApprove ? "(required for enrolment)" : "(optional)"}</Label>
                <Select value={cohortId} onValueChange={setCohortId} disabled={!programmeId}>
                  <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select cohort" /></SelectTrigger>
                  <SelectContent>
                    {cohorts.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                    {cohorts.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">No active cohorts for this programme</div>}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch id="auto-approve" checked={autoApprove} onCheckedChange={setAutoApprove} />
                <Label htmlFor="auto-approve" className="text-xs cursor-pointer">Auto-approve & enrol</Label>
              </div>
            </div>
          )}

          {/* Validation summary */}
          {rows.length > 0 && (
            <div className="flex gap-3 text-xs">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="w-3 h-3 text-success" /> {validRows.length} valid
              </Badge>
              {invalidRows.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" /> {invalidRows.length} invalid
                </Badge>
              )}
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && (
            <ScrollArea className="max-h-64 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Phone</TableHead>
                    <TableHead className="text-xs">ID Number</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 100).map((r, i) => (
                    <TableRow key={i} className={r.error ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs py-1.5">{r.full_name || "—"}</TableCell>
                      <TableCell className="text-xs py-1.5">{r.email || "—"}</TableCell>
                      <TableCell className="text-xs py-1.5">{r.phone || "—"}</TableCell>
                      <TableCell className="text-xs py-1.5 font-mono tracking-wider">{maskNationalId(r.national_id)}</TableCell>
                      <TableCell className="text-xs py-1.5">
                        {r.error ? (
                          <span className="text-destructive flex items-center gap-1">
                            <X className="w-3 h-3" /> {r.error}
                          </span>
                        ) : (
                          <span className="text-success flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Valid
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {/* Results */}
          {results && (
            <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
              <p className="text-sm font-medium">Import Results</p>
              <div className="flex gap-3 text-xs">
                <Badge variant="secondary" className="gap-1 bg-success/10 text-success">
                  <CheckCircle2 className="w-3 h-3" /> {results.success} succeeded
                </Badge>
                {results.failed > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" /> {results.failed} failed
                  </Badge>
                )}
              </div>
              {results.errors?.length > 0 && (
                <div className="text-xs text-destructive space-y-0.5 max-h-32 overflow-y-auto">
                  {results.errors.map((e, i) => <p key={i}>• {e}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} size="sm">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={validRows.length === 0 || !programmeId || isSubmitting || (autoApprove && !cohortId)}
            size="sm"
            className="gap-1.5"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Import {validRows.length > 0 ? `(${validRows.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
