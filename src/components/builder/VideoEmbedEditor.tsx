import { useState, useEffect } from "react";
import { Video, Link2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VideoEmbedEditorProps {
  fileUrl: string;
  onFileUrlChange: (url: string) => void;
  description?: string;
  onDescriptionChange?: (desc: string) => void;
}

function parseVideoUrl(url: string): { provider: "youtube" | "vimeo" | "direct" | "invalid"; embedUrl: string | null; thumbnailUrl: string | null } {
  if (!url.trim()) return { provider: "invalid", embedUrl: null, thumbnailUrl: null };

  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (ytMatch) {
    return {
      provider: "youtube",
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`,
    };
  }

  // Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) {
    return {
      provider: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      thumbnailUrl: null,
    };
  }

  // Direct video URL
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
    return { provider: "direct", embedUrl: url, thumbnailUrl: null };
  }

  // Possibly valid URL but unknown provider
  try {
    new URL(url);
    return { provider: "direct", embedUrl: url, thumbnailUrl: null };
  } catch {
    return { provider: "invalid", embedUrl: null, thumbnailUrl: null };
  }
}

export function VideoEmbedEditor({ fileUrl, onFileUrlChange, description, onDescriptionChange }: VideoEmbedEditorProps) {
  const [localUrl, setLocalUrl] = useState(fileUrl);
  const parsed = parseVideoUrl(localUrl);

  useEffect(() => {
    setLocalUrl(fileUrl);
  }, [fileUrl]);

  const handleUrlBlur = () => {
    // Auto-correct YouTube watch URLs to embed
    if (parsed.provider !== "invalid") {
      onFileUrlChange(localUrl.trim());
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Video className="w-3.5 h-3.5" /> Video URL
        </Label>
        <div className="relative">
          <Input
            value={localUrl}
            onChange={(e) => setLocalUrl(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
            className={cn(
              "pr-8",
              parsed.provider === "invalid" && localUrl.trim() && "border-destructive"
            )}
          />
          {localUrl.trim() && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {parsed.provider !== "invalid" ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {parsed.provider !== "invalid" && parsed.provider !== "direct" && (
            <Badge variant="secondary" className="text-[9px] capitalize">
              {parsed.provider}
            </Badge>
          )}
          {parsed.provider === "direct" && (
            <Badge variant="outline" className="text-[9px]">Direct Video</Badge>
          )}
          {parsed.provider === "invalid" && localUrl.trim() && (
            <span className="text-[10px] text-destructive">Enter a valid YouTube, Vimeo, or direct video URL</span>
          )}
          {!localUrl.trim() && (
            <span className="text-[10px] text-muted-foreground">Supports YouTube, Vimeo, and direct video files (.mp4, .webm)</span>
          )}
        </div>
      </div>

      {/* Live Preview */}
      {parsed.embedUrl && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Preview</Label>
          <div className="aspect-video rounded-lg overflow-hidden border border-border bg-black/5">
            {parsed.provider === "youtube" || parsed.provider === "vimeo" ? (
              <iframe
                src={parsed.embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video preview"
              />
            ) : (
              <video src={parsed.embedUrl} controls className="w-full h-full" />
            )}
          </div>
        </div>
      )}

      {/* Optional description */}
      {onDescriptionChange !== undefined && (
        <div className="space-y-2">
          <Label className="text-xs">Video Description (optional)</Label>
          <Textarea
            value={description || ""}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Brief description of the video content..."
            rows={2}
            className="text-sm"
          />
        </div>
      )}
    </div>
  );
}
