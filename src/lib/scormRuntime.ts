// SCORM 1.2 + 2004 runtime API bridge.
// Implements IEEE 1484.11.2 — exposes window.API (1.2) and window.API_1484_11 (2004)
// for the SCO iframe to discover. CMI values are kept in memory and flushed to
// public.scorm_cmi_data + public.scorm_sessions via debounced writes.

import { supabase } from "@/integrations/supabase/client";

export type ScormVersion = "scorm_12" | "scorm_2004";

interface ScormBridgeOptions {
  sessionId: string;
  version: ScormVersion;
  initialCmi: Record<string, string>;
  onCommit?: (cmi: Record<string, string>) => void;
}

/** Map a 2004-style element to its 1.2 equivalent (best-effort). */
const ELEMENT_ALIAS: Record<string, string> = {
  "cmi.completion_status": "cmi.core.lesson_status",
  "cmi.success_status": "cmi.core.lesson_status",
  "cmi.score.raw": "cmi.core.score.raw",
  "cmi.score.min": "cmi.core.score.min",
  "cmi.score.max": "cmi.core.score.max",
  "cmi.score.scaled": "cmi.core.score.scaled",
  "cmi.location": "cmi.core.lesson_location",
  "cmi.session_time": "cmi.core.session_time",
  "cmi.total_time": "cmi.core.total_time",
  "cmi.exit": "cmi.core.exit",
  "cmi.entry": "cmi.core.entry",
};

function parseScormDuration(t: string): number {
  // SCORM 1.2: HHHH:MM:SS.SS — 2004: ISO8601 PT...
  if (!t) return 0;
  if (t.startsWith("PT")) {
    const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/.exec(t);
    if (!m) return 0;
    return (+(m[1] || 0) * 3600) + (+(m[2] || 0) * 60) + (+(m[3] || 0));
  }
  const parts = t.split(":");
  if (parts.length !== 3) return 0;
  return (+parts[0]) * 3600 + (+parts[1]) * 60 + parseFloat(parts[2]);
}

export class ScormBridge {
  private cmi: Record<string, string>;
  private dirty = new Set<string>();
  private lastError = "0";
  private initialized = false;
  private terminated = false;
  private flushTimer: number | null = null;
  private opts: ScormBridgeOptions;

  constructor(opts: ScormBridgeOptions) {
    this.opts = opts;
    this.cmi = { ...opts.initialCmi };
  }

  /** Install API on parent window (and a wrapped iframe contentWindow when ready). */
  install(target: Window = window) {
    const api12 = this.makeScorm12Api();
    const api2004 = this.makeScorm2004Api();
    (target as any).API = api12;
    (target as any).API_1484_11 = api2004;
  }

  uninstall(target: Window = window) {
    try { delete (target as any).API; } catch { /* ignore */ }
    try { delete (target as any).API_1484_11; } catch { /* ignore */ }
  }

