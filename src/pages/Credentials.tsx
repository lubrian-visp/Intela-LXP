import { Award, ExternalLink, CheckCircle2, Search, Plus, Eye, Clock } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useCredentials, useRealtimeSync } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const statusStyle = {
  active: "text-success",
  pending: "text-warning",
  revoked: "text-destructive",
  expired: "text-muted-foreground",
};

export default function Credentials() {
  const [filter, setFilter] = useState<"all" | "active" | "pending" | "revoked">("all");
  const [search, setSearch] = useState("");

  const { data: credentials, isLoading } = useCredentials();

  useRealtimeSync(["issued_credentials", "notifications"]);
  const filtered = (credentials ?? [])
    .filter(c => filter === "all" || c.status === filter)
    .filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total: credentials?.length ?? 0,
    active: credentials?.filter(c => c.status === "active").length ?? 0,
    pending: credentials?.filter(c => c.status === "pending").length ?? 0,
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Credentials</h1>
          <p className="text-sm text-muted-foreground mt-1">Blockchain-verified achievements and credential issuance.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Issued", value: stats.total, icon: <Award className="w-4 h-4 text-accent" /> },
          { label: "Active", value: stats.active, icon: <CheckCircle2 className="w-4 h-4 text-success" /> },
          { label: "Pending", value: stats.pending, icon: <Clock className="w-4 h-4 text-warning" /> },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 shadow-card border border-border/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">{s.icon}</div>
            <div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {(["all", "active", "pending", "revoked"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search credentials..."
            className="pl-8 pr-4 py-1.5 text-xs bg-secondary rounded-lg border-0 outline-none focus:ring-2 focus:ring-accent w-52 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      )}

      {/* Table */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Credential</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Issued</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Hash</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer">
                    <td className="px-5 py-3 font-medium text-foreground">{c.title}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs capitalize">{c.credential_type}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{(c as any).programmes?.title ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">
                      {c.issued_at ? format(new Date(c.issued_at), "MMM dd, yyyy") : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {c.blockchain_hash ? (
                        <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                          {c.blockchain_hash.slice(0, 6)}...{c.blockchain_hash.slice(-4)}
                          <ExternalLink className="w-2.5 h-2.5 text-accent" />
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "text-xs font-medium capitalize flex items-center gap-1",
                        statusStyle[c.status as keyof typeof statusStyle] || "text-muted-foreground"
                      )}>
                        {c.status === "active" && <CheckCircle2 className="w-3 h-3" />}
                        {c.status === "pending" && <Clock className="w-3 h-3" />}
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm">
            {credentials?.length === 0 ? "No credentials issued yet." : "No credentials found for this filter."}
          </p>
        </div>
      )}
    </div>
  );
}
