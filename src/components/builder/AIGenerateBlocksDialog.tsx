import { useState } from "react";
import {
  Sparkles, Loader2, CheckCircle2, AlertTriangle, RotateCcw, Plus,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIBlock {
  title: string;
  block_type: string;
  is_required: boolean;
  duration_minutes: number;
  content?: { text?: string };
  selected?: boolean;
}

interface AIGenerateBlocksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleTitle: string;
  moduleType: string;
  programmeTitle: string;
  onAddBlocks: (blocks: { title: string; block_type: string; is_required: boolean; duration_minutes?: number; content?: any }[]) => void;
}

const BLOCK_TYPE_EMOJI: Record<string, string> = {
  text: "📝", video: "🎬", document: "📄", assessment: "✅",
  assignment: "📋", discussion: "💬", attendance: "📊",
  mentor_review: "👤", evidence_portfolio: "📁", workplace_logbook: "📓",
  rubric: "📐", peer_review: "👥", resource_library: "📚",
  interactive: "⚡", scorm: "📦", image: "🖼️", dual_signoff: "✍️",
};

export function AIGenerateBlocksDialog({
  open, onOpenChange, moduleTitle, moduleType, programmeTitle, onAddBlocks,
}: AIGenerateBlocksDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [blockCount, setBlockCount] = useState("4");
  const [isProcessing, setIsProcessing] = useState(false);
  const [blocks, setBlocks] = useState<AIBlock[]>([]);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"configure" | "preview">("configure");

  const handleGenerate = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-generate-content-block", {
        body: {
          moduleTitle,
          moduleType,
          programmeTitle,
          prompt: prompt.trim() || undefined,
          blockCount: blockCount || "3-5",
        },
      });

      if (fnError) throw new Error(fnError.message || "AI processing failed");
      if (data?.error) throw new Error(data.error);
      if (!data?.blocks || !Array.isArray(data.blocks)) throw new Error("AI returned unexpected format");

      setBlocks(data.blocks.map((b: AIBlock) => ({ ...b, selected: true })));
      setSummary(data.summary || "");
      setStep("preview");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    const selected = blocks.filter((b) => b.selected);
    if (selected.length === 0) {
      toast.error("Select at least one block to import");
      return;
    }
    onAddBlocks(
      selected.map(({ title, block_type, is_required, duration_minutes, content }) => ({
        title,
        block_type,
        is_required,
        duration_minutes,
        content,
      }))
    );
    handleClose();
    toast.success(`${selected.length} content blocks added`);
  };

  const toggleBlock = (idx: number) => {
    setBlocks((prev) => prev.map((b, i) => i === idx ? { ...b, selected: !b.selected } : b));
  };

  const toggleAll = (checked: boolean) => {
    setBlocks((prev) => prev.map((b) => ({ ...b, selected: checked })));
  };

  const handleClose = () => {
    setStep("configure");
    setBlocks([]);
    setSummary("");
    setError(null);
    setPrompt("");
    setBlockCount("4");
    onOpenChange(false);
  };

  const selectedCount = blocks.filter((b) => b.selected).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Content Generator
          </DialogTitle>
          <DialogDescription>
            Generate lesson content for <span className="font-medium text-foreground">{moduleTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-hidden">
          {step === "configure" && (
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Additional Instructions (optional)</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Focus on South African regulatory context, include case studies, emphasize practical application..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Number of blocks to generate</Label>
                <Input
                  type="number"
                  value={blockCount}
                  onChange={(e) => setBlockCount(e.target.value)}
                  min={1}
                  max={10}
                  className="w-24"
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="text-xs font-semibold text-foreground">What AI will generate:</h4>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Rich multimedia lessons with text, images & video</li>
                  <li>Embedded YouTube videos for video blocks</li>
                  <li>Relevant images from Unsplash for visual content</li>
                  <li>Block types matched to module type ({moduleType})</li>
                  <li>Realistic durations and required/optional flags</li>
                  <li>You can review and select which blocks to import</li>
                </ul>
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {step === "preview" && blocks.length > 0 && (
            <div className="flex flex-col h-full">
              {summary && (
                <div className="px-6 pt-4 pb-2">
                  <div className="bg-primary/5 rounded-lg p-3 border border-primary/10 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">{summary}</p>
                  </div>
                </div>
              )}
              <div className="px-6 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedCount === blocks.length}
                    onCheckedChange={(c) => toggleAll(!!c)}
                  />
                  <span className="text-xs text-muted-foreground">
                    {selectedCount} of {blocks.length} selected
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {blocks.reduce((s, b) => s + (b.duration_minutes || 0), 0)} min total
                </Badge>
              </div>
              <ScrollArea className="flex-1 max-h-[350px]">
                <div className="px-6 pb-4 space-y-2">
                  {blocks.map((block, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 transition-colors cursor-pointer ${
                        block.selected
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-card opacity-60"
                      }`}
                      onClick={() => toggleBlock(i)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={block.selected}
                          onCheckedChange={() => toggleBlock(i)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{BLOCK_TYPE_EMOJI[block.block_type] || "📦"}</span>
                            <span className="text-sm font-medium text-foreground truncate">{block.title}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Badge variant="outline" className="text-[9px]">{block.block_type}</Badge>
                            <span>{block.duration_minutes} min</span>
                            {block.is_required && <Badge variant="secondary" className="text-[9px]">Required</Badge>}
                          </div>
                          {block.content?.text && (
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                              {block.content.text}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {isProcessing && (
            <div className="p-6 flex flex-col items-center justify-center min-h-[250px] space-y-4">
              <Sparkles className="w-10 h-10 text-primary animate-pulse" />
              <p className="text-sm font-medium text-foreground">Generating content blocks...</p>
              <p className="text-xs text-muted-foreground">This may take 15-30 seconds</p>
            </div>
          )}
        </div>

        <Separator />

        <div className="px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
          <div className="flex items-center gap-2">
            {step === "configure" && (
              <Button size="sm" disabled={isProcessing} onClick={handleGenerate} className="gap-1.5">
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate
              </Button>
            )}
            {step === "preview" && (
              <>
                <Button size="sm" variant="outline" onClick={() => { setStep("configure"); setBlocks([]); }} className="gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Regenerate
                </Button>
                <Button size="sm" disabled={selectedCount === 0} onClick={handleImport} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Import {selectedCount} Blocks
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
