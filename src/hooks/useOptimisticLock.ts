import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Optimistic Locking Hook
 * 
 * Prevents concurrent edit conflicts by comparing the `updated_at` timestamp
 * at save time against the value fetched when the entity was loaded.
 * If another user has modified the record in between, the save is blocked
 * and the user is prompted to reload.
 *
 * Usage:
 *   const { trackEntity, guardedUpdate } = useOptimisticLock();
 *   trackEntity("programmes", programmeId, programme.updated_at);
 *   await guardedUpdate("programmes", programmeId, { title: "New Title" });
 */

interface TrackedEntity {
  table: string;
  id: string;
  fetchedUpdatedAt: string;
}

export function useOptimisticLock() {
  const tracked = useRef<Map<string, TrackedEntity>>(new Map());

  /** Register the entity and its updated_at when first loaded */
  const trackEntity = useCallback(
    (table: string, id: string, fetchedUpdatedAt: string) => {
      const key = `${table}:${id}`;
      tracked.current.set(key, { table, id, fetchedUpdatedAt });
    },
    []
  );

  /** Remove tracking (e.g. on unmount or navigation) */
  const untrackEntity = useCallback((table: string, id: string) => {
    tracked.current.delete(`${table}:${id}`);
  }, []);

  /**
   * Perform an update only if the server-side updated_at still matches
   * the value captured at load time. Returns { success, conflict, error }.
   */
  const guardedUpdate = useCallback(
    async (
      table: string,
      id: string,
      updatePayload: Record<string, unknown>
    ): Promise<{ success: boolean; conflict: boolean; error?: string }> => {
      const key = `${table}:${id}`;
      const entry = tracked.current.get(key);

      if (!entry) {
        // No tracking info — fall through to a normal update (backward-compatible)
        const { error } = await (supabase as any)
          .from(table)
          .update(updatePayload)
          .eq("id", id);

        if (error) return { success: false, conflict: false, error: error.message };
        return { success: true, conflict: false };
      }

      // 1. Read current updated_at from server
      const { data: current, error: readErr } = await (supabase as any)
        .from(table)
        .select("updated_at")
        .eq("id", id)
        .maybeSingle();

      if (readErr) {
        return { success: false, conflict: false, error: readErr.message };
      }

      if (!current) {
        return { success: false, conflict: false, error: "Record not found" };
      }

      // 2. Compare timestamps
      const serverTs = new Date(current.updated_at).getTime();
      const localTs = new Date(entry.fetchedUpdatedAt).getTime();

      if (serverTs > localTs) {
        toast.error(
          "This record was modified by another user. Please reload and try again.",
          { duration: 6000 }
        );
        return { success: false, conflict: true };
      }

      // 3. Safe to update
      const { data: updated, error: updateErr } = await (supabase as any)
        .from(table)
        .update(updatePayload)
        .eq("id", id)
        .select("updated_at")
        .maybeSingle();

      if (updateErr) {
        return { success: false, conflict: false, error: updateErr.message };
      }

      // 4. Refresh tracked timestamp
      if (updated?.updated_at) {
        tracked.current.set(key, {
          ...entry,
          fetchedUpdatedAt: updated.updated_at,
        });
      }

      return { success: true, conflict: false };
    },
    []
  );

  /** Check whether a conflict exists without performing an update */
  const checkConflict = useCallback(
    async (table: string, id: string): Promise<boolean> => {
      const key = `${table}:${id}`;
      const entry = tracked.current.get(key);
      if (!entry) return false;

      const { data } = await (supabase as any)
        .from(table)
        .select("updated_at")
        .eq("id", id)
        .maybeSingle();

      if (!data) return false;

      return new Date(data.updated_at).getTime() > new Date(entry.fetchedUpdatedAt).getTime();
    },
    []
  );

  return { trackEntity, untrackEntity, guardedUpdate, checkConflict };
}
