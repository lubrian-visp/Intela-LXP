import { useState } from "react";
import { History, Search, Filter, Database, Trash2, GitBranch } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useUnifiedAuditLog } from "@/hooks/useUnifiedAuditLog";
import { cn } from "@/lib/utils";

const sourceConfig: Record<string, { label: string; icon: any; color: string }> = {
  onboarding: { label: "Onboarding", icon: Database, color: "bg-primary/10 text-primary" },
  deletion: { label: "Deletion", icon: Trash2, color: "bg-destructive/10 text-destructive" },
  programme_lifecycle: { label: "Programme", icon: GitBranch, color: "bg-info/10 text-info" },
};

export default function UnifiedAuditLog() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const { data: logs = [], isLoading } = useUnifiedAuditLog({
    source: sourceFilter !== "all" ? sourceFilter : undefined,
    limit: 300,
  });

  const filtered = logs.filter((l) =>
    !search ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Unified Audit Trail
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chronological view of all actions across onboarding, deletions, and programme lifecycle.
          </p>
        </div>
      </FadeIn>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by action, entity type, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="deletion">Deletion</SelectItem>
            <SelectItem value="programme_lifecycle">Programme Lifecycle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Source</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Action</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Entity</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase hidden lg:table-cell">Details</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const src = sourceConfig[l.source] ?? sourceConfig.onboarding;
                const SrcIcon = src.icon;
                return (
                  <tr key={`${l.source}-${l.id}`} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3">
                      <Badge variant="outline" className={cn("gap-1 text-[10px]", src.color)}>
                        <SrcIcon className="w-3 h-3" />
                        {src.label}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground capitalize">{l.action?.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground capitalize">{l.entity_type?.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground hidden lg:table-cell max-w-[300px] truncate">
                      {l.details ? JSON.stringify(l.details).slice(0, 80) : "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(l.created_at), "MMM dd yyyy · HH:mm:ss")}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-sm">
                    No audit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
