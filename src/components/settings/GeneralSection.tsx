import { useState } from "react";
import { Globe, Palette, Loader2, Pencil, Check, X } from "lucide-react";
import { usePlatformSettings, useUpdatePlatformSetting } from "@/hooks/usePlatformSettings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function GeneralSection() {
  const { data: generalSettings, isLoading: gLoading } = usePlatformSettings("general");
  const { data: brandingSettings, isLoading: bLoading } = usePlatformSettings("branding");
  const updateSetting = useUpdatePlatformSetting();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (id: string, currentValue: string) => {
    setEditingId(id);
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (editingId) {
      updateSetting.mutate({ id: editingId, setting_value: editValue }, {
        onSuccess: () => setEditingId(null),
      });
    }
  };

  const isLoading = gLoading || bLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Globe className="w-4 h-4 text-accent" /> Platform Configuration
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Core platform identity, locale, and regional settings.</p>
        </div>
        <div className="divide-y divide-border/50">
          {generalSettings?.map((s) => (
            <div key={s.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                {s.description && <p className="text-[10px] text-muted-foreground">{s.description}</p>}
              </div>
              {editingId === s.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-7 text-xs w-48"
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={saveEdit} disabled={updateSetting.isPending}>
                    <Check className="w-3.5 h-3.5 text-success" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{s.setting_value}</span>
                  {s.is_editable && (
                    <button
                      onClick={() => startEdit(s.id, s.setting_value)}
                      className="text-[10px] text-accent hover:underline flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-4 h-4 text-accent" /> Branding
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Visual identity and theme customisation.</p>
        </div>
        <div className="divide-y divide-border/50">
          {brandingSettings?.map((b) => (
            <div key={b.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{b.label}</p>
                {b.description && <p className="text-[10px] text-muted-foreground">{b.description}</p>}
              </div>
              {editingId === b.id ? (
                <div className="flex items-center gap-2">
                  {b.setting_type === "color" && (
                    <input
                      type="color"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-8 h-7 rounded border border-border cursor-pointer"
                    />
                  )}
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-7 text-xs w-40 font-mono"
                    autoFocus={b.setting_type !== "color"}
                  />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={saveEdit} disabled={updateSetting.isPending}>
                    <Check className="w-3.5 h-3.5 text-success" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {b.setting_type === "color" && (
                    <div className="w-5 h-5 rounded-md border border-border" style={{ backgroundColor: b.setting_value }} />
                  )}
                  <span className="text-sm text-muted-foreground font-mono text-[12px]">{b.setting_value}</span>
                  {b.is_editable && (
                    <button
                      onClick={() => startEdit(b.id, b.setting_value)}
                      className="text-[10px] text-accent hover:underline flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
