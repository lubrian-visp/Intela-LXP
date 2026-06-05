import { useEffect } from "react";

const APP_NAME = "Intela LXP";

/**
 * Sets document.title on every page for accessibility (screen readers
 * announce the page title on navigation) and SEO.
 *
 * Usage:
 *   usePageTitle("My Grades");          → "My Grades — Intela LXP"
 *   usePageTitle("Dashboard", "Learner Portal");  → "Dashboard | Learner Portal — Intela LXP"
 */
export function usePageTitle(page: string, section?: string) {
  useEffect(() => {
    const title = section
      ? `${page} | ${section} — ${APP_NAME}`
      : `${page} — ${APP_NAME}`;
    document.title = title;
    return () => {
      document.title = APP_NAME;
    };
  }, [page, section]);
}
