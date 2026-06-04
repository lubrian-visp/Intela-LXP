import { useState } from "react";
import {
  Type, BookOpen, Upload, Palette, Settings2, History,
  Download, UploadIcon, RotateCcw, Send, Save, Layers, Eye
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import FontLibraryBrowser from "@/components/typography/FontLibraryBrowser";
import CustomFontUpload from "@/components/typography/CustomFontUpload";
import TypographyControlPanel from "@/components/typography/TypographyControlPanel";
import TypographyPreview from "@/components/typography/TypographyPreview";
import {
  useTypographyAssignments,
  useUpdateTypographyAssignment,
  usePublishTypography,
  useRevertDraftToPublished,
  useTypographyPresets,
  useApplyPreset,
  useSavePreset,
  useDeletePreset,
  useFontAuditLog,
  exportTypographySettings,
  parseTypographyImport,
  type TypographyAssignment,
  type TypographyPreset,
} from "@/hooks/useTypographyManager";
import { toast } from "@/hooks/use-toast";

export default function FontManager() {
  const [activeTab, setActiveTab] = useState("typography");
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetDesc, setPresetDesc] = useState("");

  // Data
  const { data: draftAssignments = [] } = useTypographyAssignments(true);
  const { data: publishedAssignments = [] } = useTypographyAssignments(false);
  const { data: presets = [] } = useTypographyPresets();
  const { data: auditLog = [] } = useFontAuditLog();

  // Mutations
  const updateAssignment = useUpdateTypographyAssignment();
  const publishTypography = usePublishTypography();
  const revertDraft = useRevertDraftToPublished();
  const applyPreset = useApplyPreset();
  const savePreset = useSavePreset();
  const deletePreset = useDeletePreset();

  const handleUpdate = (id: string, changes: Partial<TypographyAssignment>) => {
    updateAssignment.mutate({ id, ...changes });
  };

  const handleExport = () => {
    const json = exportTypographySettings(draftAssignments);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `typography-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Settings exported" });
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const assignments = parseTypographyImport(text);
      if (!assignments) {
        toast({ title: "Invalid import file", variant: "destructive" });
        return;
      }
      // Apply as draft via preset mechanism
      await applyPreset.mutateAsync({
        id: "import",
        preset_name: "Import",
        description: null,
        category: "import",
        assignments,
        is_system: false,
        created_at: "",
      });
      toast({ title: "Settings imported as draft" });
    };
    input.click();
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;
    await savePreset.mutateAsync({ name: presetName.trim(), description: presetDesc.trim() || undefined });
    setSavePresetOpen(false);
    setPresetName("");
    setPresetDesc("");
  };

  // Check if draft differs from published
  const hasDraftChanges = JSON.stringify(
    draftAssignments.map(({ id, is_draft, updated_at, ...rest }: any) => rest)
  ) !== JSON.stringify(
    publishedAssignments.map(({ id, is_draft, updated_at, ...rest }: any) => rest)
  );

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <Type className="w-5 h-5 text-accent" />
            <h1 className="text-2xl font-bold text-foreground">Site-Wide Font Management</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Control typography across your entire platform
          </p>
        </div>
        <div className="flex gap-2">
          {hasDraftChanges && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs animate-pulse">
              Unpublished changes
            </Badge>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={!hasDraftChanges}>
                <RotateCcw className="w-3.5 h-3.5" />
                Revert
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revert Draft?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will discard all draft changes and reset to the currently published typography settings.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => revertDraft.mutate()}>Revert</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" className="gap-1.5" disabled={!hasDraftChanges || publishTypography.isPending}>
                <Send className="w-3.5 h-3.5" />
                Publish
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Publish Typography?</AlertDialogTitle>
                <AlertDialogDescription>
                  Typography changes will go live immediately across all platform pages.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => publishTypography.mutate()}>Publish Now</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent p-0 h-auto gap-0 border-b border-border/30 rounded-none w-full justify-start mb-6">
          {[
            { id: "typography", label: "Typography Controls", icon: Settings2 },
            { id: "preview", label: "Live Preview", icon: Eye },
            { id: "google", label: "Google Fonts", icon: BookOpen },
            { id: "custom", label: "Custom Fonts", icon: Upload },
            { id: "system", label: "System Fonts", icon: Layers },
            { id: "presets", label: "Presets", icon: Palette },
            { id: "export", label: "Export / Import", icon: Download },
            { id: "audit", label: "Audit Log", icon: History },
          ].map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-xs font-medium gap-1.5"
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Typography Controls */}
        <TabsContent value="typography">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Global Typography Settings</CardTitle>
              <CardDescription className="text-xs">
                Assign fonts and configure responsive settings for each element group. Changes are saved as drafts until published.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TypographyControlPanel
                assignments={draftAssignments}
                onUpdate={handleUpdate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Preview */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Live Preview</CardTitle>
                  <CardDescription className="text-xs">See how typography changes will look across the platform</CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px]">Draft Preview</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <TypographyPreview assignments={draftAssignments} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Fonts */}
        <TabsContent value="google">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Google Fonts Library</CardTitle>
              <CardDescription className="text-xs">Browse and select from Google's collection of open-source fonts</CardDescription>
            </CardHeader>
            <CardContent>
              <FontLibraryBrowser source="google" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Fonts */}
        <TabsContent value="custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upload Custom Fonts</CardTitle>
                <CardDescription className="text-xs">
                  Add your brand fonts for unique typography across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CustomFontUpload />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Custom Fonts</CardTitle>
                <CardDescription className="text-xs">Manage uploaded custom font families</CardDescription>
              </CardHeader>
              <CardContent>
                <FontLibraryBrowser source="custom" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Fonts */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">System Fonts</CardTitle>
              <CardDescription className="text-xs">
                Fallback fonts available on all platforms without additional loading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FontLibraryBrowser source="system" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Presets */}
        <TabsContent value="presets">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Typography Presets</h3>
                <p className="text-xs text-muted-foreground">Apply pre-configured typography or save your own</p>
              </div>
              <Dialog open={savePresetOpen} onOpenChange={setSavePresetOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Save className="w-3.5 h-3.5" />
                    Save Current as Preset
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Typography Preset</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <Label className="text-xs">Preset Name *</Label>
                      <Input value={presetName} onChange={(e) => setPresetName(e.target.value)} className="h-9 text-xs mt-1.5" placeholder="e.g. My Brand Typography" />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input value={presetDesc} onChange={(e) => setPresetDesc(e.target.value)} className="h-9 text-xs mt-1.5" placeholder="Brief description…" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setSavePresetOpen(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleSavePreset} disabled={!presetName.trim()}>Save Preset</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {presets.map((preset) => (
                <Card key={preset.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-semibold">{preset.preset_name}</h4>
                        {preset.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{preset.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {preset.is_system && <Badge variant="outline" className="text-[9px]">System</Badge>}
                        <Badge variant="outline" className="text-[9px] capitalize">{preset.category}</Badge>
                      </div>
                    </div>
                    {/* Preview samples */}
                    <div className="space-y-1 mt-3 mb-4">
                      {(preset.assignments || []).slice(0, 3).map((a: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="font-medium capitalize w-16">{a.element_group}:</span>
                          <span>{a.font_family} ({a.font_weight})</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-1 text-xs gap-1">
                            <Palette className="w-3 h-3" />
                            Apply
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apply Preset: {preset.preset_name}?</AlertDialogTitle>
                            <AlertDialogDescription>This will replace your current draft typography settings.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => applyPreset.mutate(preset)}>Apply</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      {!preset.is_system && (
                        <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => deletePreset.mutate(preset.id)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Export / Import */}
        <TabsContent value="export">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Settings
                </CardTitle>
                <CardDescription className="text-xs">
                  Download your typography configuration as a JSON file for backup or sharing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-secondary/30 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-2">Current draft includes:</p>
                    <div className="space-y-1">
                      {draftAssignments.map((a) => (
                        <div key={a.id} className="text-xs flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px]">{a.element_group}</Badge>
                          <span>{a.font_family} ({a.font_weight})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleExport} className="w-full gap-1.5">
                    <Download className="w-4 h-4" />
                    Export Draft Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UploadIcon className="w-4 h-4" />
                  Import Settings
                </CardTitle>
                <CardDescription className="text-xs">
                  Import typography settings from a previously exported JSON file
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center">
                    <UploadIcon className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Select a typography settings JSON file to import</p>
                  </div>
                  <Button variant="outline" onClick={handleImport} className="w-full gap-1.5">
                    <UploadIcon className="w-4 h-4" />
                    Import Settings
                  </Button>
                  <Button variant="outline" className="w-full gap-1.5 text-destructive hover:text-destructive" onClick={() => revertDraft.mutate()}>
                    <RotateCcw className="w-4 h-4" />
                    Reset to Default
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Log */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Typography Change History</CardTitle>
              <CardDescription className="text-xs">Track all typography changes with who, when, and what was modified</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No changes recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
                      <History className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium capitalize">{entry.action.replace(/_/g, " ")}</span>
                          <Badge variant="outline" className="text-[9px]">{entry.entity_type}</Badge>
                        </div>
                        {entry.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{entry.notes}</p>}
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {new Date(entry.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
