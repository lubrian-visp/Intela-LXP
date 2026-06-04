import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileText, X, Download } from "lucide-react";
import { parseBulkImport, type ParsedQuestion } from "@/lib/bulkQuestionImport";
import { useCreateQuizQuestion } from "@/hooks/useQuizBuilder";
import { toast } from "sonner";

const SAMPLE_CSV = `question_text,question_type,points,correct,options,explanation
"What is 2+2?",multiple_choice,1,4,2|3|4|5,Basic arithmetic
"The sky is blue",true_false,1,True,,
"Capital of France?",short_answer,2,,,
"Boiling point of water (°C)?",numerical,1,100,,
"H2O is ___",fill_blank,1,water|H2O,,
"Match elements",matching,2,,H=>Hydrogen|O=>Oxygen,
"Order of operations",ordering,2,,Parentheses|Exponents|Multiplication|Addition,`;

interface Props {
  assessmentId: string;
  startOrder: number;
  onClose: () => void;
}

export function BulkImportDialog({ assessmentId, startOrder, onClose }: Props) {
  const [filename, setFilename] = useState("");
  const [parsed, setParsed] = useState<ParsedQuestion[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateQuizQuestion();

  const handleFile = async (file: File) => {
    setError(null);
    setFilename(file.name);
    try {
      const text = await file.text();
      const items = parseBulkImport(file.name, text);
      if (items.length === 0) {
        setError("No questions detected in this file.");
        setParsed([]);
        return;
      }
      setParsed(items);
    } catch (e: any) {
      setError(e.message || "Failed to parse file");
    }
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "questions-sample.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    let ok = 0; let fail = 0;
    for (let i = 0; i < parsed.length; i++) {
      const q = parsed[i];
      try {
        await create.mutateAsync({
          assessment_id: assessmentId,
          question_text: q.question_text,
          question_type: q.question_type,
          points: q.points,
          sequence_order: startOrder + i,
          explanation: q.explanation || undefined,
          metadata: q.metadata as any,
          options: q.options,
        });
        ok++;
      } catch (e) { fail++; }
    }
    setImporting(false);
    toast.success(`Imported ${ok}/${parsed.length} question${parsed.length === 1 ? "" : "s"}${fail ? ` (${fail} failed)` : ""}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border/50 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div>
            <h3 className="font-semibold text-foreground">Bulk import questions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">CSV · QTI 2.1 XML · GIFT (Moodle)</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={importing}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="border-2 border-dashed border-border/60 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
            <Label htmlFor="bulk-file" className="cursor-pointer">
              <span className="text-sm font-medium text-primary hover:underline">Choose a file</span>
              <span className="text-sm text-muted-foreground"> or drag and drop</span>
              <input
                id="bulk-file"
                type="file"
                accept=".csv,.xml,.txt,.gift"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </Label>
            <p className="text-xs text-muted-foreground mt-2">.csv, .xml (QTI 2.1), .gift, .txt</p>
            {filename && (
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-foreground bg-muted/40 px-2 py-1 rounded">
                <FileText className="w-3 h-3" /> {filename}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={downloadSample}>
              <Download className="w-3.5 h-3.5 mr-1" /> Download CSV template
            </Button>
            {parsed.length > 0 && (
              <Badge variant="secondary">{parsed.length} question{parsed.length === 1 ? "" : "s"} detected</Badge>
            )}
          </div>

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</div>
          )}

          {parsed.length > 0 && (
            <div className="border border-border/50 rounded-lg max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 sticky top-0">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Question</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 50).map((q, i) => (
                    <tr key={i} className="border-t border-border/40">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 truncate max-w-md">{q.question_text}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{q.question_type}</Badge></td>
                      <td className="px-3 py-2">{q.points}</td>
                    </tr>
                  ))}
                  {parsed.length > 50 && (
                    <tr><td colSpan={4} className="px-3 py-2 text-center text-muted-foreground">… and {parsed.length - 50} more</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border/50">
          <Button variant="outline" onClick={onClose} disabled={importing}>Cancel</Button>
          <Button onClick={handleImport} disabled={parsed.length === 0 || importing}>
            {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
            Import {parsed.length > 0 ? `${parsed.length} question${parsed.length === 1 ? "" : "s"}` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
