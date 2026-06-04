import { History, Search } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Input } from "@/components/ui/input";
import { useSubmissions } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function AssessorHistory() {
  const [search, setSearch] = useState("");
  const { data: submissions = [], isLoading } = useSubmissions();

  const completed = (submissions as any[]).filter((s: any) => s.status !== "pending" && s.status !== "submitted");
  const filtered = completed.filter((s: any) =>
    !search || (s.assessments?.title ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const statusStyle: Record<string, string> = {
    assessed: "bg-success/10 text-success",
    approved: "bg-success/10 text-success",
    moderated: "bg-accent/10 text-accent-foreground",
    resubmit: "bg-warning/10 text-warning",
    rejected: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">Assessment History</h1>
        <p className="text-sm text-muted-foreground">Previously reviewed assessments.</p>
      </FadeIn>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      {isLoading ? <Skeleton className="h-64 rounded-xl" /> : filtered.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <History className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No assessment history.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Assessment</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Score</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Status</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Assessed</th>
            </tr></thead>
            <tbody>
              {filtered.map((s: any) => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/20">
                  <td className="px-5 py-3 font-medium text-foreground">{s.assessments?.title ?? "Assessment"}</td>
                  <td className="px-5 py-3 text-xs">{s.score != null ? `${s.score}/${s.assessments?.max_score ?? 100}` : "—"}</td>
                  <td className="px-5 py-3"><span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium capitalize", statusStyle[s.status] ?? "bg-secondary text-muted-foreground")}>{s.status}</span></td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{s.assessed_at ? format(new Date(s.assessed_at), "MMM dd, yyyy") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
