import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddPathwayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: { title: string; phase: string }) => void;
}

export function AddPathwayDialog({ open, onOpenChange, onAdd }: AddPathwayDialogProps) {
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState("knowledge");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), phase });
    setTitle("");
    setPhase("knowledge");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Pathway</DialogTitle>
          <DialogDescription>Create a new learning track for this programme.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="pathway-title">Title</Label>
            <Input id="pathway-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Foundation Knowledge" />
          </div>
          <div>
            <Label>Phase</Label>
            <Select value={phase} onValueChange={setPhase}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="knowledge">Knowledge</SelectItem>
                <SelectItem value="practical">Practical</SelectItem>
                <SelectItem value="workplace">Workplace / Capstone</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!title.trim()}>Add Pathway</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AddModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: { title: string; module_type: string; pathway_id?: string }) => void;
  pathways: { id: string; title: string }[];
}

export function AddModuleDialog({ open, onOpenChange, onAdd, pathways }: AddModuleDialogProps) {
  const [title, setTitle] = useState("");
  const [moduleType, setModuleType] = useState("theory");
  const [pathwayId, setPathwayId] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      module_type: moduleType,
      pathway_id: pathwayId || undefined,
    });
    setTitle("");
    setModuleType("theory");
    setPathwayId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Module</DialogTitle>
          <DialogDescription>Add a new module to this programme.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="module-title">Title</Label>
            <Input id="module-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Introduction to Data Analysis" />
          </div>
          <div>
            <Label>Module Type</Label>
            <Select value={moduleType} onValueChange={setModuleType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="theory">Knowledge / Theory</SelectItem>
                <SelectItem value="practical">Practical</SelectItem>
                <SelectItem value="workplace">Workplace</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {pathways.length > 0 && (
            <div>
              <Label>Assign to Pathway (optional)</Label>
              <Select value={pathwayId} onValueChange={setPathwayId}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {pathways.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!title.trim()}>Add Module</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Pathway Dialog ──
interface EditPathwayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { id: string; title: string; phase: string }) => void;
  pathway: { id: string; title: string; phase: string } | null;
}

export function EditPathwayDialog({ open, onOpenChange, onSave, pathway }: EditPathwayDialogProps) {
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState("knowledge");

  useEffect(() => {
    if (pathway) {
      setTitle(pathway.title);
      setPhase(pathway.phase);
    }
  }, [pathway]);

  const handleSubmit = () => {
    if (!title.trim() || !pathway) return;
    onSave({ id: pathway.id, title: title.trim(), phase });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Track</DialogTitle>
          <DialogDescription>Update this learning track's details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-pathway-title">Title</Label>
            <Input id="edit-pathway-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Track title" />
          </div>
          <div>
            <Label>Phase</Label>
            <Select value={phase} onValueChange={setPhase}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="knowledge">Knowledge</SelectItem>
                <SelectItem value="practical">Practical</SelectItem>
                <SelectItem value="workplace">Workplace / Capstone</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!title.trim()}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Module Dialog ──
interface EditModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { id: string; title: string; module_type: string; pathway_id?: string | null }) => void;
  module: { id: string; title: string; module_type: string; pathway_id?: string | null } | null;
  pathways: { id: string; title: string }[];
}

export function EditModuleDialog({ open, onOpenChange, onSave, module, pathways }: EditModuleDialogProps) {
  const [title, setTitle] = useState("");
  const [moduleType, setModuleType] = useState("theory");
  const [pathwayId, setPathwayId] = useState("");

  useEffect(() => {
    if (module) {
      setTitle(module.title);
      setModuleType(module.module_type || "theory");
      setPathwayId(module.pathway_id || "none");
    }
  }, [module]);

  const handleSubmit = () => {
    if (!title.trim() || !module) return;
    onSave({
      id: module.id,
      title: title.trim(),
      module_type: moduleType,
      pathway_id: pathwayId === "none" ? null : pathwayId,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Module</DialogTitle>
          <DialogDescription>Update this module's details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-module-title">Title</Label>
            <Input id="edit-module-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Module title" />
          </div>
          <div>
            <Label>Module Type</Label>
            <Select value={moduleType} onValueChange={setModuleType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="theory">Knowledge / Theory</SelectItem>
                <SelectItem value="practical">Practical</SelectItem>
                <SelectItem value="workplace">Workplace</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {pathways.length > 0 && (
            <div>
              <Label>Assign to Pathway</Label>
              <Select value={pathwayId} onValueChange={setPathwayId}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {pathways.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!title.trim()}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Confirmation Dialog ──
interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isPending?: boolean;
}

export function DeleteConfirmDialog({ open, onOpenChange, onConfirm, title, description, isPending }: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
