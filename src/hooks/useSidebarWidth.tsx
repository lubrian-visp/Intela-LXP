import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

interface SidebarWidthContextType {
  width: number;
  setWidth: (w: number) => void;
  isResizing: boolean;
  setIsResizing: (v: boolean) => void;
}

const SidebarWidthContext = createContext<SidebarWidthContextType>({
  width: 260,
  setWidth: () => {},
  isResizing: false,
  setIsResizing: () => {},
});

const STORAGE_KEY = "sidebar-width";
const MIN_WIDTH = 220;
const MAX_WIDTH = 380;

export function SidebarWidthProvider({ children }: { children: ReactNode }) {
  const [width, setWidthState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? parseInt(stored, 10) : 260;
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed));
  });
  const [isResizing, setIsResizing] = useState(false);

  const setWidth = useCallback((w: number) => {
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w));
    setWidthState(clamped);
    localStorage.setItem(STORAGE_KEY, String(clamped));
  }, []);

  return (
    <SidebarWidthContext.Provider value={{ width, setWidth, isResizing, setIsResizing }}>
      {children}
    </SidebarWidthContext.Provider>
  );
}

export function useSidebarWidth() {
  return useContext(SidebarWidthContext);
}

export { MIN_WIDTH, MAX_WIDTH };
