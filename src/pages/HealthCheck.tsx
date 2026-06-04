import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ProbeStatus = "pending" | "ok" | "fail";

interface Probe {
  id: string;
  label: string;
  category: "Connectivity" | "Auth" | "RPC" | "RLS / Table" | "Storage" | "Edge Function";
  description: string;
  status: ProbeStatus;
  latencyMs?: number;
  errorCode?: string;
  errorMessage?: string;
  errorHint?: string;
  rawRequest?: string;
}

const initialProbes = (): Probe[] => [
  { id: "net", label: "Backend reachable", category: "Connectivity", description: "GET /rest/v1/ on the Lovable Cloud Data API", status: "pending" },
  { id: "session", label: "Auth session fetch", category: "Auth", description: "supabase.auth.getSession()", status: "pending" },
  { id: "user", label: "Auth user fetch", category: "Auth", description: "supabase.auth.getUser()", status: "pending" },
  { id: "rpc_has_role", label: "RPC: has_role(uid, 'learner')", category: "RPC", description: "Used inside most RLS policies — must be executable by 'authenticated'", status: "pending" },
  { id: "rpc_is_admin", label: "RPC: is_admin(uid)", category: "RPC", description: "Used inside admin-scoped RLS policies", status: "pending" },
  { id: "tbl_profiles", label: "Table: profiles (auth)", category: "RLS / Table", description: "Authenticated SELECT against own profile", status: "pending" },
  { id: "tbl_user_roles", label: "Table: user_roles (auth)", category: "RLS / Table", description: "Authenticated SELECT against own roles", status: "pending" },
  { id: "tbl_platform_settings", label: "Table: platform_settings", category: "RLS / Table", description: "Branding settings load — needed for landing page", status: "pending" },
  { id: "tbl_feature_flags", label: "Table: feature_flags", category: "RLS / Table", description: "Public-readable feature toggles", status: "pending" },
  { id: "storage", label: "Storage: list branding bucket", category: "Storage", description: "supabase.storage.from('branding').list()", status: "pending" },
  { id: "ef_health", label: "Edge Function: health-check", category: "Edge Function", description: "Invokes the deployed health-check function", status: "pending" },
];

function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = performance.now();
  return fn().then((result) => ({ result, ms: Math.round(performance.now() - start) }));
}

