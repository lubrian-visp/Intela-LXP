import { useState } from "react";
import {
  FlaskConical, Play, Trash2, RefreshCw, CheckCircle2,
  AlertTriangle, Copy, Check, ChevronDown, ChevronRight,
  Users, BookOpen, ClipboardCheck, Award, Bell, Calendar,
  MessageSquare, BarChart3, Loader2, Info, FileCheck, LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const db = supabase as any;

interface TestSession {
  session_id: string;
  records: { table_name: string; label: string; created_at: string }[];
}

function useSessions() {
  return useQuery({
    queryKey: ["test_data_sessions"],
    queryFn: async () => {
      const { data } = await db.from("test_data_registry")
        .select("session_id, table_name, label, created_at")
        .order("created_at", { ascending: false });
      const map: Record<string, TestSession> = {};
      (data ?? []).forEach((r: any) => {
        if (!map[r.session_id]) map[r.session_id] = { session_id: r.session_id, records: [] };
        map[r.session_id].records.push(r);
      });
      return Object.values(map);
    },
    staleTime: 10_000,
  });
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true); setTimeout(() => setCopied(false), 2000);
        toast.success(`${label} copied`);
      }}
      className={cn("flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-colors",
        copied ? "bg-green-500/10 text-green-600" : "bg-secondary text-muted-foreground hover:text-foreground"
      )}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {text}
    </button>
  );
}

const SEED_SUMMARY = [
  { icon: Users,          label: "8 test users",              detail: "4 Learners · 1 Facilitator · 1 Assessor · 1 PM · 1 Operations" },
  { icon: BookOpen,       label: "Programme + 2 modules",     detail: "4 content blocks, active status" },
  { icon: ClipboardCheck, label: "4 assessments",             detail: "Auto-graded quiz, formative, summative (moderated), journal" },
  { icon: BarChart3,      label: "6 quiz questions",          detail: "5 MCQ/T-F (auto-graded) + 1 short answer (manual)" },
  { icon: CheckCircle2,   label: "5 submissions",             detail: "Submitted, Graded, Moderation, Resubmit, Auto-graded" },
  { icon: FileCheck,      label: "8 activity grades",         detail: "Facilitator-recorded: participation, workshop, presentation" },
  { icon: AlertTriangle,  label: "Moderation pipeline",       detail: "1 item pending QA review by moderator" },
  { icon: Award,          label: "3 badges + 1 credential",   detail: "First Submission, High Achiever, Consistent Learner" },
  { icon: Bell,           label: "15 notifications",          detail: "Per-role: grades, deadlines, submissions, alerts" },
  { icon: Calendar,       label: "4 training sessions",       detail: "3 upcoming + 1 completed" },
  { icon: MessageSquare,  label: "3 discussion threads",      detail: "7 posts across all roles" },
  { icon: Users,          label: "Streaks + study logs",      detail: "Alex 4d · Priya 8d · Sipho 1d" },
];

const ROLE_COLORS: Record<string, string> = {
  learner:     "bg-pink-500/10 text-pink-600 border-pink-500/20",
  facilitator: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  assessor:    "bg-green-500/10 text-green-600 border-green-500/20",
};

const ROLE_EMOJIS: Record<string, string> = {
  learner: "📚", facilitator: "🎓", assessor: "✅",
};

