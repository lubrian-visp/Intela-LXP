import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // 2 minutes warning

export function useSessionTimeout() {
  const [showWarning, setShowWarning] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const warningTimer = useRef<ReturnType<typeof setTimeout>>();

  const logout = useCallback(async () => {
    setShowWarning(false);
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }, []);

  const resetTimers = useCallback(() => {
    setShowWarning(false);
    clearTimeout(idleTimer.current);
    clearTimeout(warningTimer.current);

    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    idleTimer.current = setTimeout(() => {
      logout();
    }, IDLE_TIMEOUT_MS);
  }, [logout]);

  const extendSession = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"] as const;
    const handler = () => resetTimers();

    events.forEach((e) => document.addEventListener(e, handler, { passive: true }));
    resetTimers();

    return () => {
      events.forEach((e) => document.removeEventListener(e, handler));
      clearTimeout(idleTimer.current);
      clearTimeout(warningTimer.current);
    };
  }, [resetTimers]);

  return { showWarning, extendSession, logout };
}
