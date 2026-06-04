import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface AddLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: { title: string; description?: string; learning_objective?: string; duration_minutes?: number; is_mandatory: boolean }) => void;
  moduleName?: string;
}

export function AddLessonDialog({ open, onOpenChange, onAdd, moduleName }: AddLessonDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [duration, setDuration] = useState("");
  const [isMandatory, setIsMandatory] = useState(true);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      learning_objective: objective.trim() || undefined,
      duration_minutes: duration ? parseInt(duration) : undefined,
      is_mandatory: isMandatory,
    });
    setTitle("");
    setDescription("");
    setObjective("");
    setDuration("");
    setIsMandatory(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Add Lesson{moduleName ? ` to ${moduleName}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Active Listening" className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Learning Objective</Label>
            <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What will learners achieve?" className="text-sm min-h-[60px]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." className="text-sm min-h-[60px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Duration (minutes)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="45" className="text-sm" />
            </div>
            <div className="space-y-1.5 flex items-end gap-2 pb-0.5">
              <Switch checked={isMandatory} onCheckedChange={setIsMandatory} />
              <Label className="text-xs">Mandatory</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!title.trim()}>Add Lesson</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
