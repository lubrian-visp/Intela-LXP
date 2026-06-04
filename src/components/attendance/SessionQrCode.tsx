import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { QrCode, RefreshCw, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Props {
  session: any;
  onUpdate?: () => void;
}

export default function SessionQrCode({ session, onUpdate }: Props) {
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

  const qrEnabled = session?.qr_checkin_enabled ?? false;
  const qrToken = session?.qr_token ?? "";
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  
  // Build the check-in URL
  const checkinUrl = `${window.location.origin}/qr-checkin?session=${session?.id}&token=${qrToken}`;

  const handleToggle = async (enabled: boolean) => {
    setToggling(true);
    const { error } = await supabase
      .from("training_sessions")
      .update({ qr_checkin_enabled: enabled })
      .eq("id", session.id);
    setToggling(false);
    if (error) toast.error("Failed to update QR setting");
    else {
      toast.success(enabled ? "QR check-in enabled" : "QR check-in disabled");
      onUpdate?.();
    }
  };

  const handleRefreshToken = async () => {
    // Generate a new random token
    const newToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    const { error } = await supabase
      .from("training_sessions")
      .update({ qr_token: newToken })
      .eq("id", session.id);
    if (error) toast.error("Failed to refresh token");
    else {
      toast.success("QR code refreshed");
      onUpdate?.();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(checkinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied!");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <QrCode className="w-4 h-4" /> QR Check-in
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" /> QR Check-in
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <Label htmlFor="qr-toggle" className="text-sm">Enable QR Check-in</Label>
            <Switch
              id="qr-toggle"
              checked={qrEnabled}
              onCheckedChange={handleToggle}
              disabled={toggling}
            />
          </div>

          {qrEnabled && qrToken && (
            <>
              <div className="bg-background border border-border rounded-xl p-6 flex flex-col items-center gap-4">
                <QRCodeSVG
                  value={checkinUrl}
                  size={200}
                  level="H"
                  includeMargin
                  bgColor="transparent"
                  fgColor="hsl(var(--foreground))"
                />
                <p className="text-[10px] text-muted-foreground text-center max-w-[250px] break-all">
                  {checkinUrl}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} className="flex-1 gap-1.5">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy Link"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleRefreshToken} className="gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Learners scan this QR code to check in. Late arrivals (after scheduled start) are automatically tracked.
                Refreshing generates a new code and invalidates the previous one.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
