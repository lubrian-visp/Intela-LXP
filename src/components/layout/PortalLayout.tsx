import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PortalSidebar from "./PortalSidebar";
import TopBar from "./TopBar";
import { DomainPortalConfig, AppRole } from "@/lib/portalNavConfig";
import { SidebarWidthProvider, useSidebarWidth } from "@/hooks/useSidebarWidth";

interface Props {
  config: DomainPortalConfig;
  userRoles: AppRole[];
  children: ReactNode;
}

function PortalLayoutInner({ config, userRoles, children }: Props) {
  const location = useLocation();
  const { width, isResizing } = useSidebarWidth();

  return (
    <div className="min-h-screen bg-background">
      {/* WCAG 2.1 — Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>

      <PortalSidebar config={config} userRoles={userRoles} />
      <div
        className={!isResizing ? "transition-all duration-200" : ""}
        style={{ paddingLeft: `${width}px` }}
      >
        <TopBar />
        <main id="main-content" className="p-3 sm:p-4" tabIndex={-1}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function PortalLayout(props: Props) {
  return (
    <SidebarWidthProvider>
      <PortalLayoutInner {...props} />
    </SidebarWidthProvider>
  );
}
