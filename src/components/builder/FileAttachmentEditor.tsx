import { useState, useEffect, useRef } from "react";
import { Upload, File, Link2, X, FileText, Image, FileArchive, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FileAttachmentEditorProps {
  fileUrl: string;
  onFileUrlChange: (url: string) => void;
  allowedTypes?: string;
  accept?: string;
}

function getFileExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase() || "";
    return ext;
  } catch {
    return url.split(".").pop()?.toLowerCase() || "";
  }
}

function getFileIcon(url: string) {
  const ext = getFileExtension(url);
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return Image;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return FileArchive;
  if (["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext)) return FileText;
  return File;
}

function getFileLabel(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.split("/").pop() || "file");
  } catch {
    return url.split("/").pop() || "file";
  }
}

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

export function FileAttachmentEditor({ fileUrl, onFileUrlChange, allowedTypes, accept }: FileAttachmentEditorProps) {
  const [localUrl, setLocalUrl] = useState(fileUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasFile = localUrl.trim().length > 0;
  const FileIcon = hasFile ? getFileIcon(localUrl) : File;

  useEffect(() => {
    setLocalUrl(fileUrl);
  }, [fileUrl]);

  const handleUrlBlur = () => {
    onFileUrlChange(localUrl.trim());
  };

  const handleUpload = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("File exceeds 100 MB limit");
      return;
    }
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be signed in to upload");
        return;
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from("content-block-media")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: pub } = supabase.storage
        .from("content-block-media")
        .getPublicUrl(path);
      setLocalUrl(pub.publicUrl);
      onFileUrlChange(pub.publicUrl);
      toast.success("File uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" /> File / Media URL
        </Label>
        <div className="flex gap-2">
          <Input
            value={localUrl}
            onChange={(e) => setLocalUrl(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="https://... or upload a file"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-2 shrink-0"
          >
            {isUploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload</>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          {allowedTypes || "Paste a direct URL or upload a file (max 100 MB). Supports PDF, DOCX, PPTX, images, and more."}
        </p>
      </div>

      {/* File info card */}
      {hasFile && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{getFileLabel(localUrl)}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[9px] uppercase">
                {getFileExtension(localUrl) || "file"}
              </Badge>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => { setLocalUrl(""); onFileUrlChange(""); }}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Drop zone */}
      {!hasFile && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"
          )}
        >
          {isUploading ? (
            <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin mb-2" />
          ) : (
            <Upload className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
          )}
          <p className="text-sm text-foreground">
            {isUploading ? "Uploading..." : "Drop a file here, click to browse, or paste a URL above"}
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            Up to 100 MB
          </p>
        </div>
      )}
    </div>
  );
}
