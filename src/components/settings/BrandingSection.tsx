import { useState, useRef, useEffect } from "react";
import { Building2, Upload, Trash2, Loader2, ImageIcon, Ruler } from "lucide-react";
import { usePlatformSettings, useUpdatePlatformSetting } from "@/hooks/usePlatformSettings";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";

interface LogoSlot {
  key: string;
  label: string;
  description: string;
  recommended: string;
}

const logoSlots: LogoSlot[] = [
  { key: "logo_header", label: "Header Logo", description: "Displayed in the top navigation bar across all pages", recommended: "Recommended: 200×48px, PNG or SVG with transparent background" },
  { key: "logo_footer", label: "Footer Logo", description: "Displayed at the bottom of the landing page and public pages", recommended: "Recommended: 200×48px, PNG or SVG, light version for dark backgrounds" },
  { key: "logo_favicon", label: "Favicon / App Icon", description: "Shown in the browser tab and when bookmarked", recommended: "Recommended: Square 512×512px, PNG" },
];

export default function BrandingSection() {
  const { data: settings, isLoading } = usePlatformSettings("branding");
  const update = useUpdatePlatformSetting();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const getLogoUrl = (key: string) => settings?.find((s) => s.setting_key === key)?.setting_value || "";
  const getSettingId = (key: string) => settings?.find((s) => s.setting_key === key)?.id;

  const handleUpload = async (key: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file (PNG, JPG, SVG, or WebP).", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB.", variant: "destructive" });
      return;
    }

    try {
      setUploading((prev) => ({ ...prev, [key]: true }));

      const ext = file.name.split(".").pop() || "png";
      const filePath = `${key}.${ext}`;

      // Remove old file if exists
      await supabase.storage.from("branding").remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from("branding")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("branding")
        .getPublicUrl(filePath);

      const url = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      // Save URL to platform_settings — upsert if the row doesn't exist yet
      const settingId = getSettingId(key);
      if (settingId) {
        await update.mutateAsync({ id: settingId, setting_value: url });
      } else {
        const slot = logoSlots.find((s) => s.key === key);
        const { error: upsertError } = await (supabase as any)
          .from("platform_settings")
          .upsert(
            { category: "branding", setting_key: key, setting_value: url, label: slot?.label ?? key, description: slot?.description ?? "" },
            { onConflict: "setting_key" }
          );
        if (upsertError) throw upsertError;
        qc.invalidateQueries({ queryKey: ["platform-settings"] });
      }

      toast({ title: "Logo uploaded", description: `${logoSlots.find((s) => s.key === key)?.label} updated successfully.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleRemove = async (key: string) => {
    try {
      setUploading((prev) => ({ ...prev, [key]: true }));
      const currentUrl = getLogoUrl(key);
      if (currentUrl) {
        // Extract filename from URL
        const urlPath = new URL(currentUrl).pathname;
        const fileName = urlPath.split("/").pop()?.split("?")[0];
        if (fileName) {
          await supabase.storage.from("branding").remove([fileName]);
        }
      }
      const settingId = getSettingId(key);
      if (settingId) {
        update.mutate({ id: settingId, setting_value: "" });
      }
      toast({ title: "Logo removed" });
    } catch (err: any) {
      toast({ title: "Remove failed", description: err?.message, variant: "destructive" });
    } finally {
      setUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Organisation Branding</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Upload and manage logos for the header, footer, and browser tab
          </p>
        </div>

        <div className="p-6 space-y-6">
          {logoSlots.map((slot) => (
            <LogoUploadCard
              key={slot.key}
              slot={slot}
              currentUrl={getLogoUrl(slot.key)}
              isUploading={uploading[slot.key] ?? false}
              onUpload={(file) => handleUpload(slot.key, file)}
              onRemove={() => handleRemove(slot.key)}
              currentWidth={slot.key !== "logo_favicon" ? parseInt(getLogoUrl(`${slot.key}_width`) || "140", 10) : undefined}
              onWidthChange={slot.key !== "logo_favicon" ? (width: number) => {
                const widthKey = `${slot.key}_width`;
                const settingId = getSettingId(widthKey);
                if (settingId) {
                  update.mutate({ id: settingId, setting_value: String(width) });
                }
              } : undefined}
              widthSettingExists={slot.key !== "logo_favicon" ? !!getSettingId(`${slot.key}_width`) : false}
              onCreateWidthSetting={slot.key !== "logo_favicon" ? async (width: number) => {
                const widthKey = `${slot.key}_width`;
                try {
                  await supabase.from("platform_settings").insert({
                    category: "branding",
                    setting_key: widthKey,
                    setting_value: String(width),
                    label: `${slot.label} Width`,
                    description: `Display width for ${slot.label} in pixels`,
                  });
                  toast({ title: "Width saved" });
                  qc.invalidateQueries({ queryKey: ["platform-settings"] });
                } catch (err: any) {
                  toast({ title: "Failed to save width", description: err?.message, variant: "destructive" });
                }
              } : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function LogoUploadCard({
  slot,
  currentUrl,
  isUploading,
  onUpload,
  onRemove,
  currentWidth,
  onWidthChange,
  widthSettingExists,
  onCreateWidthSetting,
}: {
  slot: LogoSlot;
  currentUrl: string;
  isUploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  currentWidth?: number;
  onWidthChange?: (width: number) => void;
  widthSettingExists?: boolean;
  onCreateWidthSetting?: (width: number) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localWidth, setLocalWidth] = useState(currentWidth ?? 140);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentWidth !== undefined) setLocalWidth(currentWidth);
  }, [currentWidth]);

  const handleWidthChange = (values: number[]) => {
    const w = values[0];
    setLocalWidth(w);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (widthSettingExists && onWidthChange) {
        onWidthChange(w);
      } else if (onCreateWidthSetting) {
        onCreateWidthSetting(w);
      }
    }, 500);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  return (
    <div className="flex items-start gap-5 p-4 rounded-xl border border-border/50 hover:bg-secondary/10 transition-colors">
      {/* Preview */}
      <div
        className={`w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden shrink-0 cursor-pointer transition-colors ${
          dragOver ? "border-accent bg-accent/5" : "border-border/50 bg-secondary/20"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        ) : currentUrl ? (
          <img
            src={currentUrl}
            alt={slot.label}
            className="w-full h-full object-contain p-2"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="text-center">
            <ImageIcon className="w-6 h-6 text-muted-foreground/40 mx-auto" />
            <p className="text-[9px] text-muted-foreground/50 mt-1">Drop or click</p>
          </div>
        )}
      </div>

      {/* Info & Actions */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{slot.label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{slot.description}</p>
        <p className="text-[10px] text-muted-foreground/70 italic mt-1">{slot.recommended}</p>

        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="w-3 h-3" />
            {currentUrl ? "Replace" : "Upload"}
          </Button>

          {currentUrl && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-destructive hover:text-destructive"
              onClick={onRemove}
              disabled={isUploading}
            >
              <Trash2 className="w-3 h-3" />
              Remove
            </Button>
          )}
        </div>

        {/* Width Slider */}
        {currentUrl && onWidthChange !== undefined && (
          <div className="mt-4 pt-3 border-t border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground">Display Width</span>
              <span className="ml-auto text-[11px] font-mono text-accent">{localWidth}px</span>
            </div>
            <Slider
              value={[localWidth]}
              onValueChange={handleWidthChange}
              min={60}
              max={300}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-muted-foreground/50">60px</span>
              <span className="text-[9px] text-muted-foreground/50">300px</span>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
