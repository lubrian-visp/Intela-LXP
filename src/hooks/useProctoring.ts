import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProctoringViolation {
  type: string;
  details: string;
  severity: "warning" | "critical";
  timestamp: string;
}

interface UseProctoringOptions {
  enabled: boolean;
  submissionId: string;
  learnerId: string;
  requireFullscreen?: boolean;
  detectTabSwitch?: boolean;
  maxViolations?: number;
  onMaxViolationsReached?: () => void;
}

export function useProctoring(options: UseProctoringOptions) {
  const {
    enabled,
    submissionId,
    learnerId,
    requireFullscreen = true,
    detectTabSwitch = true,
    maxViolations = 5,
    onMaxViolationsReached,
  } = options;

  const [violations, setViolations] = useState<ProctoringViolation[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const violationCountRef = useRef(0);

  const logViolation = useMutation({
    mutationFn: async (violation: ProctoringViolation) => {
      const { error } = await supabase.from("proctoring_violations").insert({
        submission_id: submissionId,
        learner_id: learnerId,
        violation_type: violation.type,
        details: { description: violation.details },
        severity: violation.severity,
        timestamp: violation.timestamp,
      });
      if (error) throw error;
    },
  });

  const addViolation = useCallback(
    (type: string, details: string, severity: "warning" | "critical" = "warning") => {
      const violation: ProctoringViolation = {
        type,
        details,
        severity,
        timestamp: new Date().toISOString(),
      };
      setViolations((prev) => [...prev, violation]);
      violationCountRef.current += 1;
      logViolation.mutate(violation);

      if (violationCountRef.current >= maxViolations && onMaxViolationsReached) {
        onMaxViolationsReached();
      }
    },
    [maxViolations, onMaxViolationsReached, logViolation]
  );

  // Tab switch / visibility detection
  useEffect(() => {
    if (!enabled || !detectTabSwitch || !isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        addViolation("tab_switch", "Learner switched away from the assessment tab", "warning");
      }
    };

    const handleBlur = () => {
      addViolation("window_blur", "Assessment window lost focus", "warning");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [enabled, detectTabSwitch, isActive, addViolation]);

  // Fullscreen detection
  useEffect(() => {
    if (!enabled || !requireFullscreen || !isActive) return;

    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && isActive) {
        addViolation("fullscreen_exit", "Learner exited fullscreen mode", "critical");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [enabled, requireFullscreen, isActive, addViolation]);

  // Right-click prevention
  useEffect(() => {
    if (!enabled || !isActive) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      addViolation("right_click", "Learner attempted right-click during assessment", "warning");
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, [enabled, isActive, addViolation]);

  // Copy/paste prevention
  useEffect(() => {
    if (!enabled || !isActive) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      addViolation("copy_attempt", "Learner attempted to copy content", "warning");
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      addViolation("paste_attempt", "Learner attempted to paste content", "critical");
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, [enabled, isActive, addViolation]);

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch {
      console.warn("Fullscreen request denied");
    }
  }, []);

  const startProctoring = useCallback(() => {
    setIsActive(true);
    violationCountRef.current = 0;
    setViolations([]);
    if (requireFullscreen) {
      enterFullscreen();
    }
  }, [requireFullscreen, enterFullscreen]);

  const stopProctoring = useCallback(() => {
    setIsActive(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  return {
    violations,
    violationCount: violations.length,
    isFullscreen,
    isActive,
    startProctoring,
    stopProctoring,
    enterFullscreen,
  };
}
