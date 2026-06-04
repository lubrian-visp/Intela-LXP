import { X, Eye, FileText, Video, Image, File, Package, Zap, MessageSquare, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ContentBlock {
  id: string;
  title: string;
  block_type: string;
  is_required: boolean;
  duration_minutes: number | null;
  content?: any;
  file_url?: string | null;
}

interface ContentPreviewPanelProps {
  blocks: ContentBlock[];
  moduleTitle: string;
  onClose: () => void;
}

const blockIcons: Record<string, any> = {
  text: FileText,
  video: Video,
  image: Image,
  file: File,
  document: File,
  scorm: Package,
  interactive: Zap,
  discussion: MessageSquare,
  assignment: BookOpen,
};

export function ContentPreviewPanel({ blocks, moduleTitle, onClose }: ContentPreviewPanelProps) {
  const totalDuration = blocks.reduce((sum, b) => sum + (b.duration_minutes ?? 0), 0);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Learner Preview</h3>
        </div>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Module Header Preview */}
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">{moduleTitle}</h2>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>{blocks.length} content block{blocks.length !== 1 ? "s" : ""}</span>
          {totalDuration > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              <span>~{totalDuration} min</span>
            </>
          )}
          <span className="w-1 h-1 rounded-full bg-muted-foreground" />
          <span>{blocks.filter((b) => b.is_required).length} required</span>
        </div>
      </div>

      {/* Content Blocks Preview */}
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-6">
          {blocks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No content blocks to preview.</p>
            </div>
          ) : (
            blocks.map((block, index) => (
              <PreviewBlock key={block.id} block={block} index={index} />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border bg-muted/20 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Preview Mode — Content renders as learners will see it
        </p>
      </div>
    </div>
  );
}

function PreviewBlock({ block, index }: { block: ContentBlock; index: number }) {
  const Icon = blockIcons[block.block_type] ?? FileText;
  const htmlContent = block.content?.html || block.content?.text || null;

  return (
    <div className="space-y-3">
      {index > 0 && <Separator />}

      {/* Block Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <h4 className="text-sm font-semibold text-foreground flex-1">{block.title}</h4>
        {block.duration_minutes && (
          <span className="text-[10px] text-muted-foreground">{block.duration_minutes} min</span>
        )}
        {block.is_required && (
          <Badge variant="default" className="text-[9px] px-1.5">Required</Badge>
        )}
      </div>

      {/* Rich Text Content */}
      {block.block_type === "text" && htmlContent && (
        <div
          className={cn(
            "prose prose-sm max-w-none text-foreground",
            "prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground",
            "prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground",
            "prose-a:text-primary prose-a:underline",
            "prose-img:rounded-lg prose-img:shadow-md",
            "[&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4"
          )}
          dangerouslySetInnerHTML={{ __html: typeof htmlContent === "string" ? htmlContent : "" }}
        />
      )}

      {/* Video Preview */}
      {block.block_type === "video" && block.file_url && (
        <div className="rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center">
          {block.file_url.includes("youtube") || block.file_url.includes("youtu.be") ? (
            <iframe
              src={block.file_url.replace("watch?v=", "embed/")}
              className="w-full h-full"
              allowFullScreen
              title={block.title}
            />
          ) : (
            <video src={block.file_url} controls className="w-full h-full" />
          )}
        </div>
      )}

      {/* Image Preview */}
      {block.block_type === "image" && block.file_url && (
        <div className="rounded-lg overflow-hidden">
          <img
            src={block.file_url}
            alt={block.title}
            className="w-full h-auto rounded-lg shadow-sm"
            loading="lazy"
          />
        </div>
      )}

      {/* File / Document Download */}
      {(block.block_type === "file" || block.block_type === "document") && block.file_url && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
          <File className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{block.title}</p>
            <p className="text-xs text-muted-foreground">Click to download</p>
          </div>
          <Button size="sm" variant="outline" className="text-xs" asChild>
            <a href={block.file_url} target="_blank" rel="noopener noreferrer">
              Download
            </a>
          </Button>
        </div>
      )}

      {/* SCORM Placeholder */}
      {block.block_type === "scorm" && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center bg-muted/20">
          <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">SCORM Package</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Interactive SCORM content will load here in the learner view.
          </p>
        </div>
      )}

      {/* Interactive Placeholder */}
      {block.block_type === "interactive" && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center bg-muted/20">
          <Zap className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Interactive Activity</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            H5P or interactive content will render here.
          </p>
        </div>
      )}

      {/* Discussion Placeholder */}
      {block.block_type === "discussion" && (
        <div className="rounded-lg border border-border p-4 bg-muted/10">
          <MessageSquare className="w-5 h-5 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium text-foreground">{block.title}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Discussion thread — learners can post and reply here.
          </p>
          {htmlContent && (
            <div className="mt-3 text-xs text-muted-foreground border-t border-border pt-3">
              <span className="font-semibold">Prompt:</span>{" "}
              <span dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>
          )}
        </div>
      )}

      {/* Generic fallback for types without special rendering */}
      {!["text", "video", "image", "file", "document", "scorm", "interactive", "discussion"].includes(block.block_type) && (
        <div className="rounded-lg border border-border p-4 bg-muted/10">
          <p className="text-sm text-muted-foreground">
            {block.title} — {block.block_type} content block
          </p>
          {htmlContent && (
            <div
              className="prose prose-sm max-w-none mt-2 text-foreground"
              dangerouslySetInnerHTML={{ __html: typeof htmlContent === "string" ? htmlContent : "" }}
            />
          )}
        </div>
      )}
    </div>
  );
}
