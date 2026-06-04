import { useState } from "react";
import { FileText, Save, MessageSquare } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssessorReportsForMentor, useUpdateMentorFeedback } from "@/hooks/useMentorData";
import { cn } from "@/lib/utils";

export default function MentorFeedback() {
  const { data: reports = [], isLoading } = useAssessorReportsForMentor();
  const updateFeedback = useUpdateMentorFeedback();
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");

  const handleSave = (id: string) => {
    updateFeedback.mutate({ id, section5_mentor_update: text }, { onSuccess: () => setEditing(null) });
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">Assessor Report Feedback</h1>
        <p className="text-sm text-muted-foreground">Provide workplace mentor updates on assessor reports.</p>
      </FadeIn>

      {isLoading ? <Skeleton className="h-64 rounded-xl" /> : reports.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No Reports Available</h3>
          <p className="text-xs text-muted-foreground">Assessor reports will appear here once submitted.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(reports as any[]).map(r => (
            <div key={r.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{r.programme_name || "Programme Report"}</h4>
                  <p className="text-[10px] text-muted-foreground">
                    Assessor: {r.assessor_name || "—"} · Status: <span className="capitalize">{r.status}</span>
                    {r.start_date && ` · ${new Date(r.start_date).toLocaleDateString()}`}
                    {r.end_date && ` – ${new Date(r.end_date).toLocaleDateString()}`}
                  </p>
                </div>
                {editing !== r.id && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditing(r.id); setText(r.section5_mentor_update || ""); }}>
                    <MessageSquare className="w-3 h-3 mr-1" />{r.section5_mentor_update ? "Edit" : "Add"} Feedback
                  </Button>
                )}
              </div>

              {r.section5_mentor_update && editing !== r.id && (
                <div className="bg-secondary/30 rounded-lg p-3 text-sm text-foreground">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Mentor Workplace Update</p>
                  {r.section5_mentor_update}
                </div>
              )}

              {editing === r.id && (
                <div className="space-y-2">
                  <Textarea placeholder="Describe the learner's workplace progress, challenges observed, and recommendations..." value={text} onChange={e => setText(e.target.value)} rows={4} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSave(r.id)} disabled={updateFeedback.isPending}>
                      <Save className="w-3 h-3 mr-1" />{updateFeedback.isPending ? "Saving..." : "Save Feedback"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
