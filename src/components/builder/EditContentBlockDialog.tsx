import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "./RichTextEditor";
import { VideoEmbedEditor } from "./VideoEmbedEditor";
import { FileAttachmentEditor } from "./FileAttachmentEditor";
import { ScormEditor } from "./ScormEditor";
import { AssessmentBlockPicker } from "./AssessmentBlockPicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2, PenLine } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BLOCK_TYPE_OPTIONS = [
  { value: "text", label: "Rich Text" },
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
  { value: "file", label: "File" },
  { value: "image", label: "Image" },
  { value: "scorm", label: "SCORM Package" },
  { value: "interactive", label: "Interactive" },
  { value: "assignment", label: "Assignment" },
  { value: "assessment", label: "Assessment" },
  { value: "attendance", label: "Attendance Log" },
  { value: "mentor_review", label: "Mentor Review" },
  { value: "dual_signoff", label: "Dual Sign-off" },
  { value: "evidence_portfolio", label: "Evidence Portfolio" },
  { value: "workplace_logbook", label: "Workplace Logbook" },
  { value: "rubric", label: "Rubric" },
  { value: "peer_review", label: "Peer Review" },
  { value: "discussion", label: "Discussion" },
  { value: "resource_library", label: "Resource Library" },
];

interface EditContentBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: {
    id: string;
    title: string;
    block_type: string;
    is_required: boolean;
    duration_minutes: number | null;
    content?: any;
    file_url?: string | null;
  } | null;
  onSave: (data: {
    id: string;
    title: string;
    block_type: string;
    is_required: boolean;
    duration_minutes: number | null;
    content?: any;
    file_url?: string | null;
  }) => void;
  isPending?: boolean;
  programmeId?: string;
  programmeTitle?: string;
  moduleTitle?: string;
  aiEnabled?: boolean;
}

