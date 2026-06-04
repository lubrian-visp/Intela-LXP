import { FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const poeStatusStyle: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  pending: { color: "text-info", bg: "bg-info/10", dot: "bg-info", label: "Submitted" },
  submitted: { color: "text-info", bg: "bg-info/10", dot: "bg-info", label: "Submitted" },
  assessed: { color: "text-success", bg: "bg-success/10", dot: "bg-success", label: "Assessed" },
  approved: { color: "text-success", bg: "bg-success/10", dot: "bg-success", label: "Approved" },
  resubmit: { color: "text-warning", bg: "bg-warning/10", dot: "bg-warning", label: "Revision Needed" },
  moderated: { color: "text-accent-foreground", bg: "bg-accent/10", dot: "bg-accent", label: "Moderated" },
};

interface Props {
  submissions: any[];
}

export default function LearnerSubmissionsTable({ submissions }: Props) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">My Submissions</h3>
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        {submissions.length === 0 ? (
          <div className="p-8 text-center">
            <FileCheck className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Assessment</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Submitted</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {submissions.slice(0, 8).map((s: any) => {
                const st = poeStatusStyle[s.status] ?? poeStatusStyle.pending;
                return (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-foreground">{s.assessments?.title ?? "Assessment"}</p>
                      {s.feedback && <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[250px]">"{s.feedback}"</p>}
                    </td>
                    <td className="px-5 py-3 text-xs text-foreground font-medium">
                      {s.score != null ? `${s.score}/${s.assessments?.max_score ?? 100}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {s.submitted_at ? format(new Date(s.submitted_at), "MMM dd, yyyy") : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium", st.color)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
