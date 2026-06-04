import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Offline Sync Hook
 *
 * Stores learner submissions and notes in localStorage when offline,
 * then syncs to the server when connectivity returns. Implements
 * timestamp-based conflict resolution for offline/multi-device scenarios.
 */

interface PendingSubmission {
  id: string;
  table: string;
  operation: "insert" | "update";
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

const STORAGE_KEY = "intela_offline_queue";

function getQueue(): PendingSubmission[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: PendingSubmission[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(getQueue().length);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Connection restored. Syncing pending changes...");
      processQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You are offline. Changes will be saved locally.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Enqueue an operation for later sync
  const enqueue = useCallback(
    (table: string, operation: "insert" | "update", payload: Record<string, unknown>) => {
      const queue = getQueue();
      const entry: PendingSubmission = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        table,
        operation,
        payload: { ...payload, _offline_timestamp: Date.now() },
        timestamp: Date.now(),
        retries: 0,
      };
      queue.push(entry);
      saveQueue(queue);
      setPendingCount(queue.length);
    },
    []
  );

  // Process the queue when online
  const processQueue = useCallback(async () => {
    const queue = getQueue();
    if (queue.length === 0) return;

    const remaining: PendingSubmission[] = [];

    for (const item of queue) {
      try {
        const { _offline_timestamp, ...cleanPayload } = item.payload as any;

        if (item.operation === "insert") {
          const { error } = await (supabase as any).from(item.table).insert(cleanPayload);
          if (error) throw error;
        } else {
          // For updates, check if server version is newer (conflict resolution)
          if (cleanPayload.id && cleanPayload.updated_at) {
            const { data: current } = await (supabase as any)
              .from(item.table)
              .select("updated_at")
              .eq("id", cleanPayload.id)
              .maybeSingle();

            if (current && new Date(current.updated_at).getTime() > _offline_timestamp) {
              // Server has newer version — skip this update
              toast.info(`Skipped offline update to ${item.table}: server has newer version.`);
              continue;
            }
          }

          const { id, ...updatePayload } = cleanPayload;
          const { error } = await (supabase as any)
            .from(item.table)
            .update(updatePayload)
            .eq("id", id);
          if (error) throw error;
        }
      } catch (err: any) {
        item.retries += 1;
        if (item.retries < 3) {
          remaining.push(item);
        } else {
          toast.error(`Failed to sync ${item.table} change after 3 retries.`);
        }
      }
    }

    saveQueue(remaining);
    setPendingCount(remaining.length);

    if (remaining.length === 0 && queue.length > 0) {
      toast.success(`${queue.length} offline change(s) synced successfully.`);
    }
  }, []);

  // Auto-process on mount if online
  useEffect(() => {
    if (isOnline && getQueue().length > 0) {
      processQueue();
    }
  }, [isOnline]);

  return {
    isOnline,
    pendingCount,
    enqueue,
    processQueue,
  };
}