export function EditContentBlockDialog({
  open, onOpenChange, block, onSave, isPending, programmeId, programmeTitle, moduleTitle, aiEnabled = true,
}: EditContentBlockDialogProps) {
  const [title, setTitle] = useState("");
  const [blockType, setBlockType] = useState("text");
  const [isRequired, setIsRequired] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [fileUrl, setFileUrl] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [contentMode, setContentMode] = useState<"manual" | "ai">("manual");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoDescription, setVideoDescription] = useState("");
  const [scormVersion, setScormVersion] = useState("scorm_2004");
  const [scormLaunchPath, setScormLaunchPath] = useState("");
  const [scormDescription, setScormDescription] = useState("");
  const [scormPackageId, setScormPackageId] = useState<string | null>(null);
  const [linkedAssessmentId, setLinkedAssessmentId] = useState<string | null>(null);

  useEffect(() => {
    if (block) {
      setTitle(block.title);
      setBlockType(block.block_type);
      setIsRequired(block.is_required);
      setDurationMinutes(block.duration_minutes?.toString() ?? "");
      setFileUrl(block.file_url ?? "");
      // Extract HTML content from block.content
      const raw = block.content;
      if (typeof raw === "object" && raw?.html) {
        setHtmlContent(raw.html);
      } else if (typeof raw === "object" && raw?.text) {
        setHtmlContent(`<p>${raw.text.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`);
      } else if (typeof raw === "string") {
        setHtmlContent(`<p>${raw.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`);
      } else {
        setHtmlContent("");
      }
      // Extended type fields
      if (typeof raw === "object" && raw) {
        setVideoDescription(raw.video_description ?? "");
        setScormVersion(raw.scorm_version ?? "scorm_2004");
        setScormLaunchPath(raw.scorm_launch_path ?? "");
        setScormDescription(raw.scorm_description ?? "");
        setScormPackageId(raw.scorm_package_id ?? null);
        setLinkedAssessmentId(raw.assessment_id ?? null);
      } else {
        setLinkedAssessmentId(null);
      }
    }
  }, [block]);

  const handleSave = () => {
    if (!block || !title.trim()) return;
    let content: any = htmlContent.trim()
      ? { html: htmlContent, text: stripHtml(htmlContent) }
      : block.content ?? {};

    // Merge extended type metadata into content
    if (blockType === "video") {
      content = { ...content, video_url: fileUrl.trim() || undefined, video_description: videoDescription || undefined };
    } else if (blockType === "scorm") {
      content = { ...content, scorm_version: scormVersion, scorm_launch_path: scormLaunchPath || undefined, scorm_description: scormDescription || undefined, scorm_package_id: scormPackageId || undefined };
    } else if (blockType === "assessment" || blockType === "assignment") {
      content = { ...content, assessment_id: linkedAssessmentId ?? undefined };
    }

    onSave({
      id: block.id,
      title: title.trim(),
      block_type: blockType,
      is_required: isRequired,
      duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
      content,
      file_url: fileUrl.trim() || null,
    });
  };

  const showRichEditor = ["text", "discussion", "assignment"].includes(blockType);
  const showFileUrl = ["file", "document", "image"].includes(blockType);
  const showVideoEditor = blockType === "video";
  const showScormEditor = blockType === "scorm";
  const showAssessmentPicker = blockType === "assessment" || blockType === "assignment";

  const handleAIGenerate = async () => {
    if (!title.trim()) {
      toast.error("Enter a block title first");
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-content-block", {
        body: {
          moduleTitle: moduleTitle || "Module",
          moduleType: "theory",
          programmeTitle: programmeTitle || "Programme",
          prompt: `Generate detailed rich HTML lesson content for a content block titled "${title}". ${aiPrompt ? `Additional instructions: ${aiPrompt}` : ""} Return a single block with rich HTML content.`,
          blockCount: "1",
        },
      });
      if (error) throw new Error(error.message);
      if (data?.blocks?.[0]?.content?.text) {
        const text = data.blocks[0].content.text;
        const generated = `<h2>${title}</h2>${text.split("\n\n").map((p: string) => `<p>${p}</p>`).join("")}`;
        setHtmlContent(generated);
        setContentMode("manual");
        toast.success("Content generated. You can now edit it.");
      } else {
        toast.error("AI returned no content");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Content Block</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="content" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="h-9 shrink-0">
            <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="flex-1 overflow-y-auto mt-0 space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="block-title">Title</Label>
              <Input
                id="block-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Block title"
              />
            </div>

            {showFileUrl && (
              <FileAttachmentEditor
                fileUrl={fileUrl}
                onFileUrlChange={setFileUrl}
              />
            )}

            {showVideoEditor && (
              <VideoEmbedEditor
                fileUrl={fileUrl}
                onFileUrlChange={setFileUrl}
                description={videoDescription}
                onDescriptionChange={setVideoDescription}
              />
            )}

            {showScormEditor && (
              <ScormEditor
                fileUrl={fileUrl}
                onFileUrlChange={setFileUrl}
                scormVersion={scormVersion}
                onScormVersionChange={setScormVersion}
                launchPath={scormLaunchPath}
                onLaunchPathChange={setScormLaunchPath}
                description={scormDescription}
                onDescriptionChange={setScormDescription}
                scormPackageId={scormPackageId || undefined}
                onScormPackageIdChange={setScormPackageId}
                blockTitle={title}
              />
            )}

            {showAssessmentPicker && (
              <AssessmentBlockPicker
                programmeId={programmeId}
                selectedAssessmentId={linkedAssessmentId}
                onSelect={setLinkedAssessmentId}
              />
            )}

            {showRichEditor && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Content</Label>
                  {aiEnabled && (
                    <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/50">
                      <button
                        type="button"
                        onClick={() => setContentMode("manual")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          contentMode === "manual"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <PenLine className="w-3 h-3" /> Manual
                      </button>
                      <button
                        type="button"
                        onClick={() => setContentMode("ai")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          contentMode === "ai"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Sparkles className="w-3 h-3" /> AI Generate
                      </button>
                    </div>
                  )}
                </div>

                {contentMode === "manual" && (
                  <RichTextEditor
                    content={htmlContent}
                    onChange={setHtmlContent}
                    placeholder="Write your lesson content here..."
                    minHeight="350px"
                  />
                )}

                {contentMode === "ai" && (
                  <div className="rounded-lg border border-border p-4 space-y-4 bg-muted/20">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Sparkles className="w-4 h-4 text-primary" />
                      AI Content Generator
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Generate lesson content based on the block title. You can add instructions to guide the AI.
                    </p>
                    <Textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Optional: e.g. Focus on practical examples, include case studies, South African context..."
                      rows={3}
                      className="text-sm"
                    />
                    <Button
                      onClick={handleAIGenerate}
                      disabled={isGenerating || !title.trim()}
                      className="gap-2"
                      size="sm"
                    >
                      {isGenerating ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" /> Generate Content</>
                      )}
                    </Button>
                    {htmlContent && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Preview. Switch to Manual to edit.</p>
                        <div
                          className="prose prose-sm max-w-none max-h-[200px] overflow-y-auto rounded-md bg-background p-3 border border-border text-foreground"
                          dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!showRichEditor && !showFileUrl && !showVideoEditor && !showScormEditor && !showAssessmentPicker && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Configure this block type in the Settings tab.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="overflow-y-auto mt-0 space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={blockType} onValueChange={setBlockType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOCK_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="block-duration">Duration (minutes)</Label>
                <Input
                  id="block-duration"
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="e.g. 120"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={isRequired}
                onCheckedChange={setIsRequired}
                id="block-required"
              />
              <Label htmlFor="block-required" className="text-sm">
                Required block
              </Label>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}
