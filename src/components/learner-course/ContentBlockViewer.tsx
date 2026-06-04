import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FileText, Video, Image, FileCheck, BookOpen, Clock, Package, File, Download, ChevronRight } from "lucide-react";
import ScormPlayer from "@/components/learner-course/ScormPlayer";

interface ContentBlockViewerProps {
  block: {
    id: string;
    title: string;
    block_type: string;
    content: any;
    file_url: string | null;
    duration_minutes: number | null;
    is_required: boolean;
  } | null;
  moduleTitle: string;
}

const blockTypeIcons: Record<string, any> = {
  text: FileText,
  rich_text: FileText,
  video: Video,
  image: Image,
  document: FileCheck,
  file: File,
  assessment: FileCheck,
  assignment: FileCheck,
  scorm: Package,
};

const blockTypeLabels: Record<string, string> = {
  text: "Reading",
  rich_text: "Reading",
  video: "Video Lesson",
  image: "Visual Content",
  document: "Document",
  file: "File Attachment",
  assessment: "Assessment",
  assignment: "Assignment",
  rubric: "Rubric",
  workplace_logbook: "Workplace Logbook",
  mentor_evaluation: "Mentor Evaluation",
  peer_review: "Peer Review",
  discussion: "Discussion Activity",
  attendance_log: "Attendance",
  scorm: "Interactive Content",
};

export default function ContentBlockViewer({ block, moduleTitle }: ContentBlockViewerProps) {
  if (!block) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Select a Lesson</h3>
          <p className="text-sm text-muted-foreground">
            Choose a lesson from the sidebar to begin learning. Your progress will be tracked automatically.
          </p>
        </div>
      </div>
    );
  }

  const IconComponent = blockTypeIcons[block.block_type] || FileText;
  const typeLabel = blockTypeLabels[block.block_type] || block.block_type;

  // Extract HTML content from the content JSON
  const htmlContent =
    typeof block.content === "string"
      ? block.content
      : block.content?.html || block.content?.body || block.content?.text || "";

  return (
    <div className="flex-1 overflow-auto bg-muted/20">
      {/* Block header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-8 py-5">
        <nav className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
          <span className="hover:text-foreground transition-colors cursor-default">{moduleTitle}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="flex items-center gap-1">
            <IconComponent className="w-3 h-3" />
            {typeLabel}
          </span>
          {block.duration_minutes && (
            <>
              <ChevronRight className="w-3 h-3" />
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {block.duration_minutes} min
              </span>
            </>
          )}
        </nav>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">{block.title}</h2>
        <div className="flex items-center gap-2 mt-2">
          {block.is_required && (
            <Badge className="text-[10px] font-medium bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 rounded-md px-2 py-0.5 dark:bg-amber-500/20 dark:text-amber-400">
              Required
            </Badge>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-5">
        {/* Rich text / HTML content */}
        {htmlContent && (
          <div className="rounded-2xl border border-border/50 bg-card p-6 sm:p-8 shadow-sm">
            <div
              className="prose prose-sm dark:prose-invert max-w-none
                prose-headings:text-foreground prose-p:text-foreground/90
                prose-a:text-primary prose-strong:text-foreground
                prose-img:rounded-xl prose-img:shadow-md
                prose-table:border prose-table:border-border
                prose-th:bg-muted prose-th:p-2 prose-td:p-2
                prose-li:text-foreground/90"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        )}

        {/* Video embed — YouTube, Vimeo, direct */}
        {block.block_type === "video" && (block.file_url || block.content?.video_url) && (() => {
          const videoUrl = block.file_url || block.content?.video_url;
          const isYouTube = videoUrl.includes("youtube") || videoUrl.includes("youtu.be");
          const isVimeo = videoUrl.includes("vimeo.com");

          let embedSrc = videoUrl;
          if (isYouTube) {
            const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
            embedSrc = ytMatch ? `https://www.youtube.com/embed/${ytMatch[1]}` : videoUrl.replace("watch?v=", "embed/");
          } else if (isVimeo) {
            const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
            embedSrc = vimeoMatch ? `https://player.vimeo.com/video/${vimeoMatch[1]}` : videoUrl;
          }

          return (
            <div className="space-y-3 mt-4">
              <div className="aspect-video rounded-xl overflow-hidden bg-black/5 border border-border/50 shadow-md">
                {isYouTube || isVimeo ? (
                  <iframe
                    src={embedSrc}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={block.title}
                  />
                ) : (
                  <video src={videoUrl} controls className="w-full h-full" />
                )}
              </div>
              {block.content?.video_description && (
                <p className="text-sm text-muted-foreground">{block.content.video_description}</p>
              )}
            </div>
          );
        })()}

        {/* Image block */}
        {block.block_type === "image" && (block.file_url || block.content?.image_url) && (
          <div className="mt-4">
            <img
              src={block.file_url || block.content?.image_url}
              alt={block.content?.image_caption || block.title}
              className="w-full rounded-xl shadow-md border border-border/50"
            />
            {block.content?.image_caption && (
              <p className="text-xs text-muted-foreground text-center mt-2 italic">
                {block.content.image_caption}
              </p>
            )}
          </div>
        )}

        {/* Document download */}
        {(block.block_type === "document" || block.block_type === "file") && block.file_url && (
          <div className="rounded-xl border border-border/50 bg-card p-6 flex items-center gap-4 mt-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Download className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {block.block_type === "file" ? "Download Attachment" : "Download Resource"}
              </p>
              <p className="text-xs text-muted-foreground">Click to download the attached file</p>
            </div>
            <a
              href={block.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              Download
            </a>
          </div>
        )}

        {/* SCORM / xAPI runtime player */}
        {block.block_type === "scorm" && block.content?.scorm_package_id && (
          <div className="mt-4 space-y-3">
            <ScormPlayer packageId={block.content.scorm_package_id} height={600} />
            {block.content?.scorm_description && (
              <p className="text-sm text-muted-foreground">{block.content.scorm_description}</p>
            )}
          </div>
        )}

        {/* SCORM legacy fallback (raw URL without managed package) */}
        {block.block_type === "scorm" && !block.content?.scorm_package_id && block.file_url && (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl overflow-hidden border border-border shadow-md" style={{ minHeight: "500px" }}>
              <iframe
                src={`${block.file_url}${block.content?.scorm_launch_path ? "/" + block.content.scorm_launch_path : ""}`}
                className="w-full border-0"
                style={{ height: "500px" }}
                title={block.title}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Legacy iframe mode — re-upload via the SCORM editor to enable progress tracking.
            </p>
          </div>
        )}

        {/* SCORM placeholder (no URL) */}
        {block.block_type === "scorm" && !block.file_url && !block.content?.scorm_package_id && (
          <div className="rounded-xl border-2 border-dashed border-border p-8 text-center mt-4">
            <Package className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">SCORM Package</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Interactive content package is being prepared.
            </p>
          </div>
        )}

        {/* Empty content fallback */}
        {!htmlContent && !block.file_url && !block.content?.video_url && !block.content?.image_url && block.block_type !== "scorm" && (
          <div className="text-center py-12">
            <IconComponent className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">Content for this lesson is being prepared.</p>
          </div>
        )}
      </div>
    </div>
  );
}
