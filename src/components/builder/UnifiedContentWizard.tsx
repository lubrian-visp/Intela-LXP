import { useState, useRef } from "react";
import {
  Upload, FileText, Sparkles, ClipboardPaste, ListTree, Type,
  Loader2, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle,
  BookOpen, X,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAICurriculumImport, type AICurriculumResult, type AIPathway } from "@/hooks/useAICurriculumImport";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UnifiedContentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programmeId: string;
  programmeTitle: string;
  programmeTypeConfig?: Record<string, any>;
  onImportComplete: () => void;
  onCreateSingleModule: (title: string) => void;
}

type InputMethod = "upload" | "paste_curriculum" | "paste_toc" | "title_only";
type Step = "choose" | "input" | "processing" | "preview" | "committing" | "done";

const INPUT_METHODS = [
  {
    id: "upload" as InputMethod,
    label: "Upload Curriculum",
    desc: "Upload a PDF, DOCX, or text file containing your curriculum",
    icon: Upload,
    colour: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "paste_curriculum" as InputMethod,
    label: "Paste Curriculum",
    desc: "Paste raw curriculum text for AI-powered structuring",
    icon: ClipboardPaste,
    colour: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  },
  {
    id: "paste_toc" as InputMethod,
    label: "Paste Table of Contents",
    desc: "Paste a structured TOC to auto-generate the programme skeleton",
    icon: ListTree,
    colour: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "title_only" as InputMethod,
    label: "Start from Title",
    desc: "Enter a title and let AI generate a complete programme structure",
    icon: Type,
    colour: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
];

const PHASE_COLORS: Record<string, string> = {
  knowledge: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  practical: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  workplace: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const BLOCK_TYPE_ICONS: Record<string, string> = {
  text: "📝", video: "🎬", document: "📄", assessment: "✅",
  assignment: "📋", discussion: "💬", attendance_log: "📊",
};

export function UnifiedContentWizard({
  open, onOpenChange, programmeId, programmeTitle,
  programmeTypeConfig, onImportComplete, onCreateSingleModule,
}: UnifiedContentWizardProps) {
  const [step, setStep] = useState<Step>("choose");
  const [method, setMethod] = useState<InputMethod | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isProcessing, progress, result, error,
    parseDocument, commitToBuilder, reset,
  } = useAICurriculumImport();

  const handleMethodSelect = (m: InputMethod) => {
    setMethod(m);
    if (m === "title_only") {
      setStep("input");
    } else if (m === "upload") {
      setStep("input");
    } else {
      setStep("input");
    }
  };

  const handleFileSelect = (file: File) => {
    const allowed = [
      "text/plain", "text/markdown", "text/csv",
      "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!allowed.includes(file.type) && !["txt", "md", "csv", "pdf", "doc", "docx"].includes(ext || "")) {
      toast.error("Unsupported file type. Please upload PDF, DOCX, TXT, MD, or CSV.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum 10MB.");
      return;
    }
    setSelectedFile(file);
  };

  const textToFile = (text: string, name: string): File => {
    return new File([text], name, { type: "text/plain" });
  };

  const handleProcess = async () => {
    setStep("processing");
    let fileToProcess: File | null = null;

    if (method === "upload" && selectedFile) {
      fileToProcess = selectedFile;
    } else if (method === "paste_curriculum") {
      fileToProcess = textToFile(pastedText, "pasted-curriculum.txt");
    } else if (method === "paste_toc") {
      const tocText = `TABLE OF CONTENTS / PROGRAMME OUTLINE:\n\n${pastedText}\n\nPlease generate a full programme structure from this table of contents, expanding each item into detailed modules with content blocks.`;
      fileToProcess = textToFile(tocText, "pasted-toc.txt");
    } else if (method === "title_only") {
      const titleText = `Generate a comprehensive programme structure for a course titled "${titleInput}". Create appropriate pathways, modules, and content blocks based on best practices for this subject area.`;
      fileToProcess = textToFile(titleText, "title-generation.txt");
    }

    if (!fileToProcess) {
      toast.error("No content to process");
      setStep("input");
      return;
    }

    try {
      await parseDocument(fileToProcess, programmeId, programmeTitle, programmeTypeConfig);
      setStep("preview");
    } catch {
      setStep("input");
    }
  };

  const handleCommit = async () => {
    if (!result) return;
    setStep("committing");
    try {
      const success = await commitToBuilder(programmeId, result);
      if (success) {
        onImportComplete();
        setStep("done");
      } else {
        toast.error(error || "Failed to commit structure to builder. Please try again.");
        setStep("preview");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to commit structure to builder. Please try again.");
      setStep("preview");
    }
  };

  const handleClose = () => {
    if (step === "done") onImportComplete();
    setStep("choose");
    setMethod(null);
    setPastedText("");
    setTitleInput("");
    setSelectedFile(null);
    reset();
    onOpenChange(false);
  };

  const handleTitleOnlySimple = () => {
    if (!titleInput.trim()) { toast.error("Please enter a title"); return; }
    onCreateSingleModule(titleInput.trim());
    handleClose();
  };

  const canProcess = () => {
    if (method === "upload") return !!selectedFile;
    if (method === "paste_curriculum" || method === "paste_toc") return pastedText.trim().length > 20;
    if (method === "title_only") return titleInput.trim().length > 3;
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4.5 h-4.5 text-accent" />
            {step === "choose" ? "How would you like to build your content?" :
             step === "input" ? INPUT_METHODS.find(m => m.id === method)?.label :
             step === "processing" ? "AI is structuring your content..." :
             step === "preview" ? "Review Generated Structure" :
             step === "committing" ? "Committing to Builder..." :
             "Import Complete!"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {step === "choose" ? "Choose your preferred input method to get started" :
             step === "processing" ? "This may take a moment depending on content size" :
             step === "preview" ? "Review the AI-generated structure before committing" :
             ""}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          {/* Step 1: Choose Method */}
          {step === "choose" && (
            <div className="grid grid-cols-2 gap-3 py-2">
              {INPUT_METHODS.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleMethodSelect(m.id)}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all hover:shadow-sm",
                      "border-border/50 hover:border-accent/40 hover:bg-accent/5"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3 border", m.colour)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{m.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{m.desc}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Input */}
          {step === "input" && method === "upload" && (
            <div className="space-y-4 py-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.md,.csv"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); e.dataTransfer.files[0] && handleFileSelect(e.dataTransfer.files[0]); }}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                  dragOver ? "border-accent bg-accent/5" : "border-border/50 hover:border-accent/30",
                  selectedFile && "border-accent bg-accent/5"
                )}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-accent" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">Drop your curriculum file here</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, MD, CSV (max 10MB)</p>
                  </>
                )}
              </div>
            </div>
          )}

          {step === "input" && method === "paste_curriculum" && (
            <div className="space-y-3 py-2">
              <Label className="text-xs font-medium">Paste your curriculum content</Label>
              <Textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste the full curriculum text here. Include module titles, descriptions, learning outcomes, assessment details, etc."
                className="min-h-[240px] text-xs resize-none"
              />
              <p className="text-[11px] text-muted-foreground">
                {pastedText.length} characters · AI will parse this into structured pathways, modules, and content blocks
              </p>
            </div>
          )}

          {step === "input" && method === "paste_toc" && (
            <div className="space-y-3 py-2">
              <Label className="text-xs font-medium">Paste your table of contents</Label>
              <Textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={"1. Introduction to Project Management\n   1.1 What is PM?\n   1.2 PM Methodologies\n2. Planning & Scheduling\n   2.1 Work Breakdown Structure\n   2.2 Gantt Charts\n3. Execution & Monitoring\n   ..."}
                className="min-h-[240px] text-xs font-mono resize-none"
              />
              <p className="text-[11px] text-muted-foreground">
                AI will expand each TOC entry into full modules with content blocks, descriptions, and durations
              </p>
            </div>
          )}

          {step === "input" && method === "title_only" && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Programme / Course Title</Label>
                <Input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="e.g. Introduction to Data Science"
                  className="text-sm"
                />
              </div>
              <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-foreground">Two options:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleTitleOnlySimple}
                    disabled={!titleInput.trim()}
                    className="p-3 rounded-lg border border-border/50 hover:border-accent/30 hover:bg-accent/5 text-left transition-all disabled:opacity-50"
                  >
                    <Type className="w-4 h-4 text-muted-foreground mb-1.5" />
                    <p className="text-xs font-semibold">Quick Start</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Create an empty module with this title</p>
                  </button>
                  <button
                    onClick={handleProcess}
                    disabled={!titleInput.trim()}
                    className="p-3 rounded-lg border border-accent/30 bg-accent/5 hover:bg-accent/10 text-left transition-all disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-accent mb-1.5" />
                    <p className="text-xs font-semibold">AI Generate</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">AI builds a full structure from the title</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === "processing" && (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto" />
              <div>
                <p className="text-sm font-semibold text-foreground">Analysing your content...</p>
                <p className="text-xs text-muted-foreground mt-1">AI is generating pathways, modules, and content blocks</p>
              </div>
              {progress && (
                <p className="text-xs text-muted-foreground">{progress}</p>
              )}
              {error && (
                <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg p-3 mx-auto max-w-md">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p className="text-xs">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Preview */}
          {step === "preview" && result && (
            <div className="space-y-4 py-2">
              {result.summary && (
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-3">
                  <p className="text-xs text-foreground">{result.summary}</p>
                </div>
              )}
              <div className="space-y-3">
                {result.pathways.map((pw: AIPathway, pi: number) => (
                  <div key={pi} className="border border-border/50 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30">
                      <BookOpen className="w-3.5 h-3.5 text-accent" />
                      <span className="text-xs font-semibold text-foreground">{pw.title}</span>
                      <Badge variant="outline" className={cn("text-[10px] ml-auto", PHASE_COLORS[pw.phase])}>
                        {pw.phase}
                      </Badge>
                    </div>
                    <div className="p-2 space-y-1.5">
                      {pw.modules.map((mod, mi) => (
                        <div key={mi} className="bg-card rounded-lg p-2.5 border border-border/30">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-foreground">{mod.title}</p>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className="text-[9px]">{mod.duration_hours}h</Badge>
                              <Badge variant="secondary" className="text-[9px]">{mod.content_blocks.length} blocks</Badge>
                            </div>
                          </div>
                          {mod.description && (
                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{mod.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {mod.content_blocks.map((b, bi) => (
                              <span key={bi} className="text-[9px] bg-secondary/60 rounded px-1.5 py-0.5">
                                {BLOCK_TYPE_ICONS[b.block_type] || "📦"} {b.title}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">
                  {result.pathways.length} pathways · {result.pathways.reduce((a: number, p: AIPathway) => a + p.modules.length, 0)} modules · {result.pathways.reduce((a: number, p: AIPathway) => a + p.modules.reduce((b: number, m: { content_blocks: any[] }) => b + m.content_blocks.length, 0), 0)} content blocks
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Committing */}
          {step === "committing" && (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto" />
              <p className="text-sm font-semibold text-foreground">Writing to Programme Builder...</p>
            </div>
          )}

          {/* Step 6: Done */}
          {step === "done" && (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-accent mx-auto" />
              <div>
                <p className="text-sm font-semibold text-foreground">Content imported successfully!</p>
                <p className="text-xs text-muted-foreground mt-1">Your programme structure is ready in the builder</p>
              </div>
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {(step === "input" || (step === "preview" && !isProcessing)) && (
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={() => { setStep("choose"); setMethod(null); setPastedText(""); setSelectedFile(null); }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step !== "done" && (
              <Button size="sm" variant="ghost" className="text-xs" onClick={handleClose}>Cancel</Button>
            )}
            {step === "input" && method !== "title_only" && (
              <Button size="sm" className="gap-1.5 text-xs" onClick={handleProcess} disabled={!canProcess() || isProcessing}>
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate Structure
              </Button>
            )}
            {step === "preview" && (
              <Button size="sm" className="gap-1.5 text-xs" onClick={handleCommit}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Commit to Builder
              </Button>
            )}
            {step === "done" && (
              <Button size="sm" className="gap-1.5 text-xs" onClick={handleClose}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
