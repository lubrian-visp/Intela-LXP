import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Lock, GraduationCap, CheckCircle2, AlertTriangle } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [ready, setReady]         = useState(false);
  const [checking, setChecking]   = useState(true);
  const [success, setSuccess]     = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    /**
     * Supabase v2 delivers the recovery session via onAuthStateChange
     * with event = "PASSWORD_RECOVERY". We MUST listen for this event
     * to establish the session before calling updateUser().
     *
     * As a fallback, we also check the URL hash for legacy links
     * (older email links that contain #access_token + type=recovery).
     */

    // 1. Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          setReady(true);
          setChecking(false);
        }
      }
    );

    // 2. Fallback: check URL hash for legacy recovery links
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      // Give the onAuthStateChange handler a moment to fire first
      setTimeout(() => {
        setChecking(prev => {
          if (!prev) return false; // already resolved via event
          setReady(true);
          return false;
        });
      }, 800);
    } else {
      // No recovery signal at all — check if there's an active session
      // (user may have already established session via the event)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setReady(true);
        }
        setChecking(false);
      });
    }

    // Clean up URL hash so the token isn't reused on refresh
    if (window.location.hash.includes("access_token")) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSuccess(true);
    toast.success("Password updated successfully!");
    setTimeout(() => navigate("/auth"), 2500);
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
        </div>
      </div>
    );
  }

  // ── Invalid / expired link ─────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Reset link invalid or expired</h1>
            <p className="text-sm text-muted-foreground mt-1">
              This link has already been used or has expired (links are valid for 1 hour).
              Please request a new one.
            </p>
          </div>
          <button
            onClick={() => navigate("/auth")}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Back to sign in — request new link
          </button>
        </div>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-green-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Password updated!</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your new password has been saved. Redirecting you to sign in…
            </p>
          </div>
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // ── Password form ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a strong password for your account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-4"
          aria-label="Set new password form"
        >
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="text-xs font-medium text-muted-foreground block">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                aria-describedby="password-hint"
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
            <p id="password-hint" className="text-[10px] text-muted-foreground">
              Must be at least 8 characters.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground block">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={8}
                placeholder="Re-enter your new password"
                aria-describedby={confirm && confirm !== password ? "password-mismatch" : undefined}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
            {confirm && confirm !== password && (
              <p id="password-mismatch" className="text-[11px] text-destructive" role="alert">
                Passwords do not match.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirm || password !== confirm}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Update password"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Updating password…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
