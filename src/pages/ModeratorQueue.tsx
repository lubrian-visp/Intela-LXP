import { Flag, Search } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Input } from "@/components/ui/input";
import { useModerationItems, useRealtimeSync } from "@/hooks/useCoreData";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function ModeratorQueue() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const { data: items = [], isLoading } = useModerationItems();
  useRealtimeSync(["moderation_items", "assessment_submissions", "notifications"]);

  // Self-moderation filter: exclude own submitted work
  const pending = (items as any[]).filter((i: any) =>
    (i.status === "pending" || i.status === "under_review") && i.submitted_by !== user?.id
  );
  const filtered = pending.filter((i: any) =>
    !search || i.content?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">Moderation Queue</h1>
        <p className="text-sm text-muted-foreground">{pending.length} item{pending.length !== 1 ? "s" : ""} pending moderation.</p>
      </FadeIn>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      {isLoading ? <Skeleton className="h-64 rounded-xl" /> : filtered.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <Flag className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">Queue Clear</h3>
          <p className="text-xs text-muted-foreground">No items pending moderation.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((i: any) => (
            <div key={i.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-semibold text-foreground capitalize">{i.item_type.replace(/_/g, " ")}</h4>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[400px]">{i.content}</p>
                </div>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium capitalize", i.priority === "high" ? "bg-destructive/10 text-destructive" : i.priority === "medium" ? "bg-warning/10 text-warning" : "bg-secondary text-muted-foreground")}>{i.priority}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Reason: {i.reason} · {format(new Date(i.flagged_at), "MMM dd")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
