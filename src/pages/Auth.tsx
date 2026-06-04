import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, GraduationCap, Mail, Lock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useBrandingLogos } from "@/hooks/useBrandingLogos";
import { motion } from "framer-motion";
import authPanelBg from "@/assets/auth-panel-bg.jpg";

type Mode = "login" | "signup" | "forgot";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { headerLogo, headerLogoWidth } = useBrandingLogos();

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

    if (mode === "signup") {
      const { error } = await signUp(email, password, fullName);
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Account created! Please check your email to confirm.");
      setMode("login");
      return;
    }

    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branded panel */}
      <div
        className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-10 overflow-hidden"
        style={{ backgroundColor: "hsl(209, 69%, 18%)" }}
      >
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={authPanelBg}
            alt=""
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(209,69%,18%)]/60 via-[hsl(209,69%,18%)]/40 to-[hsl(209,69%,18%)]/80" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          {headerLogo ? (
            <img src={headerLogo} alt="Intela SkillChain logo" className="h-8 object-contain" style={{ maxWidth: `${headerLogoWidth}px` }} />
          ) : (
            <div className="flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-white" />
              <span className="text-white font-bold text-lg italic tracking-tight">intela</span>
            </div>
          )}
        </div>

        {/* Welcome text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10"
        >
          <p className="text-white/60 text-sm font-medium tracking-wide uppercase mb-2">
            Nice to see you again
          </p>
          <h1 className="text-5xl font-bold text-white tracking-tight leading-tight font-heading">
            WELCOME<br />BACK
          </h1>
          <div className="w-16 h-1 mt-5" style={{ backgroundColor: "hsl(27, 90%, 52%)" }} />
          <p className="text-white/50 text-sm mt-6 max-w-xs leading-relaxed">
            Access your learning dashboard, track progress, and continue your professional development journey.
          </p>
        </motion.div>

        {/* Spacer for bottom */}
        <div className="relative z-10" />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            {headerLogo ? (
              <img src={headerLogo} alt="Intela SkillChain logo" className="h-8 object-contain" style={{ maxWidth: `${headerLogoWidth}px` }} />
            ) : (
              <>
                <GraduationCap className="w-6 h-6 text-accent" />
                <span className="text-lg font-bold italic tracking-tight text-foreground">intela</span>
              </>
            )}
          </div>

          <h2 className="text-2xl font-bold text-foreground font-heading">
            {mode === "login" ? "Login Account" : mode === "signup" ? "Create Account" : "Reset Password"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 mb-8">
            {mode === "login"
              ? "Sign in to access your learning dashboard and manage your programmes."
              : mode === "signup"
              ? "Create your account to get started."
              : "Enter your email and we'll send you a reset link."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Full Name"
                    className="w-full h-12 pl-11 pr-4 border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  />
                </div>
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email ID"
                className="w-full h-12 pl-11 pr-4 border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
            </div>

            {mode !== "forgot" && (
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Password"
                  className="w-full h-12 pl-11 pr-4 border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                />
              </div>
            )}

            {mode === "login" && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-accent" />
                  Keep me signed in
                </label>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-accent hover:text-accent/80 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-sm font-semibold tracking-wide uppercase shadow-lg transition-all"
              style={{
                backgroundColor: "hsl(27, 90%, 52%)",
                color: "white",
              }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
            </Button>

            <div className="text-center pt-2">
              {mode === "login" ? (
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-accent hover:text-accent/80 font-semibold transition-colors"
                  >
                    Create account
                  </button>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-sm text-accent hover:text-accent/80 font-medium transition-colors"
                >
                  ← Back to sign in
                </button>
              )}
            </div>

            <div className="text-center pt-3 border-t border-border mt-4">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                ← Back to Home
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
