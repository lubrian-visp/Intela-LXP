import { useState, useCallback, useRef, useEffect } from "react";

export type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

interface UseAutoSaveOptions {
  debounceMs?: number;
  onSave?: () => Promise<void> | void;
  enabled?: boolean;
}

export function useAutoSave(options: UseAutoSaveOptions = {}) {
  const { debounceMs = 2000, onSave, enabled = true } = options;
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const changeCountRef = useRef(0);

  const markDirty = useCallback(() => {
    if (!enabled) return;
    changeCountRef.current += 1;
    setStatus("pending");
    setErrorMessage(null);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await onSave?.();
        setStatus("saved");
        setLastSavedAt(new Date());
        // Reset to idle after a brief "saved" display
        setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 3000);
      } catch (e) {
        setStatus("error");
        setErrorMessage(e instanceof Error ? e.message : "Save failed");
      }
    }, debounceMs);
  }, [debounceMs, onSave, enabled]);

  const forceSave = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("saving");
    try {
      await onSave?.();
      setStatus("saved");
      setLastSavedAt(new Date());
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 3000);
    } catch (e) {
      setStatus("error");
      setErrorMessage(e instanceof Error ? e.message : "Save failed");
    }
  }, [onSave]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    status,
    lastSavedAt,
    errorMessage,
    markDirty,
    forceSave,
    changeCount: changeCountRef.current,
  };
}
