import { useState, useRef } from "react";
import {
  Upload, FileText, Sparkles, CheckCircle2, AlertTriangle,
  ChevronRight, Loader2, BookOpen, X, RotateCcw,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAICurriculumImport, type AICurriculumResult, type AIPathway } from "@/hooks/useAICurriculumImport";
import { cn } from "@/lib/utils";

interface AICurriculumImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programmeId: string;
  programmeTitle: string;
  programmeTypeConfig?: Record<string, any>;
  onImportComplete: () => void;
}

type Step = "upload" | "processing" | "preview" | "committing" | "done";

const PHASE_COLORS: Record<string, string> = {
  knowledge: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  practical: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  workplace: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const BLOCK_TYPE_ICONS: Record<string, string> = {
  text: "📝", video: "🎬", document: "📄", assessment: "✅",
  assignment: "📋", discussion: "💬", attendance_log: "📊",
};

export function AICurriculumImportDialog({
  open, onOpenChange, programmeId, programmeTitle,
  programmeTypeConfig, onImportComplete,
}: AICurriculumImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isProcessing, progress, result, error,
    parseDocument, commitToBuilder, reset,
  } = useAICurriculumImport();

  const handleFileSelect = (file: File) => {
    const allowed = [
      "text/plain", "text/markdown", "text/csv",
      "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!allowed.includes(file.type) && !["txt", "md", "csv", "pdf", "doc", "docx"].includes(ext || "")) {
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    setStep("processing");
    await parseDocument(selectedFile, programmeId, programmeTitle, programmeTypeConfig);
    setStep("preview");
  };

  const handleCommit = async () => {
    if (!result) return;
    setStep("committing");
    const success = await commitToBuilder(programmeId, result);
    if (success) {
      setStep("done");
    } else {
      setStep("preview");
    }
  };

  const handleClose = () => {
    reset();
    setStep("upload");
    setSelectedFile(null);
    onOpenChange(false);
    if (step === "done") onImportComplete();
  };

  const handleRetry = () => {
    reset();
    setStep("upload");
    setSelectedFile(null);
  };

  const totalModules = result?.pathways.reduce((sum, p) => sum + p.modules.length, 0) ?? 0;
  const totalBlocks = result?.pathways.reduce(
    (sum, p) => sum + p.modules.reduce((ms, m) => ms + (m.content_blocks?.length ?? 0), 0), 0
  ) ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Curriculum Import
          </DialogTitle>
          <DialogDescription>
            Upload a curriculum document and let AI generate your programme structure automatically.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {/* Step indicator */}
        <div className="px-6 py-3 flex items-center gap-2 text-xs">
          {(["Upload", "Process", "Preview", "Import"] as const).map((label, i) => {
            const stepMap: Step[] = ["upload", "processing", "preview", "committing"];
            const isActive = stepMap.indexOf(step) >= i || step === "done";
            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
                <span className={cn(
                  "px-2 py-0.5 rounded-full font-medium transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        <Separator />

        <div className="flex-1 overflow-hidden">
          {/* Upload Step */}
          {step === "upload" && (
            <div className="p-6 space-y-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                  selectedFile && "border-primary/30 bg-primary/5"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".txt,.md,.csv,.pdf,.doc,.docx"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileText className="w-10 h-10 mx-auto text-primary" />
                    <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Click to change
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground/30" />
                    <p className="text-sm font-medium text-foreground">
                      Drop your curriculum file here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports TXT, MD, CSV, PDF, DOC, DOCX (max 20MB)
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="text-xs font-semibold text-foreground">Tips for best results:</h4>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Include clear headings for modules and topics</li>
                  <li>Mention learning outcomes and objectives</li>
                  <li>Specify durations and credit values if available</li>
                  <li>Plain text (.txt, .md) files produce the best results</li>
                </ul>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === "processing" && (
            <div className="p-6 flex flex-col items-center justify-center min-h-[300px] space-y-6">
              <div className="relative">
                <Sparkles className="w-12 h-12 text-primary animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-foreground">{progress || "Processing..."}</p>
                <p className="text-xs text-muted-foreground">
                  This may take 30-60 seconds depending on document length
                </p>
              </div>
              <Progress value={undefined} className="w-48" />
            </div>
          )}

          {/* Preview Step */}
          {step === "preview" && result && (
            <ScrollArea className="max-h-[400px]">
              <div className="p-6 space-y-4">
                {/* Summary */}
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      AI Analysis Complete
                    </h4>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-[10px]">{result.pathways.length} Pathways</Badge>
                      <Badge variant="outline" className="text-[10px]">{totalModules} Modules</Badge>
                      <Badge variant="outline" className="text-[10px]">{totalBlocks} Content Blocks</Badge>
                    </div>
                  </div>
                  {result.summary && (
                    <p className="text-xs text-muted-foreground">{result.summary}</p>
                  )}
                </div>

                {/* Structure Preview */}
                {result.pathways.map((pathway, pi) => (
                  <PathwayPreview key={pi} pathway={pathway} index={pi} />
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Preview with error */}
          {step === "preview" && !result && error && (
            <div className="p-6 flex flex-col items-center justify-center min-h-[300px] space-y-4">
              <AlertTriangle className="w-12 h-12 text-destructive/50" />
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-destructive">Import Failed</p>
                <p className="text-xs text-muted-foreground max-w-md">{error}</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleRetry} className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Try Again
              </Button>
            </div>
          )}

          {/* Committing Step */}
          {step === "committing" && (
            <div className="p-6 flex flex-col items-center justify-center min-h-[300px] space-y-6">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-foreground">{progress || "Importing..."}</p>
                <p className="text-xs text-muted-foreground">
                  Creating pathways, modules, and content blocks...
                </p>
              </div>
            </div>
          )}

          {/* Done Step */}
          {step === "done" && (
            <div className="p-6 flex flex-col items-center justify-center min-h-[300px] space-y-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-foreground">Import Successful!</p>
                <p className="text-sm text-muted-foreground">
                  {totalModules} modules and {totalBlocks} content blocks have been created.
                  You can now review and edit them in the builder.
                </p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            {step === "done" ? "Close" : "Cancel"}
          </Button>

          <div className="flex items-center gap-2">
            {step === "upload" && (
              <Button size="sm" disabled={!selectedFile} onClick={handleProcess} className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Analyse with AI
              </Button>
            )}
            {step === "preview" && result && (
              <>
                <Button size="sm" variant="outline" onClick={handleRetry} className="gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Re-analyse
                </Button>
                <Button size="sm" onClick={handleCommit} className="gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Import to Builder
                </Button>
              </>
            )}
            {step === "done" && (
              <Button size="sm" onClick={handleClose} className="gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> View in Builder
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PathwayPreview({ pathway, index }: { pathway: AIPathway; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Badge className={cn("text-[10px] border", PHASE_COLORS[pathway.phase] || "bg-muted")}>
            {pathway.phase}
          </Badge>
          <span className="text-sm font-medium text-foreground">{pathway.title}</span>
          <span className="text-xs text-muted-foreground">({pathway.modules.length} modules)</span>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", expanded && "rotate-90")} />
      </button>

      {expanded && (
        <div className="border-t border-border divide-y divide-border/50">
          {pathway.modules.map((mod, mi) => (
            <div key={mi} className="p-3 pl-6 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-medium">{mod.title}</span>
                  <Badge variant="outline" className="text-[9px]">{mod.module_type}</Badge>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{mod.duration_hours}h</span>
                  <span>·</span>
                  <span>{mod.credits} credits</span>
                </div>
              </div>
              {mod.description && (
                <p className="text-xs text-muted-foreground pl-5.5">{mod.description}</p>
              )}
              {mod.content_blocks && mod.content_blocks.length > 0 && (
                <div className="pl-5.5 flex flex-wrap gap-1 mt-1">
                  {mod.content_blocks.map((block, bi) => (
                    <span key={bi} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                      {BLOCK_TYPE_ICONS[block.block_type] || "📦"} {block.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
