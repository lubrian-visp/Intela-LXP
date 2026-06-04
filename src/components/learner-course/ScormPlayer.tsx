import { useEffect, useRef, useState } from "react";
import { Loader2, Package, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ScormBridge, type ScormVersion } from "@/lib/scormRuntime";

interface ScormPackage {
  id: string;
  storage_path: string;
  launch_path: string;
  scorm_version: string;
  title: string;
  status: string;
}

interface ScormPlayerProps {
  packageId: string;
  height?: number;
}

/**
 * Renders a SCORM package inside a sandboxed iframe with a fully wired
 * IEEE 1484.11.2 runtime (window.API / window.API_1484_11) on the parent window.
 * Persists CMI data to scorm_sessions + scorm_cmi_data.
 */
export default function ScormPlayer({ packageId, height = 600 }: ScormPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<ScormBridge | null>(null);
  const [pkg, setPkg] = useState<ScormPackage | null>(null);
  const [launchUrl, setLaunchUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Load package
        const { data: p, error: pErr } = await supabase
          .from("scorm_packages")
          .select("id, storage_path, launch_path, scorm_version, title, status")
          .eq("id", packageId)
          .maybeSingle();
        if (pErr) throw pErr;
        if (!p) throw new Error("SCORM package not found");
        if (p.status !== "ready") throw new Error(`Package is ${p.status}`);
        if (cancelled) return;
        setPkg(p);

        // 2. Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("You must be signed in to launch SCORM content");

        // 3. Find or create session (latest attempt for this learner+package)
        const { data: existing } = await supabase
          .from("scorm_sessions")
          .select("*")
          .eq("package_id", packageId)
          .eq("learner_id", user.id)
          .order("attempt_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        let session = existing;
        if (!session) {
          const { data: created, error: cErr } = await supabase
            .from("scorm_sessions")
            .insert({ package_id: packageId, learner_id: user.id })
            .select()
            .single();
          if (cErr) throw cErr;
          session = created;
        } else {
          // Update last accessed
          await supabase
            .from("scorm_sessions")
            .update({ last_accessed_at: new Date().toISOString() })
            .eq("id", session.id);
        }
        if (cancelled) return;
        setSessionId(session.id);

        // 4. Load existing CMI data
        const { data: cmiRows } = await supabase
          .from("scorm_cmi_data")
          .select("element, value")
          .eq("session_id", session.id);

        const initialCmi: Record<string, string> = {};
        cmiRows?.forEach((r) => { if (r.value != null) initialCmi[r.element] = r.value; });
        // Seed learner identity (read-only CMI elements many SCOs query)
        initialCmi["cmi.core.student_id"] ??= user.id;
        initialCmi["cmi.core.student_name"] ??= user.email || "Learner";
        initialCmi["cmi.learner_id"] ??= user.id;
        initialCmi["cmi.learner_name"] ??= user.email || "Learner";
        initialCmi["cmi.core.lesson_status"] ??= "not attempted";
        initialCmi["cmi.completion_status"] ??= "not attempted";
        initialCmi["cmi.core.entry"] ??= session.suspend_data ? "resume" : "ab-initio";
        initialCmi["cmi.entry"] ??= session.suspend_data ? "resume" : "ab-initio";
        if (session.suspend_data) initialCmi["cmi.suspend_data"] ??= session.suspend_data;
        if (session.location) initialCmi["cmi.location"] ??= session.location;

        // 5. Install API bridge BEFORE iframe loads so SCO discovers it
        const version: ScormVersion = (p.scorm_version === "scorm_12" ? "scorm_12" : "scorm_2004");
        const bridge = new ScormBridge({ sessionId: session.id, version, initialCmi });
        bridge.install(window);
        bridgeRef.current = bridge;

        // 6. Build signed URL for launch file
        const launchFile = `${p.storage_path}/${p.launch_path}`;
        const { data: signed, error: sErr } = await supabase.storage
          .from("scorm-packages")
          .createSignedUrl(launchFile, 60 * 60 * 8); // 8h session
        if (sErr) throw sErr;
        if (cancelled) return;
        setLaunchUrl(signed.signedUrl);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      bridgeRef.current?.destroy();
      bridgeRef.current = null;
    };
  }, [packageId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">Preparing SCORM runtime…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-destructive">SCORM player error</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Package className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-foreground">{pkg?.title}</span>
        <Badge variant="outline" className="text-[9px] ml-auto uppercase">
          {pkg?.scorm_version.replace("_", " ")}
        </Badge>
        {sessionId && (
          <Badge variant="secondary" className="text-[9px]">Runtime active</Badge>
        )}
      </div>
      <div className="rounded-xl overflow-hidden border border-border shadow-md bg-background">
        {launchUrl && (
          <iframe
            ref={iframeRef}
            src={launchUrl}
            title={pkg?.title || "SCORM content"}
            className="w-full border-0"
            style={{ height: `${height}px` }}
            // Note: must allow-same-origin so the SCO can read parent's window.API
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        )}
      </div>
    </div>
  );
}
