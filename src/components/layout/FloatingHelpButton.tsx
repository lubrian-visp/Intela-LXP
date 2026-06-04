import { HelpCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function FloatingHelpButton() {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on public pages or on the help page itself
  const hiddenPaths = ["/", "/auth", "/reset-password", "/verify", "/privacy-policy", "/help", "/install"];
  if (hiddenPaths.includes(location.pathname)) return null;

  return (
    <button
      onClick={() => navigate("/help")}
      className={cn(
        "fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full",
        "bg-accent text-accent-foreground shadow-lg",
        "flex items-center justify-center",
        "hover:scale-110 hover:shadow-xl transition-all duration-200",
        "group"
      )}
      title="Help Centre"
    >
      <HelpCircle className="w-5 h-5" />
      <span className="absolute right-full mr-3 px-3 py-1.5 rounded-lg bg-card border border-border shadow-lg text-xs font-medium text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
        Help Centre
      </span>
    </button>
  );
}
