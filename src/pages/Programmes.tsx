import { Plus, Search, LayoutGrid, List, Pencil, Hammer, MoreVertical, Trash2, Upload, Archive, AlertTriangle, Users, BookOpen, GraduationCap, ShieldCheck, ShieldAlert } from "lucide-react";
import ForceDeleteProgrammeDialog from "@/components/programmes/ForceDeleteProgrammeDialog";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useProgrammes, useDeleteProgramme, useArchiveProgramme, useRealtimeSync, getProgrammeDeletionImpact, type DeletionImpact } from "@/hooks/useCoreData";
import CreateProgrammeDialog from "@/components/programmes/CreateProgrammeDialog";
import BulkProgrammeImportDialog from "@/components/programmes/BulkProgrammeImportDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Programme = Tables<"programmes"> & {
  programme_types: { name: string; color: string } | null;
  countries: { name: string; iso_code: string } | null;
};

const statusStyles: Record<string, string> = {
  draft: "bg-warning/10 text-warning border-warning/20",
  submitted: "bg-info/10 text-info border-info/20",
  pending_approval: "bg-info/10 text-info border-info/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  published: "bg-primary/10 text-primary border-primary/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  archived: "bg-muted text-muted-foreground border-border",
};

function ProgrammeGridCard({ programme, onEdit, onBuild, onDelete }: { programme: Programme; onEdit: (p: Programme) => void; onBuild: (id: string) => void; onDelete: (p: Programme) => void }) {
  return (
    <div className="group bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover border border-border/50 hover:border-accent/30 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border", statusStyles[programme.status] || statusStyles.draft)}>
              {programme.status}
            </span>
            {programme.programme_types && (
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {programme.programme_types.name}
              </span>
            )}
            <span className="text-[10px] font-mono text-muted-foreground/60">
              {(programme as any).version ?? "v1.0"}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-accent transition-colors">
            {programme.title}
          </h3>
          {programme.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{programme.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-secondary transition-all">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onEdit(programme)}>
              <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onBuild(programme.id)}>
              <Hammer className="w-3.5 h-3.5 mr-2" /> Build
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(programme)} className="text-destructive focus:text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center p-2 rounded-lg bg-secondary/50">
          <p className="text-lg font-bold text-foreground">{programme.credits ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground">Credits</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-secondary/50">
          <p className="text-lg font-bold text-foreground">{programme.nqf_level ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground">NQF Level</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-secondary/50">
          <p className="text-lg font-bold text-foreground">{programme.duration_months ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground">Months</p>
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onBuild(programme.id); }}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
      >
        <Hammer className="w-3.5 h-3.5" />
        Build
      </button>
    </div>
  );
}

