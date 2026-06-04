import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useProgrammesList } from "@/hooks/useProgrammesList";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface Props {
  content: any;
  config: any;
  onContentChange: (key: string, value: any) => void;
  onConfigChange: (key: string, value: any) => void;
}

export function CourseDisplayBlockConfig({ content, config, onContentChange, onConfigChange }: Props) {
  const { data: programmes = [] } = useProgrammesList(["approved", "published", "draft", "pending_approval"]);

  const manualIds: string[] = config.manual_ids || [];

  const addManualProgramme = (id: string) => {
    if (!manualIds.includes(id)) {
      onConfigChange("manual_ids", [...manualIds, id]);
    }
  };

  const removeManualProgramme = (id: string) => {
    onConfigChange("manual_ids", manualIds.filter((i: string) => i !== id));
  };

  return (
    <div className="space-y-4 border-t border-border/30 pt-4">
      <h4 className="text-sm font-semibold text-foreground">Course/Programme Display Settings</h4>

      <div>
        <Label>Block Title</Label>
        <Input value={content.title || ""} onChange={e => onContentChange("title", e.target.value)} placeholder="e.g. Featured Programmes" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Display Mode</Label>
          <Select value={config.display_mode || "grid"} onValueChange={v => onConfigChange("display_mode", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="list">List</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {config.display_mode === "grid" && (
          <div>
            <Label>Columns</Label>
            <Select value={String(config.columns || 3)} onValueChange={v => onConfigChange("columns", parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Columns</SelectItem>
                <SelectItem value="3">3 Columns</SelectItem>
                <SelectItem value="4">4 Columns</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Source</Label>
          <Select value={config.source || "dynamic"} onValueChange={v => onConfigChange("source", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dynamic">Dynamic (Auto)</SelectItem>
              <SelectItem value="manual">Manual Selection</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Max Items</Label>
          <Input type="number" value={config.max_items || 6} onChange={e => onConfigChange("max_items", parseInt(e.target.value))} min={1} max={50} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Sort By</Label>
          <Select value={config.sort_by || "title"} onValueChange={v => onConfigChange("sort_by", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title (A-Z)</SelectItem>
              <SelectItem value="created_at">Newest First</SelectItem>
              <SelectItem value="updated_at">Recently Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Filter Status</Label>
          <Select value={config.filter_status || "published"} onValueChange={v => onConfigChange("filter_status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="published">Published Only</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Show/hide toggles */}
      <div className="space-y-2">
        <Label>Display Options</Label>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={config.show_thumbnail ?? true} onCheckedChange={v => onConfigChange("show_thumbnail", v)} />
            <span className="text-xs text-muted-foreground">Thumbnail</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={config.show_description ?? true} onCheckedChange={v => onConfigChange("show_description", v)} />
            <span className="text-xs text-muted-foreground">Description</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={config.show_instructor ?? false} onCheckedChange={v => onConfigChange("show_instructor", v)} />
            <span className="text-xs text-muted-foreground">Instructor</span>
          </div>
        </div>
      </div>

      {/* Manual Programme Selection */}
      {config.source === "manual" && (
        <div>
          <Label>Select Programmes</Label>
          <Select onValueChange={addManualProgramme}>
            <SelectTrigger><SelectValue placeholder="Add a programme..." /></SelectTrigger>
            <SelectContent className="max-h-60">
              {programmes.filter(p => !manualIds.includes(p.id)).map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {manualIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {manualIds.map(id => {
                const prog = programmes.find(p => p.id === id);
                return (
                  <Badge key={id} variant="secondary" className="text-[10px] pr-1">
                    {prog?.title || id.substring(0, 8)}
                    <button onClick={() => removeManualProgramme(id)} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