export default function HealthCheck() {
  const [probes, setProbes] = useState<Probe[]>(initialProbes);
  const [running, setRunning] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{ userId: string | null; email: string | null }>({ userId: null, email: null });

  const update = (id: string, patch: Partial<Probe>) =>
    setProbes((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const runProbe = async (id: string, req: string, fn: () => Promise<{ error: any } | any>) => {
    update(id, { status: "pending", errorCode: undefined, errorMessage: undefined, errorHint: undefined, rawRequest: req });
    try {
      const { result, ms } = await timed(fn);
      const err = (result as any)?.error;
      if (err) {
        update(id, { status: "fail", latencyMs: ms, errorCode: err.code, errorMessage: err.message, errorHint: err.hint });
      } else {
        update(id, { status: "ok", latencyMs: ms });
      }
    } catch (e: any) {
      update(id, { status: "fail", errorMessage: e?.message ?? String(e) });
    }
  };

  const runAll = async () => {
    setRunning(true);
    setProbes(initialProbes());

    // Get session up front
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id ?? null;
    setSessionInfo({ userId: uid, email: sessionData?.session?.user?.email ?? null });

    const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
    const ANON_KEY = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;

    await runProbe("net", `GET ${SUPABASE_URL}/rest/v1/`, async () => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers: { apikey: ANON_KEY } });
      if (!res.ok) return { error: { code: String(res.status), message: res.statusText } };
      return { error: null };
    });

    await runProbe("session", "supabase.auth.getSession()", () => supabase.auth.getSession());
    await runProbe("user", "supabase.auth.getUser()", () => supabase.auth.getUser());

    await runProbe("rpc_has_role", `rpc('has_role', { _user_id: '${uid ?? "<anon>"}', _role: 'learner' })`, () =>
      (supabase as any).rpc("has_role", { _user_id: uid, _role: "learner" })
    );
    await runProbe("rpc_is_admin", `rpc('is_admin', { _user_id: '${uid ?? "<anon>"}' })`, () =>
      (supabase as any).rpc("is_admin", { _user_id: uid })
    );

    await runProbe(
      "tbl_profiles",
      uid ? `from('profiles').select('id').eq('user_id', '${uid}').limit(1)` : "from('profiles').select('id').limit(1)",
      async () =>
        uid
          ? await supabase.from("profiles").select("id").eq("user_id", uid).limit(1)
          : await supabase.from("profiles").select("id").limit(1)
    );

    await runProbe(
      "tbl_user_roles",
      uid ? `from('user_roles').select('role').eq('user_id', '${uid}')` : "from('user_roles').select('role').limit(1)",
      async () =>
        uid
          ? await supabase.from("user_roles").select("role").eq("user_id", uid)
          : await supabase.from("user_roles").select("role").limit(1)
    );

    await runProbe("tbl_platform_settings", "from('platform_settings').select('*').eq('category','branding')", async () =>
      await supabase.from("platform_settings").select("*").eq("category", "branding")
    );

    await runProbe("tbl_feature_flags", "from('feature_flags').select('flag_key').limit(1)", async () =>
      await supabase.from("feature_flags").select("flag_key").limit(1)
    );

    await runProbe("storage", "storage.from('branding').list('', { limit: 1 })", async () =>
      await supabase.storage.from("branding").list("", { limit: 1 })
    );


    await runProbe("ef_health", "functions.invoke('health-check')", async () => {
      try {
        return await supabase.functions.invoke("health-check", { method: "GET" } as any);
      } catch (e: any) {
        return { error: { message: e?.message ?? String(e) } };
      }
    });

    setRunning(false);
  };

  useEffect(() => {
    runAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const failing = probes.filter((p) => p.status === "fail");
  const allDone = probes.every((p) => p.status !== "pending");

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Health Check</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Verifies database connectivity and RLS/RPC permissions. Use this when the app fails to load.
            </p>
          </div>
          <Button onClick={runAll} disabled={running} variant="outline" size="sm">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${running ? "animate-spin" : ""}`} />
            Re-run
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Session</span><span className="font-mono">{sessionInfo.userId ? sessionInfo.email ?? sessionInfo.userId : "anonymous"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">User ID</span><span className="font-mono">{sessionInfo.userId ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Backend URL</span><span className="font-mono truncate ml-4">{(import.meta as any).env.VITE_SUPABASE_URL}</span></div>
        </div>

        {allDone && failing.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
            <p className="text-sm font-semibold text-destructive">{failing.length} failing call{failing.length === 1 ? "" : "s"} — the app cannot fully load until these pass.</p>
          </div>
        )}
        {allDone && failing.length === 0 && (
          <div className="bg-success/10 border border-success/30 rounded-xl p-4">
            <p className="text-sm font-semibold text-success">All probes passed.</p>
          </div>
        )}

        <div className="space-y-3">
          {probes.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {p.status === "pending" ? (
                    <Loader2 className="w-4 h-4 mt-0.5 text-muted-foreground animate-spin shrink-0" />
                  ) : p.status === "ok" ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-success shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{p.label}</p>
                      <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{p.description}</p>
                  </div>
                </div>
                {p.latencyMs !== undefined && (
                  <span className="text-[11px] text-muted-foreground font-mono shrink-0">{p.latencyMs}ms</span>
                )}
              </div>

              {p.status === "fail" && (
                <div className="mt-3 ml-7 space-y-2">
                  {p.rawRequest && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Failing call</p>
                      <pre className="text-[11px] bg-muted/40 border border-border rounded p-2 overflow-x-auto font-mono">{p.rawRequest}</pre>
                    </div>
                  )}
                  <div className="text-[11px] font-mono bg-destructive/5 border border-destructive/20 rounded p-2">
                    {p.errorCode && <div><span className="text-muted-foreground">code:</span> {p.errorCode}</div>}
                    {p.errorMessage && <div><span className="text-muted-foreground">message:</span> {p.errorMessage}</div>}
                    {p.errorHint && <div><span className="text-muted-foreground">hint:</span> {p.errorHint}</div>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground text-center pt-4">
          Common fix: if RPC probes fail with <code>permission denied for function</code>, re-grant <code>EXECUTE</code> on the function to the <code>authenticated</code> role.
        </p>
      </div>
    </div>
  );
}
