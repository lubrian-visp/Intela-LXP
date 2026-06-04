import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AdminPasswordResetButtonProps {
  email: string | null | undefined;
  userName?: string | null;
  variant?: "button" | "dropdown";
  className?: string;
}

export default function AdminPasswordResetButton({
  email,
  userName,
  variant = "button",
  className,
}: AdminPasswordResetButtonProps) {
  const [isSending, setIsSending] = useState(false);

  const handleReset = async () => {
    if (!email) {
      toast.error("No email address available for this user.");
      return;
    }

    setIsSending(true);
    try {
      // Use our branded edge function instead of Supabase's default email
      const { data, error } = await supabase.functions.invoke("send-password-reset", {
        body: {
          email,
          userName: userName || null,
          redirectTo: `${window.location.origin}/reset-password`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        `Password reset email sent to ${userName || email}.`,
        { description: "They will receive a branded Intela email with a secure reset link." }
      );
    } catch (err: any) {
      toast.error("Failed to send password reset email", {
        description: err?.message ?? "Please try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (variant === "dropdown") {
    return (
      <button
        onClick={handleReset}
        disabled={isSending || !email}
        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full gap-2"
      >
        {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
        Reset Password
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={className ?? "text-xs gap-1.5"}
      onClick={handleReset}
      disabled={isSending || !email}
    >
      {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
      Reset Password
    </Button>
  );
}
