import { useState } from "react";
import { Monitor, Tablet, Smartphone, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FontPicker from "./FontPicker";
import {
  ELEMENT_GROUPS,
  FONT_WEIGHTS,
  loadGoogleFont,
  type TypographyAssignment,
  type TypographySettings,
} from "@/hooks/useTypographyManager";

type Device = "desktop" | "tablet" | "mobile";

interface TypographyControlPanelProps {
  assignments: TypographyAssignment[];
  onUpdate: (id: string, changes: Partial<TypographyAssignment>) => void;
}

const deviceIcons = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

const TEXT_TRANSFORMS = ["none", "uppercase", "lowercase", "capitalize"];

export default function TypographyControlPanel({ assignments, onUpdate }: TypographyControlPanelProps) {
  const [activeGroup, setActiveGroup] = useState("headings");
  const [activeDevice, setActiveDevice] = useState<Device>("desktop");

  const assignment = assignments.find((a) => a.element_group === activeGroup);
  const groupMeta = ELEMENT_GROUPS.find((g) => g.key === activeGroup);

  const settingsKey = `${activeDevice}_settings` as keyof Pick<TypographyAssignment, "desktop_settings" | "tablet_settings" | "mobile_settings">;
  const currentSettings: TypographySettings = assignment
    ? (assignment[settingsKey] as TypographySettings)
    : { fontSize: "16px", lineHeight: "1.5", letterSpacing: "0", textTransform: "none" };

  const updateSettings = (field: keyof TypographySettings, value: string) => {
    if (!assignment) return;
    const updated = { ...currentSettings, [field]: value };
    onUpdate(assignment.id, { [settingsKey]: updated });
  };

  const parseFontSize = (fs: string): number => {
    return parseInt(fs) || 16;
  };

  return (
    <div className="grid grid-cols-[240px_1fr] gap-6">
      {/* Element Group Selector */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Element Groups</p>
        {ELEMENT_GROUPS.map((g) => {
          const a = assignments.find((a) => a.element_group === g.key);
          const isActive = activeGroup === g.key;
          return (
            <button
              key={g.key}
              onClick={() => setActiveGroup(g.key)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm ${
                isActive
                  ? "bg-accent/10 border border-accent/20 shadow-sm"
                  : "hover:bg-secondary/50 border border-transparent"
              }`}
            >
              <div className="font-medium">{g.label}</div>
              <div className="text-[10px] text-muted-foreground">{g.description}</div>
              {a && (
                <div className="text-[10px] text-accent mt-0.5 font-medium">{a.font_family}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="space-y-5">
        {/* Device Tabs */}
        <div className="flex items-center gap-2">
          {(["desktop", "tablet", "mobile"] as Device[]).map((d) => {
            const Icon = deviceIcons[d];
            return (
              <Button
                key={d}
                variant={activeDevice === d ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveDevice(d)}
                className="gap-1.5 capitalize"
              >
                <Icon className="w-3.5 h-3.5" />
                {d}
              </Button>
            );
          })}
          <Badge variant="outline" className="ml-auto text-[10px]">
            {activeDevice === "desktop" ? "≥1024px" : activeDevice === "tablet" ? "768–1023px" : "<768px"}
          </Badge>
        </div>

        {assignment ? (
          <div className="grid grid-cols-2 gap-4">
            {/* Font Family */}
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block">Font Family</Label>
              <FontPicker
                value={assignment.font_family}
                onChange={(family, source) => {
                  onUpdate(assignment.id, { font_family: family, font_source: source });
                  if (source === "google") loadGoogleFont(family, ["400", "700"]);
                }}
              />
            </div>

            {/* Weight */}
            <div>
              <Label className="text-xs mb-1.5 block">Weight</Label>
              <Select
                value={assignment.font_weight}
                onValueChange={(v) => onUpdate(assignment.id, { font_weight: v })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_WEIGHTS.filter((w) =>
                    assignment.loaded_variants.includes(w.value)
                  ).map((w) => (
                    <SelectItem key={w.value} value={w.value} className="text-xs">
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <div>
              <Label className="text-xs mb-1.5 block">Size</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[parseFontSize(currentSettings.fontSize)]}
                  onValueChange={([v]) => updateSettings("fontSize", `${v}px`)}
                  min={8}
                  max={96}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-12 text-right">{currentSettings.fontSize}</span>
              </div>
            </div>

            {/* Line Height */}
            <div>
              <Label className="text-xs mb-1.5 block">Line Height</Label>
              <Input
                value={currentSettings.lineHeight}
                onChange={(e) => updateSettings("lineHeight", e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Letter Spacing */}
            <div>
              <Label className="text-xs mb-1.5 block">Letter Spacing</Label>
              <Input
                value={currentSettings.letterSpacing}
                onChange={(e) => updateSettings("letterSpacing", e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Text Transform */}
            <div>
              <Label className="text-xs mb-1.5 block">Transform</Label>
              <Select
                value={currentSettings.textTransform}
                onValueChange={(v) => updateSettings("textTransform", v)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEXT_TRANSFORMS.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Loaded Variants */}
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block">Loaded Variants</Label>
              <div className="flex flex-wrap gap-1">
                {FONT_WEIGHTS.map((w) => {
                  const selected = assignment.loaded_variants.includes(w.value);
                  return (
                    <Badge
                      key={w.value}
                      variant={selected ? "default" : "outline"}
                      className="cursor-pointer text-[10px] px-2 py-0.5"
                      onClick={() => {
                        const newVariants = selected
                          ? assignment.loaded_variants.filter((v: string) => v !== w.value)
                          : [...assignment.loaded_variants, w.value];
                        onUpdate(assignment.id, { loaded_variants: newVariants });
                      }}
                    >
                      {w.value}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Only selected weights will be loaded for performance</p>
            </div>

            {/* Preview */}
            <div className="col-span-2 mt-2">
              <Label className="text-xs mb-1.5 block">Preview</Label>
              <Card className="bg-secondary/30">
                <CardContent className="p-4">
                  <p
                    style={{
                      fontFamily: `'${assignment.font_family}', ${
                        ELEMENT_GROUPS.find((g) => g.key === activeGroup)?.key === "special" ? "monospace" : "sans-serif"
                      }`,
                      fontWeight: assignment.font_weight,
                      fontSize: currentSettings.fontSize,
                      lineHeight: currentSettings.lineHeight,
                      letterSpacing: currentSettings.letterSpacing,
                      textTransform: currentSettings.textTransform as any,
                    }}
                    className="text-foreground"
                  >
                    The quick brown fox jumps over the lazy dog
                  </p>
                  <p
                    style={{
                      fontFamily: `'${assignment.font_family}', sans-serif`,
                      fontWeight: assignment.font_weight,
                      fontSize: currentSettings.fontSize,
                      lineHeight: currentSettings.lineHeight,
                      letterSpacing: currentSettings.letterSpacing,
                    }}
                    className="text-muted-foreground mt-2"
                  >
                    ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No assignment found for {groupMeta?.label}</p>
        )}
      </div>
    </div>
  );
}
