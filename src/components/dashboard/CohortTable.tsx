import { useState } from "react";
import { cn } from "@/lib/utils";
import { useCohorts, useEnrolments } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";
import ExportButton from "@/components/ExportButton";
import SafeDeleteCohortDialog from "@/components/cohort-management/SafeDeleteCohortDialog";
import { format } from "date-fns";
import { MoreVertical, Trash2, Archive } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const statusDot: Record<string, string> = {
  active: "bg-success",
  planned: "bg-warning",
  completed: "bg-muted-foreground",
  archived: "bg-muted-foreground/50",
};

export default function CohortTable() {
  const { data: cohorts, isLoading } = useCohorts();
  const { data: enrolments } = useEnrolments();
  const [deleteCohort, setDeleteCohort] = useState<{ id: string; name: string; status: string } | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
      </div>
    );
  }

  // Hide archived cohorts from default view
  const rows = (cohorts ?? []).filter(c => c.status !== "archived");

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">All Cohorts</h3>
          <span className="text-xs text-muted-foreground">{rows.length} total</span>
        </div>
        <ExportButton
          data={rows.map(c => ({
            name: c.name,
            code: c.code,
            programme: (c as any).programmes?.title ?? "",
            start_date: c.start_date,
            end_date: c.end_date,
            status: c.status,
            max_learners: c.max_learners,
          }))}
          filename="cohorts-export"
          columns={[
            { key: "name", label: "Cohort" },
            { key: "code", label: "Code" },
            { key: "programme", label: "Programme" },
            { key: "start_date", label: "Start" },
            { key: "end_date", label: "End" },
            { key: "status", label: "Status" },
            { key: "max_learners", label: "Capacity" },
          ]}
        />
      </div>
      {rows.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-muted-foreground text-sm">No cohorts yet. Create your first cohort to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cohort</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Enrollment</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const enrolled = (enrolments ?? []).filter(e => e.cohort_id === c.id).length;
                const capacity = c.max_learners ?? 30;
                return (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{c.name}</p>
                      {c.code && <p className="text-[10px] text-muted-foreground">{c.code}</p>}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{(c as any).programmes?.title ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">
                      {c.start_date ? format(new Date(c.start_date), "MMM dd, yyyy") : "—"}
                      {" – "}
                      {c.end_date ? format(new Date(c.end_date), "MMM dd, yyyy") : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent transition-all"
                            style={{ width: `${Math.min((enrolled / capacity) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{enrolled}/{capacity}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize">
                        <span className={cn("w-1.5 h-1.5 rounded-full", statusDot[c.status] || "bg-muted-foreground")} />
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-secondary transition-all">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => setDeleteCohort({ id: c.id, name: c.name, status: c.status })}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <SafeDeleteCohortDialog
        cohort={deleteCohort}
        open={!!deleteCohort}
        onOpenChange={(open) => { if (!open) setDeleteCohort(null); }}
      />
    </div>
  );
}
