import { History, Search } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useState } from "react";

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("onboarding_audit_log").select("*").order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const filtered = logs.filter((l: any) =>
    !search || l.action?.toLowerCase().includes(search.toLowerCase()) || l.entity_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Review system-wide activity and change history.</p>
      </FadeIn>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      {isLoading ? <Skeleton className="h-64 rounded-xl" /> : (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Action</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Entity</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Timestamp</th>
            </tr></thead>
            <tbody>
              {filtered.map((l: any) => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-secondary/20">
                  <td className="px-5 py-3 font-medium text-foreground capitalize">{l.action}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground capitalize">{l.entity_type}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{format(new Date(l.created_at), "MMM dd · HH:mm")}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-muted-foreground text-sm">No logs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