export default function TestDataManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();

  const [seeding,  setSeeding]  = useState(false);
  const [cleaning, setCleaning] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const invoke = async (action: string, extra?: object) => {
    const { data, error } = await supabase.functions.invoke("manage-test-data", {
      body: { action, requestedBy: user?.id, ...extra },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await invoke("seed");
      setLastResult(result);
      qc.invalidateQueries({ queryKey: ["test_data_sessions"] });
      toast.success(`✅ ${result.records_created} test records created!`);
    } catch (err: any) {
      toast.error("Seed failed", { description: err.message, duration: 10000 });
    } finally {
      setSeeding(false);
    }
  };

  const handleCleanup = async (sessionId?: string) => {
    setCleaning(sessionId ?? "all");
    try {
      const result = await invoke("cleanup", sessionId ? { sessionId } : {});
      setLastResult(null);
      qc.invalidateQueries({ queryKey: ["test_data_sessions"] });
      toast.success(`🧹 ${result.message}`);
    } catch (err: any) {
      toast.error("Cleanup failed", { description: err.message });
    } finally {
      setCleaning(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
          <FlaskConical className="w-6 h-6 text-purple-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Test Data Manager</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Seed realistic learner data to test the dashboard and all related components.
            All test data is tracked and can be removed with one click.
          </p>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-orange-500/8 border border-orange-500/20">
        <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
        <p className="text-[12px] text-muted-foreground">
          <span className="font-semibold text-foreground">Super Admin only.</span>
          {" "}Test data is created in your live database. Always clean up after testing.
          Test records are prefixed with <code className="bg-secondary px-1 rounded text-[11px]">[TEST]</code> for easy identification.
        </p>
      </div>

      {/* What gets seeded */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">What gets seeded</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Each seed run creates one complete test environment with all data needed to test every dashboard widget.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x-0 divide-border/30">
          {SEED_SUMMARY.map(item => (
            <div key={item.label} className="flex items-start gap-3 px-5 py-3 border-b border-border/20 last:border-0">
              <item.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-medium text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seed button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSeed}
          disabled={seeding}
          className="gap-2 bg-purple-600 hover:bg-purple-700 text-white min-w-[160px]"
          aria-label="Seed test data"
        >
          {seeding
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Seeding…</>
            : <><Play className="w-4 h-4" /> Seed Test Data</>
          }
        </Button>

        {sessions.length > 0 && (
          <Button
            variant="outline"
            onClick={() => handleCleanup()}
            disabled={!!cleaning}
            className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            aria-label="Remove all test data"
          >
            {cleaning === "all"
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Cleaning…</>
              : <><Trash2 className="w-4 h-4" /> Remove All Test Data</>
            }
          </Button>
        )}
      </div>

      {/* Last seed result */}
      {lastResult && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5 space-y-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h3 className="text-sm font-semibold text-foreground">Seed complete — {lastResult.records_created} records created</h3>
          </div>

          {/* Shared password */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-card border border-border/50">
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <p className="text-[11px] text-muted-foreground flex-1">All accounts share the same password:</p>
            <CopyButton text={lastResult.password ?? "Test@Intela2026!"} label="Password" />
          </div>

          {/* Per-role login cards */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Test Accounts</p>
            {Object.entries(lastResult.users ?? {}).map(([key, u]: [string, any]) => {
              const roleKey = u.role as string;
              const colorCls = ROLE_COLORS[roleKey] ?? "bg-secondary text-foreground border-border";
              return (
                <div key={key} className="rounded-xl bg-card border border-border/50 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border capitalize", colorCls)}>
                      {ROLE_EMOJIS[roleKey]} {u.role}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{u.name}</span>
                    {u.progress && (
                      <span className="ml-auto text-[10px] text-muted-foreground">{u.progress}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <CopyButton text={u.email} label="Email" />
                    <CopyButton text={lastResult.password ?? "Test@Intela2026!"} label="Password" />
                  </div>
                  {u.note && (
                    <p className="text-[10px] text-muted-foreground border-t border-border/40 pt-1.5">{u.note}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Test scenarios */}
          {lastResult.scenarios && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <LogIn className="w-3 h-3" /> Testing Scenarios
              </p>
              <div className="rounded-xl bg-card border border-border/50 divide-y divide-border/40">
                {lastResult.scenarios.map((s: string, i: number) => (
                  <div key={i} className="px-4 py-2 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">{s.split("→")[0]?.trim()}</span>
                    {s.includes("→") && <span> → {s.split("→").slice(1).join("→").trim()}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary counts */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {Object.entries(lastResult.summary ?? {}).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-card border border-border/30 px-2 py-2 text-center">
                <p className="text-[13px] font-bold text-foreground">{String(v)}</p>
                <p className="text-[8px] text-muted-foreground capitalize leading-tight mt-0.5">{k.replace(/_/g," ")}</p>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground">
            Session: <code className="bg-secondary px-1 rounded text-[9px]">{lastResult.session_id}</code>
          </p>
        </div>
      )}

      {/* Existing sessions */}
      {sessions.length > 0 && (
        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <h3 className="text-sm font-semibold text-foreground">
              Active Test Sessions
              <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                ({sessions.length} session{sessions.length !== 1 ? "s" : ""})
              </span>
            </h3>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ["test_data_sessions"] })}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Refresh sessions"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {sessionsLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading sessions…</div>
          ) : (
            <div className="divide-y divide-border/40">
              {sessions.map(session => (
                <div key={session.session_id}>
                  <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/20 transition-colors">
                    <button
                      onClick={() => setExpandedSession(
                        expandedSession === session.session_id ? null : session.session_id
                      )}
                      className="flex items-center gap-2 flex-1 text-left min-w-0"
                      aria-expanded={expandedSession === session.session_id}
                    >
                      {expandedSession === session.session_id
                        ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      }
                      <div className="min-w-0">
                        <p className="text-[12px] font-mono text-foreground truncate">{session.session_id}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {session.records.length} records ·{" "}
                          {format(new Date(session.records[0]?.created_at ?? new Date()), "d MMM yyyy HH:mm")}
                        </p>
                      </div>
                    </button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCleanup(session.session_id)}
                      disabled={cleaning === session.session_id}
                      className="shrink-0 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 h-7"
                      aria-label={`Delete session ${session.session_id}`}
                    >
                      {cleaning === session.session_id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Trash2 className="w-3 h-3" />
                      }
                      Clean up
                    </Button>
                  </div>

                  {expandedSession === session.session_id && (
                    <div className="px-10 pb-3 space-y-0.5">
                      {session.records.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground py-0.5">
                          <span className="w-28 shrink-0 font-mono text-[9px] bg-secondary px-1 rounded truncate">{r.table_name}</span>
                          <span>{r.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {sessions.length === 0 && !lastResult && (
        <div className="text-center py-8">
          <FlaskConical className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No test sessions yet. Click "Seed Test Data" to begin.</p>
        </div>
      )}
    </div>
  );
}
