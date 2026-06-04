import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "super_admin" | "systems_admin" | "programme_manager" | "facilitator" | "assessor" | "moderator" | "mentor" | "learner" | "sponsor" | "operations" | "talent_manager";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  location: string | null;
  organisation: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  rolesLoading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CACHE_KEY = "auth_cache_v1";

function readCache(): { userId: string; profile: Profile | null; roles: AppRole[] } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeCache(payload: { userId: string; profile: Profile | null; roles: AppRole[] }) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload)); } catch {}
}
function clearCache() { try { sessionStorage.removeItem(CACHE_KEY); } catch {} }

export function AuthProvider({ children }: { children: ReactNode }) {
  const cached = typeof window !== "undefined" ? readCache() : null;
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(cached?.profile ?? null);
  const [roles, setRoles] = useState<AppRole[]>(cached?.roles ?? []);
  // If we have cached roles, treat as not loading — we'll revalidate in background.
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(!cached);
  const [initialLoadDone, setInitialLoadDone] = useState(!!cached);
  const initialLoadDoneRef = useRef(!!cached);

  const fetchProfileAndRoles = async (userId: string, silent = false) => {
    if (!silent) setRolesLoading(true);
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const nextProfile = (profileRes.data as Profile) ?? null;
    const nextRoles = rolesRes.data ? rolesRes.data.map((r: any) => r.role as AppRole) : [];
    if (profileRes.data) setProfile(nextProfile);
    if (rolesRes.data) setRoles(nextRoles);
    writeCache({ userId, profile: nextProfile, roles: nextRoles });
    setRolesLoading(false);
    setInitialLoadDone(true);
    initialLoadDoneRef.current = true;
  };

  useEffect(() => {
    let initialSessionHandled = false;

    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Skip the INITIAL_SESSION event — we handle it via getSession below
        if (event === "INITIAL_SESSION") return;

        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          // Only re-fetch on actual auth changes (sign-in, token refresh), not on initial load
          if (initialLoadDoneRef.current) {
            const hasCacheForUser = cached?.userId === newSession.user.id;
            if (hasCacheForUser) {
              // Use cached roles immediately; revalidate silently in background
              setTimeout(() => fetchProfileAndRoles(newSession.user.id, true), 0);
            } else {
              setRolesLoading(true);
              setTimeout(() => fetchProfileAndRoles(newSession.user.id), 0);
            }
          }
        } else {
          setProfile(null);
          setRoles([]);
          setRolesLoading(false);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session (single fetch, no duplicate)
    supabase.auth.getSession().then(async ({ data: { session: existing } }) => {
      if (initialSessionHandled) return;
      initialSessionHandled = true;
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        const hasCacheForUser = cached?.userId === existing.user.id;
        if (hasCacheForUser) {
          // Render immediately with cached data; revalidate in background
          setLoading(false);
          fetchProfileAndRoles(existing.user.id, true);
        } else {
          await fetchProfileAndRoles(existing.user.id);
        }
      } else {
        clearCache();
        setInitialLoadDone(true);
        initialLoadDoneRef.current = true;
        setRolesLoading(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    // Pre-populate roles/profile cache BEFORE returning so that when the caller
    // navigates to /dashboard the data is already available — no loading flash.
    if (!error && data.user) {
      await fetchProfileAndRoles(data.user.id, true);
    }
    return { error };
  };

  const signOut = async () => {
    clearCache();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  const refreshProfile = async () => {
    if (user) await fetchProfileAndRoles(user.id);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, roles, loading, rolesLoading, signUp, signIn, signOut, hasRole, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
