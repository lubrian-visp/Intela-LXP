import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { GraduationCap, Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
      <div className="p-4 rounded-2xl bg-secondary mb-6">
        <GraduationCap className="w-10 h-10 text-muted-foreground" />
      </div>
      <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
      <p className="text-lg text-muted-foreground mb-1">Page not found</p>
      <p className="text-sm text-muted-foreground/60 mb-8 max-w-sm text-center">
        The page <code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{location.pathname}</code> doesn't exist in Intela SkillChain.
      </p>
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-accent text-accent-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity"
        >
          <Home className="w-4 h-4" />
          Go to Dashboard
        </Link>
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-secondary text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    </div>
  );
};

export default NotFound;