/** Impact-aware deletion dialog */
function SafeDeleteDialog({
  programme,
  open,
  onOpenChange,
}: {
  programme: Programme | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [impact, setImpact] = useState<DeletionImpact | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForceDelete, setShowForceDelete] = useState(false);
  const [forceDeleteProgramme, setForceDeleteProgramme] = useState<Programme | null>(null);
  const deleteMutation = useDeleteProgramme();
  const archiveMutation = useArchiveProgramme();
  const { hasRole } = useAuth();

  const canHardDeleteRole = hasRole("super_admin") || hasRole("operations");

  useEffect(() => {
    if (open && programme) {
      setLoading(true);
      setImpact(null);
      getProgrammeDeletionImpact(programme.id)
        .then(setImpact)
        .finally(() => setLoading(false));
    }
  }, [open, programme?.id]);

  const handleDelete = async () => {
    if (!programme) return;
    try {
      await deleteMutation.mutateAsync(programme.id);
      toast.success(`"${programme.title}" permanently deleted`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete programme");
    }
  };

  const handleArchive = async () => {
    if (!programme) return;
    try {
      await archiveMutation.mutateAsync(programme.id);
      toast.success(`"${programme.title}" archived successfully`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to archive programme");
    }
  };

  const isPending = deleteMutation.isPending || archiveMutation.isPending;

  return (
    <>
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Remove Programme
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You are about to remove{" "}
                <span className="font-semibold text-foreground">"{programme?.title}"</span>.
              </p>

              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs py-4">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                  Analysing linked data…
                </div>
              )}

              {impact && !loading && (
                <>
                  {/* Impact summary */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 text-xs">
                      <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span><strong className="text-foreground">{impact.learnerCount}</strong> Learner registrations</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 text-xs">
                      <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span><strong className="text-foreground">{impact.enrolmentCount}</strong> Enrolments</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 text-xs">
                      <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span><strong className="text-foreground">{impact.moduleCount}</strong> Modules</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 text-xs">
                      <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span><strong className="text-foreground">{impact.assessmentCount}</strong> Assessments ({impact.submissionCount} submissions)</span>
                    </div>
                  </div>

                  {/* Blocked — learners exist */}
                  {!impact.canHardDelete && (
                    <div className="flex gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-warning">Permanent deletion blocked</p>
                        <p className="text-muted-foreground">
                          This programme has linked learners or active enrolments. Per data protection regulations, learner records cannot be cascade-deleted.
                          <strong className="text-foreground"> Archive instead</strong> to preserve all records while removing the programme from active use.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Safe to delete — role-gated */}
                  {impact.canHardDelete && !canHardDeleteRole && (
                    <div className="flex gap-3 p-3 rounded-lg bg-info/10 border border-info/20">
                      <ShieldCheck className="w-5 h-5 text-info shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-info">Insufficient authority</p>
                        <p className="text-muted-foreground">
                          Only Super Admin or Operations Control may permanently delete programmes. You may <strong className="text-foreground">archive</strong> this programme instead.
                        </p>
                      </div>
                    </div>
                  )}

                  {impact.canHardDelete && canHardDeleteRole && (
                    <div className="flex gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-destructive">Permanent deletion available</p>
                        <p className="text-muted-foreground">
                          No learners are linked. You may permanently delete this programme and all its structural data (modules, content, assessments). This action <strong className="text-foreground">cannot be undone</strong>.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>

          {/* Archive is always available */}
          {impact && !loading && (
            <button
              onClick={handleArchive}
              disabled={isPending || programme?.status === "archived"}
              className={cn(
                "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
                programme?.status === "archived"
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20"
              )}
            >
              <Archive className="w-4 h-4" />
              {archiveMutation.isPending ? "Archiving…" : programme?.status === "archived" ? "Already Archived" : "Archive"}
            </button>
          )}

          {/* Hard delete only if safe AND user has authority */}
          {impact?.canHardDelete && canHardDeleteRole && !loading && (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete Permanently"}
            </AlertDialogAction>
          )}

          {/* Force Delete — only when blocked AND user has authority */}
          {impact && !impact.canHardDelete && canHardDeleteRole && !loading && (
            <button
              onClick={() => {
                setForceDeleteProgramme(programme);
                onOpenChange(false);
                setShowForceDelete(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
            >
              <ShieldAlert className="w-4 h-4" />
              Force Delete…
            </button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <ForceDeleteProgrammeDialog
      programme={forceDeleteProgramme ? { id: forceDeleteProgramme.id, title: forceDeleteProgramme.title } : null}
      open={showForceDelete}
      onOpenChange={(v) => { setShowForceDelete(v); if (!v) setForceDeleteProgramme(null); }}
    />
    </>
  );
}

export default function Programmes() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editProgramme, setEditProgramme] = useState<Programme | null>(null);
  const [deleteProgramme, setDeleteProgramme] = useState<Programme | null>(null);
  const navigate = useNavigate();

  const { data: programmes, isLoading } = useProgrammes(filter === "all" ? undefined : filter);
  useRealtimeSync(["programmes", "approval_tasks", "notifications"]);
  const filters = ["all", "draft", "submitted", "pending_approval", "approved", "published", "suspended", "archived"];

  const filtered = (programmes ?? []).filter(
    (p) => {
      // Hide archived from default "all" view; only show when explicitly filtering by "archived"
      if (filter === "all" && p.status === "archived") return false;
      return !search || p.title.toLowerCase().includes(search.toLowerCase());
    }
  ) as Programme[];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Programme Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">Registry of programmes. Manage metadata, lifecycle, and launch the Builder.</p>
        </div>
        <div className="flex items-center gap-2">
          <BulkProgrammeImportDialog
            trigger={
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary text-foreground text-sm font-semibold border border-border hover:bg-secondary/80 transition-colors">
                <Upload className="w-4 h-4" />
                Bulk Import
              </button>
            }
          />
          <CreateProgrammeDialog
            trigger={
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-accent text-accent-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" />
                New Programme
              </button>
            }
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search programmes..."
              className="pl-8 pr-4 py-1.5 text-xs bg-secondary rounded-lg border-0 outline-none focus:ring-2 focus:ring-accent w-52 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center bg-secondary rounded-lg p-0.5">
            <button onClick={() => setView("grid")} className={cn("p-1.5 rounded-md transition-colors", view === "grid" ? "bg-card shadow-sm" : "")}>
              <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button onClick={() => setView("list")} className={cn("p-1.5 rounded-md transition-colors", view === "list" ? "bg-card shadow-sm" : "")}>
              <List className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      )}

      {/* Grid / List */}
      {!isLoading && (
        <div className={cn(
          view === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-3"
        )}>
          {filtered.map(p => (
            <ProgrammeGridCard key={p.id} programme={p} onEdit={setEditProgramme} onBuild={(id) => navigate(`/programmes/${id}/builder`)} onDelete={setDeleteProgramme} />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm">
            {programmes?.length === 0
              ? "No programmes yet. Create your first programme to get started."
              : "No programmes found for this filter."}
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <CreateProgrammeDialog
        programme={editProgramme}
        open={!!editProgramme}
        onOpenChange={(open) => { if (!open) setEditProgramme(null); }}
      />

      {/* Safe Delete / Archive Dialog */}
      <SafeDeleteDialog
        programme={deleteProgramme}
        open={!!deleteProgramme}
        onOpenChange={(open) => { if (!open) setDeleteProgramme(null); }}
      />
    </div>
  );
}
