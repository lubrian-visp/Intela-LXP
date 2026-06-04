import { Inbox, Clock, Search, FileCheck, ClipboardCheck, BarChart3 } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Input } from "@/components/ui/input";
import { useSubmissions, useRealtimeSync } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type QueueView = "submissions" | "grading" | "summary" | "pending";

const viewLabels: Record<QueueView, { label: string; icon: React.ElementType }> = {
  submissions: { label: "Submission Review", icon: FileCheck },
  grading: { label: "Grade Entry", icon: ClipboardCheck },
  summary: { label: "Queue Summary", icon: BarChart3 },
  pending: { label: "Pending Reviews", icon: Inbox },
};

export default function AssessorQueue() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = (searchParams.get("view") as QueueView) || "submissions";
  const [search, setSearch] = useState("");
  const { data: submissions = [], isLoading } = useSubmissions();
  useRealtimeSync(["assessment_submissions", "notifications"]);

  const allSubs = submissions as any[];
  const pending = allSubs.filter((s: any) => s.status === "pending" || s.status === "submitted");
  const graded = allSubs.filter((s: any) => s.status === "graded" || s.status === "assessed");

  const applySearch = (list: any[]) =>
    list.filter((s: any) => !search || (s.assessments?.title ?? "").toLowerCase().includes(search.toLowerCase()));

  const handleTabChange = (value: string) => {
    setSearchParams({ view: value });
  };

  const renderSubmissionCard = (s: any, showScore = false) => (
    <div key={s.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{s.assessments?.title ?? "Assessment"}</h4>
          <p className="text-[10px] text-muted-foreground">Learner ID: {s.learner_id?.slice(0, 8)}…</p>
        </div>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full font-medium capitalize",
          s.status === "graded" || s.status === "assessed"
            ? "bg-primary/10 text-primary"
            : "bg-warning/10 text-warning"
        )}>{s.status}</span>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <Clock className="w-3 h-3" />
        {s.submitted_at ? format(new Date(s.submitted_at), "MMM dd, yyyy") : "Not submitted"}
        {showScore && s.score != null && (
          <span className="ml-auto text-xs font-semibold text-foreground">Score: {s.score}</span>
        )}
      </div>
    </div>
  );

  const renderEmptyState = (message: string) => (
    <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
      <Inbox className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
      <h3 className="text-sm font-semibold text-foreground mb-1">Nothing Here</h3>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">Assessment Queue</h1>
        <p className="text-sm text-muted-foreground">{pending.length} submission{pending.length !== 1 ? "s" : ""} awaiting review.</p>
      </FadeIn>

      <Tabs value={activeView} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          {(Object.keys(viewLabels) as QueueView[]).map((key) => {
            const { label, icon: Icon } = viewLabels[key];
            return (
              <TabsTrigger key={key} value={key} className="flex items-center gap-1.5 text-xs">
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="relative max-w-sm mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search assessments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {isLoading ? <Skeleton className="h-64 rounded-xl mt-4" /> : (
          <>
            {/* Submission Review: all pending/submitted */}
            <TabsContent value="submissions" className="space-y-3 mt-4">
              {applySearch(pending).length === 0
                ? renderEmptyState("No submissions awaiting review.")
                : applySearch(pending).map((s) => renderSubmissionCard(s))}
            </TabsContent>

            {/* Grade Entry: focus on items ready for scoring */}
            <TabsContent value="grading" className="space-y-3 mt-4">
              {applySearch(allSubs).length === 0
                ? renderEmptyState("No submissions available for grading.")
                : applySearch(allSubs).map((s) => renderSubmissionCard(s, true))}
            </TabsContent>

            {/* Queue Summary: stats overview */}
            <TabsContent value="summary" className="mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 text-center">
                  <p className="text-2xl font-bold text-foreground">{pending.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Pending Review</p>
                </div>
                <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 text-center">
                  <p className="text-2xl font-bold text-foreground">{graded.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Graded</p>
                </div>
                <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 text-center">
                  <p className="text-2xl font-bold text-foreground">{allSubs.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Submissions</p>
                </div>
              </div>
              {applySearch(pending).length === 0
                ? renderEmptyState("Queue is clear. All caught up!")
                : <div className="space-y-3">{applySearch(pending).map((s) => renderSubmissionCard(s))}</div>}
            </TabsContent>

            {/* Pending Reviews: strictly pending items */}
            <TabsContent value="pending" className="space-y-3 mt-4">
              {applySearch(pending).length === 0
                ? renderEmptyState("No pending reviews at this time.")
                : applySearch(pending).map((s) => renderSubmissionCard(s))}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
