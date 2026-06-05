import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { BookOpen, Clock, ChevronRight, Search, GraduationCap, Layers, Award, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEnrolments, useRealtimeSync } from "@/hooks/useCoreData";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type TabKey = "all" | "active" | "pending" | "completed";

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  enrolled: { label: "Active", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  pending: { label: "Pending", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  completed: { label: "Completed", color: "bg-primary/10 text-primary border-primary/20" },
};

export default function LearnerProgrammes() {
  usePageTitle("My Programmes", "Learner Portal");
  const { user } = useAuth();
  const { data: rawEnrolments = [], isLoading } = useEnrolments({ learnerId: user?.id });

  // Only show enrolments for approved/published programmes
  const enrolments = useMemo(() =>
    rawEnrolments.filter((e: any) => {
      const progStatus = e.cohorts?.programmes?.status;
      return progStatus === "approved" || progStatus === "published";
    }),
  [rawEnrolments]);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");

  useRealtimeSync(["enrolments", "notifications"]);
  const counts = useMemo(() => ({
    all: enrolments.length,
    active: enrolments.filter((e: any) => e.status === "active" || e.status === "enrolled").length,
    pending: enrolments.filter((e: any) => e.status === "pending").length,
    completed: enrolments.filter((e: any) => e.status === "completed").length,
  }), [enrolments]);

  const filtered = useMemo(() => {
    let list = enrolments as any[];
    if (activeTab === "active") list = list.filter(e => e.status === "active" || e.status === "enrolled");
    else if (activeTab !== "all") list = list.filter(e => e.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        (e.cohorts?.programmes?.title ?? "").toLowerCase().includes(q) ||
        (e.cohorts?.name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [enrolments, activeTab, search]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "pending", label: "Pending" },
    { key: "completed", label: "Completed" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-9 w-20 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const EnrolmentCard = ({ e }: { e: any }) => {
    const progress = e.progress_percentage ?? 0;
    const title = e.cohorts?.programmes?.title ?? "Programme";
    const cohort = e.cohorts?.name ?? "";
    const status = statusConfig[e.status] || statusConfig.pending;

    return (
      <StaggerItem>
        <div className="group bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 overflow-hidden cursor-pointer" onClick={() => navigate(`/learner/programmes/${e.id}`)}>
          {/* Top colour accent */}
          <div className={cn(
            "h-1 w-full",
            e.status === "completed" ? "bg-primary" :
            e.status === "active" || e.status === "enrolled" ? "bg-emerald-500" :
            "bg-amber-400"
          )} />

          <div className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                  {title}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Layers className="w-3 h-3 shrink-0" />
                  {cohort}
                </p>
              </div>
              <Badge variant="outline" className={cn("text-[10px] shrink-0 border", status.color)}>
                {status.label}
              </Badge>
            </div>

            {/* Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-muted-foreground font-medium">Progress</span>
                <span className="text-xs font-bold text-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1 border-t border-border/30">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {e.enrolled_at ? format(new Date(e.enrolled_at), "MMM dd, yyyy") : "—"}
              </span>
              {e.completed_at && (
                <span className="flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  Completed {format(new Date(e.completed_at), "MMM dd, yyyy")}
                </span>
              )}
            </div>

            {/* CTA */}
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary gap-1 h-7 px-2">
                {e.status === "completed" ? "View Certificate" : "Continue Learning"}
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </StaggerItem>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">My Programmes</h1>
            <p className="text-sm text-muted-foreground">Track your learning journey across all enrolled programmes.</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
              <GraduationCap className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">{counts.all}</span>
              <span className="text-muted-foreground text-xs">enrolled</span>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Tabs + Search */}
      <FadeIn delay={0.1}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  activeTab === tab.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span className={cn(
                    "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
                    activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search programmes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 w-full sm:w-60 text-sm"
            />
          </div>
        </div>
      </FadeIn>

      {/* Content */}
      {filtered.length === 0 ? (
        <FadeIn delay={0.2}>
          <div className="bg-card rounded-xl p-12 shadow-sm border border-border/50 text-center">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {enrolments.length === 0 ? "No Programmes Yet" : "No Results Found"}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {enrolments.length === 0
                ? "You haven't been enrolled in any programmes yet."
                : "Try adjusting your search or filter."}
            </p>
            {enrolments.length === 0 && (
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                Browse Available Programmes
              </Button>
            )}
          </div>
        </FadeIn>
      ) : (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((e: any) => <EnrolmentCard key={e.id} e={e} />)}
        </StaggerContainer>
      )}
    </div>
  );
}