  destroy() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (!this.terminated) {
      this.commit();
    }
    this.uninstall();
  }

  private setValue(element: string, value: string): "true" | "false" {
    if (!this.initialized || this.terminated) {
      this.lastError = "132"; // not initialised
      return "false";
    }
    this.cmi[element] = value;
    this.dirty.add(element);
    this.scheduleFlush();
    this.lastError = "0";
    return "true";
  }

  private getValue(element: string): string {
    if (this.terminated) {
      this.lastError = "143";
      return "";
    }
    // Resolve alias both directions
    if (element in this.cmi) return this.cmi[element];
    const alias = ELEMENT_ALIAS[element];
    if (alias && alias in this.cmi) return this.cmi[alias];
    // Reverse-lookup (2004→1.2 stored)
    for (const [k, v] of Object.entries(ELEMENT_ALIAS)) {
      if (v === element && k in this.cmi) return this.cmi[k];
    }
    this.lastError = "0";
    return "";
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null;
      this.commit().catch((e) => console.warn("SCORM commit failed:", e));
    }, 2000);
  }

  private async commit(): Promise<boolean> {
    if (this.dirty.size === 0) return true;
    const elements = Array.from(this.dirty);
    this.dirty.clear();

    // Upsert CMI rows
    const rows = elements.map((element) => ({
      session_id: this.opts.sessionId,
      element,
      value: this.cmi[element] ?? null,
    }));

    const { error } = await supabase
      .from("scorm_cmi_data")
      .upsert(rows, { onConflict: "session_id,element" });
    if (error) {
      // requeue
      elements.forEach((e) => this.dirty.add(e));
      throw error;
    }

    // Mirror well-known fields onto scorm_sessions for analytics
    const sessionUpdate: Record<string, any> = { last_accessed_at: new Date().toISOString() };
    const status = this.getValue("cmi.completion_status") || this.getValue("cmi.core.lesson_status");
    if (status) sessionUpdate.completion_status = status;
    const success = this.getValue("cmi.success_status");
    if (success) sessionUpdate.success_status = success;
    const raw = this.getValue("cmi.core.score.raw") || this.getValue("cmi.score.raw");
    if (raw) sessionUpdate.score_raw = parseFloat(raw);
    const scaled = this.getValue("cmi.score.scaled");
    if (scaled) sessionUpdate.score_scaled = parseFloat(scaled);
    const sessTime = this.getValue("cmi.session_time") || this.getValue("cmi.core.session_time");
    if (sessTime) sessionUpdate.session_time_seconds = Math.round(parseScormDuration(sessTime));
    const suspend = this.getValue("cmi.suspend_data");
    if (suspend) sessionUpdate.suspend_data = suspend;
    const location = this.getValue("cmi.location") || this.getValue("cmi.core.lesson_location");
    if (location) sessionUpdate.location = location;

    await supabase.from("scorm_sessions").update(sessionUpdate).eq("id", this.opts.sessionId);

    this.opts.onCommit?.({ ...this.cmi });
    return true;
  }

  private makeScorm12Api() {
    return {
      LMSInitialize: (_p: string) => {
        if (this.initialized) { this.lastError = "101"; return "false"; }
        this.initialized = true;
        this.lastError = "0";
        return "true";
      },
      LMSFinish: (_p: string) => {
        if (!this.initialized) { this.lastError = "301"; return "false"; }
        this.terminated = true;
        this.commit().catch(() => {});
        // Mark finished
        supabase.from("scorm_sessions")
          .update({ finished_at: new Date().toISOString() })
          .eq("id", this.opts.sessionId).then(() => {});
        return "true";
      },
      LMSGetValue: (el: string) => this.getValue(el),
      LMSSetValue: (el: string, v: string) => this.setValue(el, v),
      LMSCommit: (_p: string) => { this.commit().catch(() => {}); return "true"; },
      LMSGetLastError: () => this.lastError,
      LMSGetErrorString: (_c: string) => "",
      LMSGetDiagnostic: (_c: string) => "",
    };
  }

  private makeScorm2004Api() {
    return {
      Initialize: (_p: string) => {
        if (this.initialized) { this.lastError = "103"; return "false"; }
        this.initialized = true;
        this.lastError = "0";
        return "true";
      },
      Terminate: (_p: string) => {
        if (!this.initialized) { this.lastError = "112"; return "false"; }
        this.terminated = true;
        this.commit().catch(() => {});
        supabase.from("scorm_sessions")
          .update({ finished_at: new Date().toISOString() })
          .eq("id", this.opts.sessionId).then(() => {});
        return "true";
      },
      GetValue: (el: string) => this.getValue(el),
      SetValue: (el: string, v: string) => this.setValue(el, v),
      Commit: (_p: string) => { this.commit().catch(() => {}); return "true"; },
      GetLastError: () => this.lastError,
      GetErrorString: (_c: string) => "",
      GetDiagnostic: (_c: string) => "",
    };
  }
}
