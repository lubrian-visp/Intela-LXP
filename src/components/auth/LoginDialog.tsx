import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

type Mode = "login" | "forgot";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Password reset email sent. Check your inbox.");
      setMode("login");
      return;
    }

    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) return toast.error(error.message);
    onOpenChange(false);
    navigate("/dashboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 border-0 bg-transparent shadow-none [&>button]:hidden overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-[hsl(209,50%,14%)] rounded-xl border border-white/10 overflow-hidden"
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-2">
            <h2 className="text-xl font-bold text-white font-heading">
              {mode === "login" ? "Welcome Back" : "Reset Password"}
            </h2>
            <p className="text-sm text-white/50 mt-1">
              {mode === "login"
                ? "Sign in to access your learning dashboard"
                : "We'll send you a reset link"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pb-8 pt-4 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="lara.andile@intela.co.za"
                className="w-full h-11 px-4 rounded-md bg-[hsl(209,50%,10%)] border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[hsl(27,90%,52%)] focus:ring-1 focus:ring-[hsl(27,90%,52%)] transition-all"
              />
            </div>

            <AnimatePresence mode="wait">
              {mode === "login" && (
                <motion.div
                  key="password"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1.5"
                >
                  <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••••••"
                    className="w-full h-11 px-4 rounded-md bg-[hsl(209,50%,10%)] border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[hsl(27,90%,52%)] focus:ring-1 focus:ring-[hsl(27,90%,52%)] transition-all"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[hsl(27,90%,52%)] hover:bg-[hsl(27,90%,46%)] text-white font-semibold text-sm rounded-md shadow-lg shadow-[hsl(27,90%,52%)]/20 transition-all"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {mode === "login" ? "Sign In" : "Send Reset Link"}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>

            <div className="text-center">
              {mode === "login" ? (
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  Forgot password?
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  ← Back to sign in
                </button>
              )}
            </div>

            <div className="border-t border-white/5 pt-4 text-center">
              <p className="text-xs text-white/30 mb-2">Need the full authentication page?</p>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/auth");
                }}
                className="text-sm font-semibold text-white/60 hover:text-white transition-colors"
              >
                Go to Login Page
              </button>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
