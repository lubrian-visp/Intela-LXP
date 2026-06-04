import { Plus, Calendar, Users } from "lucide-react";
import CohortTable from "@/components/dashboard/CohortTable";
import CreateCohortDialog from "@/components/cohorts/CreateCohortDialog";
import ExportButton from "@/components/ExportButton";
import { useCohorts, useEnrolments, useRealtimeSync } from "@/hooks/useCoreData";

export default function Cohorts() {
  const { data: cohorts } = useCohorts();
  const { data: enrolments } = useEnrolments();

  useRealtimeSync(["cohorts", "enrolments", "notifications"]);
  const total = cohorts?.length ?? 0;
  const planned = cohorts?.filter(c => c.status === "planned").length ?? 0;
  const totalEnrolled = enrolments?.length ?? 0;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cohorts</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage cohort enrollment, scheduling, and assignments.</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={(cohorts ?? []).map(c => ({
              name: c.name,
              code: c.code,
              status: c.status,
              start_date: c.start_date,
              end_date: c.end_date,
              max_learners: c.max_learners,
            }))}
            filename="cohorts-export"
            columns={[
              { key: "name", label: "Cohort Name" },
              { key: "code", label: "Code" },
              { key: "status", label: "Status" },
              { key: "start_date", label: "Start Date" },
              { key: "end_date", label: "End Date" },
              { key: "max_learners", label: "Max Learners" },
            ]}
          />
          <CreateCohortDialog
            trigger={
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-accent text-accent-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" />
              Create Cohort
            </button>
          }
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-success/10"><Users className="w-5 h-5 text-success" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{total}</p>
            <p className="text-xs text-muted-foreground">Total Cohorts</p>
          </div>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-info/10"><Calendar className="w-5 h-5 text-info" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{planned}</p>
            <p className="text-xs text-muted-foreground">Planned</p>
          </div>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-accent/10"><Users className="w-5 h-5 text-accent" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalEnrolled}</p>
            <p className="text-xs text-muted-foreground">Total Enrolled</p>
          </div>
        </div>
      </div>

      <CohortTable />
    </div>
  );
}
