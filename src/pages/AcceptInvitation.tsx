import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import { toast } from "sonner";

export default function AcceptInvitation() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { session, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState<"idle" | "accepting" | "accepted" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!token) {
      setError("Missing invitation token");
      setState("error");
      return;
    }
    setState("accepting");
    const db = supabase as any;
    const { data, error: rpcError } = await db.rpc("accept_tenant_invitation", { _token: token });
    if (rpcError) {
      setError(rpcError.message);
      setState("error");
      toast.error(rpcError.message);
      return;
    }
    setState("accepted");
    toast.success("Invitation accepted! Welcome to the workspace.");
    // Switch to the new tenant
    if (data) {
      try {
        await db.rpc("set_active_tenant", { _tenant_id: data });
        localStorage.setItem("active_tenant_id", data);
      } catch { /* non-fatal */ }
    }
    setTimeout(() => navigate("/"), 1500);
  };

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided in the link.");
      setState("error");
    }
  }, [token]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Sign in to accept
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You need to sign in (or create an account) with the invited email address before you can accept this invitation.
            </p>
            <Button asChild className="w-full">
              <Link to={`/auth?redirect=/accept-invitation?token=${token ?? ""}`}>
                Sign in / Sign up
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {state === "accepted" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
             state === "error" ? <XCircle className="w-5 h-5 text-destructive" /> :
             <Mail className="w-5 h-5" />}
            Workspace Invitation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "idle" && (
            <>
              <p className="text-sm text-muted-foreground">
                You've been invited to join a workspace. Signed in as <strong>{user?.email}</strong>.
                The invitation must match this email address.
              </p>
              <Button onClick={handleAccept} className="w-full">
                Accept invitation
              </Button>
            </>
          )}
          {state === "accepting" && (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Accepting…
            </div>
          )}
          {state === "accepted" && (
            <p className="text-sm text-muted-foreground">
              Invitation accepted. Redirecting you to the workspace…
            </p>
          )}
          {state === "error" && (
            <>
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                Go to dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
