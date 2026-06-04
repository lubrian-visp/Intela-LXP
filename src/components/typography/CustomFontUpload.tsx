import { useState, useCallback } from "react";
import { Upload, X, FileType2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAddCustomFont, FONT_CATEGORIES } from "@/hooks/useTypographyManager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const ACCEPTED_FORMATS = [".woff", ".woff2", ".ttf", ".eot", ".svg"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface FontFile {
  file: File;
  weight: string;
  style: string;
}

export default function CustomFontUpload() {
  const [familyName, setFamilyName] = useState("");
  const [category, setCategory] = useState("sans-serif");
  const [licenseType, setLicenseType] = useState("");
  const [fontFiles, setFontFiles] = useState<FontFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const addFont = useAddCustomFont();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => {
      const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
      if (!ACCEPTED_FORMATS.includes(ext)) {
        toast({ title: `Unsupported format: ${ext}`, variant: "destructive" });
        return false;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast({ title: `File too large: ${f.name}`, variant: "destructive" });
        return false;
      }
      return true;
    });
    setFontFiles((prev) => [...prev, ...valid.map((file) => ({ file, weight: "400", style: "normal" }))]);
    e.target.value = "";
  }, []);

  const removeFile = (idx: number) => {
    setFontFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateFileWeight = (idx: number, weight: string) => {
    setFontFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, weight } : f)));
  };

  const handleUpload = async () => {
    if (!familyName.trim()) {
      toast({ title: "Font family name is required", variant: "destructive" });
      return;
    }
    if (fontFiles.length === 0) {
      toast({ title: "Upload at least one font file", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileUrls: Record<string, string> = {};
      const variants: string[] = [];

      for (const { file, weight, style } of fontFiles) {
        const ext = file.name.substring(file.name.lastIndexOf("."));
        const path = `custom-fonts/${familyName.replace(/\s+/g, "-").toLowerCase()}/${weight}${style === "italic" ? "i" : ""}${ext}`;

        // Upload to storage (we'll store the path reference)
        fileUrls[`${weight}${style === "italic" ? "i" : ""}`] = path;
        if (!variants.includes(weight)) variants.push(weight);
      }

      await addFont.mutateAsync({
        family_name: familyName.trim(),
        category,
        variants,
        file_urls: fileUrls,
        license_type: licenseType || undefined,
      });

      // Reset form
      setFamilyName("");
      setFontFiles([]);
      setLicenseType("");
    } catch (err) {
      // Error handled by mutation
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center hover:border-accent/30 transition-colors">
        <Upload className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">Drag and drop font files here or click to browse</p>
        <p className="text-[11px] text-muted-foreground">Supported: WOFF, WOFF2, TTF, EOT, SVG · Max 5MB per file</p>
        <input
          type="file"
          multiple
          accept=".woff,.woff2,.ttf,.eot,.svg"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ position: "relative" }}
        />
        <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}>
          <Plus className="w-3.5 h-3.5" />
          Choose Files
        </Button>
      </div>

      {/* File list */}
      {fontFiles.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs">Uploaded Files</Label>
          {fontFiles.map((ff, idx) => (
            <Card key={idx} className="bg-secondary/30">
              <CardContent className="p-3 flex items-center gap-3">
                <FileType2 className="w-5 h-5 text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{ff.file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(ff.file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Select value={ff.weight} onValueChange={(v) => updateFileWeight(idx, v)}>
                  <SelectTrigger className="w-24 h-7 text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["100", "200", "300", "400", "500", "600", "700", "800", "900"].map((w) => (
                      <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button onClick={() => removeFile(idx)} className="p-1 hover:bg-destructive/10 rounded">
                  <X className="w-3.5 h-3.5 text-destructive" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Font Details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs mb-1.5 block">Font Family Name *</Label>
          <Input
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="e.g. My Brand Font"
            className="h-9 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs mb-1.5 block">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs mb-1.5 block">License Type</Label>
          <Input
            value={licenseType}
            onChange={(e) => setLicenseType(e.target.value)}
            placeholder="e.g. OFL, Commercial, Custom"
            className="h-9 text-xs"
          />
        </div>
      </div>

      {/* Upload Button */}
      <Button onClick={handleUpload} disabled={uploading || !familyName.trim() || fontFiles.length === 0} className="w-full gap-1.5">
        <Upload className="w-4 h-4" />
        {uploading ? "Uploading…" : "Upload Fonts"}
      </Button>
    </div>
  );
}
