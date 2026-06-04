import { useEffect } from "react";
import { ClipboardCheck, CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSETAChecklist, useUpsertSETACheck, SETA_CHECKLIST_ITEMS } from "@/hooks/useSponsorSD";
import { FadeIn } from "@/components/animations/MotionWrappers";

interface Props {
  financialYear: string;
}

export default function SETAComplianceChecklist({ financialYear }: Props) {
  const { user } = useAuth();
  const { data: items = [] } = useSETAChecklist(financialYear);
  const upsert = useUpsertSETACheck();

  // Seed checklist items if not yet created
  useEffect(() => {
    if (!user || !financialYear || items.length > 0) return;
    // Seed all items
    SETA_CHECKLIST_ITEMS.forEach(item => {
      upsert.mutate({
        sponsor_id: user.id,
        financial_year: financialYear,
        check_key: item.key,
        check_label: item.label,
        is_completed: false,
      });
    });
  }, [user, financialYear, items.length]);

  const completed = items.filter(i => i.is_completed).length;
  const total = SETA_CHECKLIST_ITEMS.length;
  const pct = total > 0 ? (completed / total) * 100 : 0;

  const toggle = (key: string, label: string, currentState: boolean) => {
    if (!user) return;
    upsert.mutate({
      sponsor_id: user.id,
      financial_year: financialYear,
      check_key: key,
      check_label: label,
      is_completed: !currentState,
    });
  };

  const getItemState = (key: string) => items.find(i => i.check_key === key)?.is_completed ?? false;

  return (
    <FadeIn>
      <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">SETA Compliance Checklist</h3>
          </div>
          <span className={cn(
            "text-xs font-medium px-2.5 py-1 rounded-full",
            pct >= 100 ? "bg-success/10 text-success" : pct >= 50 ? "bg-warning/10 text-warning" : "bg-secondary text-muted-foreground"
          )}>
            {completed}/{total} completed
          </span>
        </div>

        {/* Progress */}
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-500", pct >= 100 ? "bg-success" : "bg-primary")} style={{ width: `${pct}%` }} />
        </div>

        {/* Checklist */}
        <div className="space-y-1">
          {SETA_CHECKLIST_ITEMS.map(item => {
            const done = getItemState(item.key);
            return (
              <button
                key={item.key}
                onClick={() => toggle(item.key, item.label, done)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-secondary/50",
                  done && "bg-success/5"
                )}
              >
                {done ? (
                  <CheckCircle className="w-5 h-5 text-success shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <span className={cn("text-xs", done ? "text-muted-foreground line-through" : "text-foreground")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </FadeIn>
  );
}
