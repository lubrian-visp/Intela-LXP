import { ListTodo, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgendaItem {
  title: string;
  duration?: number;
  completed?: boolean;
}

interface MeetingAgendaPanelProps {
  agenda: AgendaItem[];
  onToggleComplete?: (index: number) => void;
  isFacilitator: boolean;
}

export default function MeetingAgendaPanel({
  agenda,
  onToggleComplete,
  isFacilitator,
}: MeetingAgendaPanelProps) {
  const totalMinutes = agenda.reduce((sum, item) => sum + (item.duration || 0), 0);
  const completedCount = agenda.filter((i) => i.completed).length;

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-1.5">
        <ListTodo className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Meeting Agenda</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {completedCount}/{agenda.length} done
          {totalMinutes > 0 && ` · ${totalMinutes}m`}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[300px] p-3">
        {agenda.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No agenda items set.</p>
        ) : (
          <div className="space-y-1">
            {agenda.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-lg transition-colors",
                  item.completed ? "bg-success/5" : "hover:bg-muted/50"
                )}
              >
                {isFacilitator ? (
                  <button
                    onClick={() => onToggleComplete?.(i)}
                    className={cn(
                      "mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                      item.completed
                        ? "bg-success border-success text-success-foreground"
                        : "border-border hover:border-primary"
                    )}
                  >
                    {item.completed && <CheckCircle2 className="w-3 h-3" />}
                  </button>
                ) : (
                  <div
                    className={cn(
                      "mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                      item.completed ? "text-success" : "text-muted-foreground/40"
                    )}
                  >
                    {item.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <span className="text-[9px] font-bold">{i + 1}</span>
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-xs font-medium",
                      item.completed ? "text-muted-foreground line-through" : "text-foreground"
                    )}
                  >
                    {item.title}
                  </p>
                </div>
                {item.duration && (
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                    <Clock className="w-3 h-3" />
                    {item.duration}m
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
