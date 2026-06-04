import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { CheckCircle, XCircle, Clock, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CheckinState = "loading" | "success" | "late" | "error" | "no-params";

export default function QrCheckin() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const sessionId = params.get("session");
  const qrToken = params.get("token");

  const [state, setState] = useState<CheckinState>(sessionId && qrToken ? "loading" : "no-params");
  const [message, setMessage] = useState("");
  const [lateMinutes, setLateMinutes] = useState(0);

  useEffect(() => {
    if (!sessionId || !qrToken || !user) return;

    const doCheckin = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("qr-checkin", {
          body: { session_id: sessionId, qr_token: qrToken },
        });

        if (error) {
          setState("error");
          setMessage(error.message || "Check-in failed");
          return;
        }

        if (data?.error) {
          setState("error");
          setMessage(data.error);
          return;
        }

        const late = data?.late_minutes || 0;
        setLateMinutes(late);
        if (late > 0) {
          setState("late");
          setMessage(`You are ${late} minute${late !== 1 ? "s" : ""} late.`);
        } else {
          setState("success");
          setMessage("You have been checked in successfully!");
        }
      } catch (err: any) {
        setState("error");
        setMessage(err.message || "Unexpected error");
      }
    };

    doCheckin();
  }, [sessionId, qrToken, user]);

  const icons = {
    loading: <Loader2 className="w-12 h-12 animate-spin text-accent" />,
    success: <CheckCircle className="w-12 h-12 text-success" />,
    late: <Clock className="w-12 h-12 text-warning" />,
    error: <XCircle className="w-12 h-12 text-destructive" />,
    "no-params": <QrCode className="w-12 h-12 text-muted-foreground" />,
  };

  const titles = {
    loading: "Checking in…",
    success: "Checked In!",
    late: "Late Arrival",
    error: "Check-in Failed",
    "no-params": "Invalid QR Code",
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <FadeIn>
        <div className="max-w-sm mx-auto text-center space-y-4">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mx-auto",
            state === "success" && "bg-success/10",
            state === "late" && "bg-warning/10",
            state === "error" && "bg-destructive/10",
            state === "loading" && "bg-accent/10",
            state === "no-params" && "bg-muted",
          )}>
            {icons[state]}
          </div>
          <h1 className="text-xl font-bold text-foreground">{titles[state]}</h1>
          <p className="text-sm text-muted-foreground">
            {state === "no-params"
              ? "This link is missing required parameters. Please scan a valid session QR code."
              : state === "loading"
              ? "Please wait while we verify your attendance…"
              : message}
          </p>
          {state === "late" && (
            <div className="bg-warning/10 rounded-lg px-4 py-3 text-sm text-warning font-medium">
              {lateMinutes} min late — recorded in your attendance
            </div>
          )}
          {state !== "loading" && (
            <Button variant="outline" onClick={() => window.close()} className="mt-4">
              Close
            </Button>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
