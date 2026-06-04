import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

// Full-page skeleton — shown only for the brief moment while the session is
// confirmed from Supabase localStorage on first render. Looks like the app
// rather than a blank screen with a spinner.
function AppSkeleton() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden lg:flex flex-col w-56 shrink-0 border-r bg-card p-4 gap-3 animate-pulse">
        <div className="h-8 w-32 rounded bg-muted mb-4" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-6 rounded bg-muted" style={{ width: `${60 + (i % 3) * 15}%` }} />
        ))}
      </div>
      {/* Main content */}
      <div className="flex-1 p-6 space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 rounded-md bg-muted" />
          <div className="h-9 w-32 rounded-md bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-7 w-16 rounded bg-muted" />
              <div className="h-3 w-32 rounded bg-muted" />
            </div>
          ))}
        </div>
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
    </div>
  );
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return <AppSkeleton />;

  if (!session) return <Navigate to="/auth" replace />;

  return <>{children}</>;
}
