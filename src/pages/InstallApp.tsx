import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Smartphone, Wifi, WifiOff, Bell, ChevronRight, CheckCircle2, Monitor, Share, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [swStatus, setSwStatus] = useState<"checking" | "ready" | "unsupported" | "error">("checking");
  const [swError, setSwError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    // Check service worker status
    if (!("serviceWorker" in navigator)) {
      setSwStatus("unsupported");
    } else {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          setSwStatus("ready");
        } else {
          // SW not yet registered — wait briefly for vite-plugin-pwa to register it
          const timeout = setTimeout(() => {
            navigator.serviceWorker.getRegistration().then((r) => {
              setSwStatus(r ? "ready" : "error");
              if (!r) setSwError("Service worker has not registered. Please reload or visit from the published URL.");
            });
          }, 3000);
          return () => clearTimeout(timeout);
        }
      }).catch((err) => {
        setSwStatus("error");
        setSwError(err?.message ?? "Failed to check service worker");
      });
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    const installedHandler = () => setIsInstalled(true);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const features = [
    { icon: WifiOff, title: "Works Offline", desc: "Access your courses and content even without internet" },
    { icon: Bell, title: "Push Notifications", desc: "Get alerts for deadlines, sessions, and announcements" },
    { icon: Smartphone, title: "Native App Feel", desc: "Full-screen experience with smooth navigation" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/5 pt-16 pb-20 px-6">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-24 h-24 mx-auto rounded-3xl overflow-hidden shadow-xl ring-2 ring-primary/20"
          >
            <img src="/pwa-icon-512.png" alt="Intela SkillChain" className="w-full h-full object-contain bg-white" />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Install Intela SkillChain
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Get the full app experience — faster loading, offline access, and push notifications.
            </p>
          </motion.div>

          {/* Install CTA */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {isInstalled ? (
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-success/10 text-success font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                App is installed!
              </div>
            ) : deferredPrompt ? (
              <Button size="lg" onClick={handleInstall} className="rounded-full px-8 gap-2 text-base shadow-lg">
                <Download className="w-5 h-5" />
                Install App
              </Button>
            ) : isIOS ? (
              <Card className="max-w-sm mx-auto border-primary/20">
                <CardContent className="p-5 space-y-3 text-left">
                  <p className="text-sm font-semibold text-foreground">Install on iOS:</p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                      <span>Tap the <Share className="w-4 h-4 inline text-primary" /> Share button</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
                      <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
                      <span>Tap <strong>"Add"</strong> to confirm</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="max-w-sm mx-auto border-primary/20">
                <CardContent className="p-5 space-y-3 text-left">
                  <p className="text-sm font-semibold text-foreground">Install from your browser:</p>
                  <p className="text-sm text-muted-foreground">
                    Open the browser menu (⋮) and select <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>.
                  </p>
                  {swStatus === "error" && (
                    <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold">Install not available yet</p>
                        <p className="mt-1 text-destructive/80">{swError}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 text-xs gap-1"
                          onClick={() => window.location.reload()}
                        >
                          <RefreshCw className="w-3 h-3" /> Reload page
                        </Button>
                      </div>
                    </div>
                  )}
                  {swStatus === "checking" && (
                    <p className="text-xs text-muted-foreground/70 mt-2 animate-pulse">Checking install readiness…</p>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-6 flex-1">
        <h2 className="text-lg font-semibold text-foreground text-center">Why install?</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <Card className="h-full hover:shadow-md transition-shadow border-border/50">
                <CardContent className="p-5 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">{f.title}</h3>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Compatible platforms */}
      <div className="border-t border-border/50 bg-secondary/30 py-8 px-6">
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Works on all platforms</p>
          <div className="flex justify-center gap-6 text-muted-foreground">
            <div className="flex flex-col items-center gap-1">
              <Smartphone className="w-5 h-5" />
              <span className="text-[10px]">Android</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Smartphone className="w-5 h-5" />
              <span className="text-[10px]">iPhone</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Monitor className="w-5 h-5" />
              <span className="text-[10px]">Desktop</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
