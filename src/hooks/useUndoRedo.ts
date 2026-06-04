import { useState, useCallback, useEffect, useRef } from "react";

export interface UndoRedoAction {
  type: "add" | "delete" | "reorder" | "edit";
  payload: any;
  undo: () => void;
  redo: () => void;
  label: string;
}

interface UseUndoRedoOptions {
  maxHistory?: number;
  onUndo?: (action: UndoRedoAction) => void;
  onRedo?: (action: UndoRedoAction) => void;
}

export function useUndoRedo(options: UseUndoRedoOptions = {}) {
  const { maxHistory = 50, onUndo, onRedo } = options;
  const [undoStack, setUndoStack] = useState<UndoRedoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoRedoAction[]>([]);
  const isPerformingRef = useRef(false);

  const pushAction = useCallback(
    (action: UndoRedoAction) => {
      if (isPerformingRef.current) return;
      setUndoStack((prev) => {
        const next = [...prev, action];
        return next.length > maxHistory ? next.slice(-maxHistory) : next;
      });
      setRedoStack([]);
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const action = prev[prev.length - 1];
      isPerformingRef.current = true;
      try {
        action.undo();
        onUndo?.(action);
      } finally {
        isPerformingRef.current = false;
      }
      setRedoStack((r) => [...r, action]);
      return prev.slice(0, -1);
    });
  }, [onUndo]);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const action = prev[prev.length - 1];
      isPerformingRef.current = true;
      try {
        action.redo();
        onRedo?.(action);
      } finally {
        isPerformingRef.current = false;
      }
      setUndoStack((u) => [...u, action]);
      return prev.slice(0, -1);
    });
  }, [onRedo]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const lastAction = undoStack[undoStack.length - 1] ?? null;

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.key.toLowerCase() !== "z") return;

      // Skip if user is typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  return {
    pushAction,
    undo,
    redo,
    canUndo,
    canRedo,
    undoStack,
    redoStack,
    lastAction,
    clear,
    actionCount: undoStack.length,
  };
}
