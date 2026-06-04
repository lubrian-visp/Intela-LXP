import { useState, useEffect, useRef } from "react";
import { Package, Info, Link2, CheckCircle2, Upload, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

interface ScormEditorProps {
  fileUrl: string;
  onFileUrlChange: (url: string) => void;
  scormVersion?: string;
  onScormVersionChange?: (version: string) => void;
  launchPath?: string;
  onLaunchPathChange?: (path: string) => void;
  description?: string;
  onDescriptionChange?: (desc: string) => void;
  scormPackageId?: string;
  onScormPackageIdChange?: (id: string) => void;
  blockTitle?: string;
}

export function ScormEditor({
  fileUrl, onFileUrlChange,
  scormVersion, onScormVersionChange,
  launchPath, onLaunchPathChange,
  description, onDescriptionChange,
  scormPackageId, onScormPackageIdChange,
  blockTitle,
}: ScormEditorProps) {
  const [localUrl, setLocalUrl] = useState(fileUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalUrl(fileUrl);
  }, [fileUrl]);

  const hasPackage = localUrl.trim().length > 0;

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("SCORM packages must be uploaded as a .zip file");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File exceeds 100 MB limit");
      return;
    }
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("You must be signed in to upload"); return; }

      // 1. Create scorm_packages row in 'uploading' state
      const { data: pkg, error: pkgErr } = await supabase
        .from("scorm_packages")
        .insert({
          title: blockTitle || file.name.replace(/\.zip$/i, ""),
          storage_path: "pending",
          launch_path: launchPath || "index.html",
          scorm_version: scormVersion || "scorm_2004",
          file_size_bytes: file.size,
          status: "uploading",
          created_by: user.id,
        })
        .select()
        .single();
      if (pkgErr) throw pkgErr;

      // 2. Upload zip to staging path
      const stagingPath = `_staging/${pkg.id}.zip`;
      const { error: upErr } = await supabase.storage
        .from("scorm-packages")
        .upload(stagingPath, file, { cacheControl: "3600", upsert: true, contentType: "application/zip" });
      if (upErr) throw upErr;

      // 3. Trigger unpacker
      toast.info("Unpacking SCORM package…");
      const { data: result, error: fnErr } = await supabase.functions.invoke("scorm-unpack", {
        body: { package_id: pkg.id, staging_path: stagingPath, title: blockTitle },
      });
      if (fnErr) throw fnErr;
      if (result?.error) throw new Error(result.error);

      // 4. Wire IDs back to the block
      onScormPackageIdChange?.(pkg.id);
      onFileUrlChange(`scorm://${pkg.id}`); // sentinel marker
      onLaunchPathChange?.(result?.launch_path || "index.html");
      if (result?.version) onScormVersionChange?.(result.version);
      setLocalUrl(`scorm://${pkg.id}`);

      toast.success(`SCORM package ready (${result?.files_uploaded || 0} files, ${result?.version || "scorm_2004"})`);
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
      {/* Info banner */}
      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/20 p-3">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-foreground">SCORM / xAPI Package</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Upload your SCORM .zip directly, or paste a URL to an already-hosted package.
            The package loads in an iframe for learners. xAPI (Tin Can) and cmi5 are also supported.
          </p>
        </div>
      </div>

      {/* Package URL + Upload */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" /> Package URL
        </Label>
        <div className="flex gap-2">
          <Input
            value={localUrl}
            onChange={(e) => setLocalUrl(e.target.value)}
            onBlur={() => onFileUrlChange(localUrl.trim())}
            placeholder="https://... or upload a .zip package"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
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
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Upload a SCORM .zip (max 100 MB) or paste a URL to a hosted package folder.
        </p>
      </div>

      {/* Drop zone (only when empty) */}
      {!hasPackage && (
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
            <Package className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
          )}
          <p className="text-sm text-foreground">
            {isUploading ? "Uploading SCORM package..." : "Drop a SCORM .zip here or click to browse"}
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">Up to 100 MB</p>
        </div>
      )}

      {/* Uploaded package card */}
      {hasPackage && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {decodeURIComponent(localUrl.split("/").pop() || "SCORM package")}
            </p>
            <Badge variant="outline" className="text-[9px] uppercase mt-0.5">
              {(scormVersion || "scorm_2004").replace("_", " ")}
            </Badge>
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

      {/* SCORM Version */}
      <div className="space-y-2">
        <Label className="text-xs">Standard Version</Label>
        <Select value={scormVersion || "scorm_2004"} onValueChange={onScormVersionChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scorm_12" className="text-xs">SCORM 1.2</SelectItem>
            <SelectItem value="scorm_2004" className="text-xs">SCORM 2004 (3rd/4th Edition)</SelectItem>
            <SelectItem value="xapi" className="text-xs">xAPI (Tin Can)</SelectItem>
            <SelectItem value="cmi5" className="text-xs">cmi5</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Launch path */}
      <div className="space-y-2">
        <Label className="text-xs">Entry Point / Launch Path (optional)</Label>
        <Input
          value={launchPath || ""}
          onChange={(e) => onLaunchPathChange?.(e.target.value)}
          placeholder="index.html"
          className="h-8 text-xs"
        />
        <p className="text-[10px] text-muted-foreground">
          The HTML file inside the package to load. Defaults to index.html if left empty.
        </p>
      </div>

      {/* Description */}
      {onDescriptionChange !== undefined && (
        <div className="space-y-2">
          <Label className="text-xs">Package Description (optional)</Label>
          <Textarea
            value={description || ""}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Describe the learning content in this package..."
            rows={2}
            className="text-sm"
          />
        </div>
      )}

      {/* Status indicator */}
      <div className="flex items-center gap-2 pt-1">
        {hasPackage ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span className="text-xs text-success font-medium">Package URL configured</span>
            <Badge variant="secondary" className="text-[9px] ml-auto capitalize">
              {(scormVersion || "scorm_2004").replace("_", " ")}
            </Badge>
          </>
        ) : (
          <>
            <Package className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground">No package configured</span>
          </>
        )}
      </div>
    </div>
  );
}
