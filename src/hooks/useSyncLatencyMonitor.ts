import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SyncLatencyStats {
  samples: number;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
  withinTarget: number; // percentage of samples under 1000ms
}

/**
 * Monitors real-time update propagation latency by measuring
 * the time between a database event and its receipt via Supabase Realtime.
 * Subscribes to the notifications table as a proxy for cross-portal sync.
 */
export function useSyncLatencyMonitor(enabled = true) {
  const [stats, setStats] = useState<SyncLatencyStats>({
    samples: 0,
    avgMs: 0,
    p95Ms: 0,
    maxMs: 0,
    withinTarget: 100,
  });
  const latencies = useRef<number[]>([]);

  const recalculate = useCallback(() => {
    const arr = latencies.current;
    if (arr.length === 0) return;
    const sorted = [...arr].sort((a, b) => a - b);
    const avg = Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[Math.min(p95Index, sorted.length - 1)];
    const max = sorted[sorted.length - 1];
    const within = Math.round((arr.filter(v => v < 1000).length / arr.length) * 100);

    setStats({ samples: arr.length, avgMs: avg, p95Ms: p95, maxMs: max, withinTarget: within });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("latency-monitor")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const serverTs = payload.new?.created_at;
          if (serverTs) {
            const latency = Date.now() - new Date(serverTs).getTime();
            // Only record reasonable latencies (filter out clock skew outliers)
            if (latency >= 0 && latency < 30000) {
              latencies.current.push(latency);
              // Keep last 100 samples
              if (latencies.current.length > 100) {
                latencies.current = latencies.current.slice(-100);
              }
              recalculate();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, recalculate]);

  const reset = useCallback(() => {
    latencies.current = [];
    setStats({ samples: 0, avgMs: 0, p95Ms: 0, maxMs: 0, withinTarget: 100 });
  }, []);

  return { stats, reset };
}
