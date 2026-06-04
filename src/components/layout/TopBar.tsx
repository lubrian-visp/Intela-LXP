import { Search, ChevronDown, Moon, Sun, LogOut, Settings, HelpCircle } from "lucide-react";
import NotificationBell from "@/components/layout/NotificationBell";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const pageTitles: Record<string, string> = {
  "/": "Admin Dashboard",
  "/learner": "Learner Dashboard",
  "/facilitator": "Facilitator Dashboard",
  "/programmes": "Programmes",
  "/pathways": "Pathways",
  "/cohorts": "Cohorts",
  "/modules": "Modules",
  "/assessments": "Assessments",
  "/credentials": "Credentials",
  "/portfolio": "Portfolio of Evidence",
  "/analytics": "Analytics",
  "/talent": "Talent Management",
  "/sponsors": "Sponsors & Partners",
  "/sponsor-portal": "Sponsor Portal",
  "/assessor": "Assessor Portal",
  "/mentor": "Mentor Portal",
  "/moderator": "Moderator Portal",
  "/programme-manager": "Programme Manager",
  "/operations": "Operations Control",
  "/admin/programme-types": "Programme Type Engine",
  "/admin/tenants": "Tenant Management",
  "/admin/roles": "Roles & Permissions",
  "/admin/popia": "PoPIA Compliance",
  "/admin/settings": "Settings",
  "/help": "Help Centre",
};

const searchablePages = Object.entries(pageTitles).map(([path, title]) => ({ path, title }));


export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, roles, signOut } = useAuth();
  const title = pageTitles[location.pathname] || "Dashboard";

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const roleBadge = roles.length > 0
    ? roles[0].replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : "User";

  // Dark mode
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") { setDark(true); document.documentElement.classList.add("dark"); }
  }, []);

  // Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filteredPages = searchQuery.trim()
    ? searchablePages.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  const handleSearchSelect = (path: string) => { navigate(path); setSearchOpen(false); setSearchQuery(""); };

  // Notifications handled by NotificationBell component

  // User menu
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-12 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-3 sm:px-4">
      <div className="pl-10 lg:pl-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search */}
        <div className="relative hidden sm:block" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search... ⌘K"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            className="pl-9 pr-4 py-2 text-sm bg-secondary rounded-lg border-0 outline-none focus:ring-2 focus:ring-accent w-48 lg:w-64 text-foreground placeholder:text-muted-foreground"
          />
          {searchOpen && filteredPages.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-fade-in z-50">
              {filteredPages.map(p => (
                <button
                  key={p.path}
                  onClick={() => handleSearchSelect(p.path)}
                  className={cn("w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors flex items-center justify-between", location.pathname === p.path && "text-accent font-medium")}
                >
                  <span className="text-foreground">{p.title}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{p.path}</span>
                </button>
              ))}
            </div>
          )}
          {searchOpen && searchQuery.trim() && filteredPages.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg p-4 text-center animate-fade-in z-50">
              <p className="text-sm text-muted-foreground">No results for "{searchQuery}"</p>
            </div>
          )}
        </div>

        {/* Dark mode */}
        <button onClick={toggleDark} className="p-2 rounded-lg hover:bg-secondary transition-colors" title={dark ? "Light mode" : "Dark mode"}>
          {dark ? <Sun className="w-[18px] h-[18px] text-accent" /> : <Moon className="w-[18px] h-[18px] text-muted-foreground" />}
        </button>

        {/* Help */}
        <button onClick={() => navigate("/help")} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Help Centre">
          <HelpCircle className="w-[18px] h-[18px] text-muted-foreground" />
        </button>

        {/* Notifications */}
        <NotificationBell />

        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* User Menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserOpen(!userOpen)}
            className="flex items-center gap-2 hover:bg-secondary px-2 py-1.5 rounded-lg transition-colors"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-accent-foreground shrink-0">
                {initials}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-foreground leading-tight truncate max-w-[140px]">{profile?.full_name || "User"}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{roleBadge}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-fade-in z-50">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">{profile?.full_name || "User"}</p>
                <p className="text-[11px] text-muted-foreground">{user?.email}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {roles.map(r => (
                    <span key={r} className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent">
                      {r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                  ))}
                  {roles.length === 0 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-secondary text-muted-foreground">No roles assigned</span>
                  )}
                </div>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { setUserOpen(false); navigate("/my-settings"); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  My Settings
                </button>
                <button
                  onClick={async () => { setUserOpen(false); await signOut(); navigate("/"); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
