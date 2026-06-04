import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardPath, AppRole } from "@/lib/portalNavConfig";
import Dashboard from "@/pages/Dashboard";

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-md bg-muted" />
        <div className="h-9 w-32 rounded-md bg-muted" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-7 w-16 rounded bg-muted" />
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>
      {/* Content panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <div className="h-5 w-36 rounded bg-muted" />
            <div className="space-y-2">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-4 rounded bg-muted" style={{ width: `${75 + (j % 3) * 10}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * For the "/dashboard" route: redirect users to their role-specific dashboard.
 * Waits for roles to fully load before deciding.
 */
export default function RoleDashboardRedirect() {
  const { roles, loading, rolesLoading, session } = useAuth();

  // Wait for both auth and roles to finish loading.
  // Also catch the race condition where session exists but roles
  // have not been fetched yet (navigate fires before onAuthStateChange).
  // Only block on loading/rolesLoading — drop the stuck condition that
  // shows a spinner forever when a user legitimately has no roles yet.
  const isStillLoading = loading || rolesLoading;

  if (isStillLoading) {
    return <DashboardSkeleton />;
  }

  // Super admin sees the generic dashboard
  if (roles.includes("super_admin")) {
    return <Dashboard />;
  }

  // For other roles, redirect to their primary role's dashboard
  if (roles.length > 0) {
    const primaryRole = roles[0] as AppRole;
    const dashPath = getDashboardPath(primaryRole);
    if (dashPath && dashPath !== "/dashboard") {
      return <Navigate to={dashPath} replace />;
    }
  }

  // Fallback
  return <Dashboard />;
}
