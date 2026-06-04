import { useState } from "react";
import { Plus, Users, Search, Filter, Settings, Info } from "lucide-react";
import { useCohorts, useEnrolments, useRealtimeSync } from "@/hooks/useCoreData";
import CohortCard from "@/components/cohort-management/CohortCard";
import CohortDashboardPanel from "@/components/cohort-management/CohortDashboardPanel";
import AssignLearnersModal from "@/components/cohort-management/AssignLearnersModal";
import AssignStaffModal from "@/components/cohort-management/AssignStaffModal";
import CreateCohortDialog from "@/components/cohorts/CreateCohortDialog";
import ExportButton from "@/components/ExportButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useCohortAssignmentMode } from "@/hooks/useCohortAssignment";
import { useToggleFeatureFlag } from "@/hooks/usePlatformSettings";

export default function CohortManagement() {
  const { data: cohorts, isLoading } = useCohorts();
  const { data: enrolments } = useEnrolments();
  useRealtimeSync(["cohorts", "enrolments", "notifications"]);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [assignLearnersId, setAssignLearnersId] = useState<string | null>(null);
  const [assignStaffId, setAssignStaffId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { isAutomatic: isAutoAssign, isLoading: cohortModeLoading, flagId: cohortFlagId } = useCohortAssignmentMode();
  const toggleFlag = useToggleFeatureFlag();

  const statuses = ["planned", "active", "completed", "suspended"];

  const filteredCohorts = (cohorts ?? []).filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.code ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getEnrolmentCount = (cohortId: string) =>
    enrolments?.filter(e => e.cohort_id === cohortId).length ?? 0;

  const selectedCohort = cohorts?.find(c => c.id === selectedCohortId) ?? null;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cohort Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage cohorts, assign learners and staff, track progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={(cohorts ?? []).map(c => ({
              name: c.name, code: c.code, status: c.status,
              start_date: c.start_date, end_date: c.end_date,
              max_learners: c.max_learners, learners_enrolled: getEnrolmentCount(c.id),
            }))}
            filename="cohort-management-export"
            columns={[
              { key: "name", label: "Cohort" }, { key: "code", label: "Code" },
              { key: "status", label: "Status" }, { key: "start_date", label: "Start" },
              { key: "end_date", label: "End" }, { key: "max_learners", label: "Max" },
              { key: "learners_enrolled", label: "Enrolled" },
            ]}
          />
          <CreateCohortDialog
            trigger={
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-accent text-accent-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" />
                New Cohort
              </button>
            }
          />
        </div>
      </div>

      {/* Cohort Assignment Mode Banner */}
      <div className={cn(
        "rounded-xl border p-4 flex items-center justify-between",
        isAutoAssign
          ? "bg-success/5 border-success/20"
          : "bg-secondary/50 border-border/50"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", isAutoAssign ? "bg-success/10" : "bg-secondary")}>
            <Settings className={cn("w-4 h-4", isAutoAssign ? "text-success" : "text-muted-foreground")} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Cohort Assignment Mode</p>
              <Badge variant="outline" className={cn("text-[10px]", isAutoAssign ? "bg-success/10 text-success border-success/20" : "bg-secondary text-muted-foreground border-border")}>
                {isAutoAssign ? "Automatic" : "Manual"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isAutoAssign
                ? "Learners are auto-assigned to the next available cohort (by capacity and start date) during enrolment."
                : "Staff must manually select a cohort when enrolling learners."}
            </p>
          </div>
        </div>
        <Switch
          checked={isAutoAssign}
          disabled={cohortModeLoading || toggleFlag.isPending || !cohortFlagId}
          onCheckedChange={(checked) => {
            if (cohortFlagId) {
              toggleFlag.mutate({ id: cohortFlagId, is_enabled: checked });
            }
          }}
        />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", count: cohorts?.length ?? 0, color: "text-foreground" },
          { label: "Active", count: cohorts?.filter(c => c.status === "active").length ?? 0, color: "text-success" },
          { label: "Planned", count: cohorts?.filter(c => c.status === "planned").length ?? 0, color: "text-info" },
          { label: "Completed", count: cohorts?.filter(c => c.status === "completed").length ?? 0, color: "text-muted-foreground" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-center">
            <p className={cn("text-2xl font-bold", s.color)}>{s.count}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search cohorts by name or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Badge
            variant={statusFilter === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setStatusFilter(null)}
          >
            All
          </Badge>
          {statuses.map(s => (
            <Badge
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
            >
              {s}
            </Badge>
          ))}
        </div>
      </div>

      {/* Cohort Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card rounded-xl p-5 shadow-card border border-border/50 animate-pulse h-52" />
          ))}
        </div>
      ) : filteredCohorts.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl shadow-card border border-border/50">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No cohorts found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCohorts.map(cohort => (
            <CohortCard
              key={cohort.id}
              cohort={cohort}
              learnersCount={getEnrolmentCount(cohort.id)}
              onOpenDashboard={() => setSelectedCohortId(cohort.id)}
              onAssignLearners={() => setAssignLearnersId(cohort.id)}
              onAssignStaff={() => setAssignStaffId(cohort.id)}
            />
          ))}
        </div>
      )}

      {/* Slide-over Dashboard */}
      <CohortDashboardPanel
        cohort={selectedCohort}
        open={!!selectedCohortId}
        onClose={() => setSelectedCohortId(null)}
      />

      {/* Assignment Modals */}
      <AssignLearnersModal
        cohortId={assignLearnersId}
        open={!!assignLearnersId}
        onClose={() => setAssignLearnersId(null)}
      />
      <AssignStaffModal
        cohortId={assignStaffId}
        open={!!assignStaffId}
        onClose={() => setAssignStaffId(null)}
      />
    </div>
  );
}
