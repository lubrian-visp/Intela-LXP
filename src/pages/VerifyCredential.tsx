import { Award, CheckCircle2, XCircle, Search, Shield, Clock, GraduationCap, User, Building2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface VerifiedCredential {
  title: string;
  type: string;
  issuedAt: string;
  hash: string;
  status: "active" | "revoked" | "expired" | "pending";
}

export default function VerifyCredential() {
  const [searchHash, setSearchHash] = useState("");
  const [result, setResult] = useState<VerifiedCredential | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    const trimmed = searchHash.trim().toLowerCase();
    if (!trimmed) return;

    setLoading(true);
    setSearched(false);

    try {
      // Search by blockchain_hash (partial match on the short prefix or full hash)
      // Use the safe verification view that excludes learner_id and programme_id
      const { data, error } = await (supabase as any)
        .from("credential_verification_safe")
        .select("*")
        .or(`blockchain_hash.ilike.%${trimmed}%,verification_url.ilike.%${trimmed}%`)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setResult(null);
      } else {
        setResult({
          title: data.title,
          type: data.credential_type,
          issuedAt: data.issued_at ?? "—",
          hash: data.blockchain_hash ?? "—",
          status: data.status as any,
        });
      }
    } catch {
      setResult(null);
    }

    setSearched(true);
    setLoading(false);
  };

  const isValid = result?.status === "active";

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero */}
      <div className="bg-gradient-primary py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20 mb-6">
            <Shield className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground mb-3">Credential Verification Portal</h1>
          <p className="text-sm text-primary-foreground/70 mb-8 max-w-lg mx-auto">
            Verify the authenticity of blockchain-anchored credentials issued through the Intela SkillChain platform. Enter a verification hash to validate.
          </p>

          {/* Search */}
          <div className="flex items-center gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchHash}
                onChange={e => setSearchHash(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleVerify()}
                placeholder="Enter verification hash (e.g., 0xa3f8...)"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-card text-foreground text-sm font-mono placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-accent shadow-lg"
              />
            </div>
            <button
              onClick={handleVerify}
              disabled={!searchHash.trim() || loading}
              className={cn(
                "px-6 py-3.5 rounded-xl text-sm font-semibold transition-all shadow-lg",
                searchHash.trim() && !loading
                  ? "bg-gradient-accent text-accent-foreground shadow-glow hover:opacity-90"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
        {loading && (
          <div className="text-center py-16 animate-pulse">
            <Shield className="w-10 h-10 text-accent mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Verifying credential on blockchain...</p>
          </div>
        )}

        {searched && !loading && !result && (
          <div className="text-center py-16 animate-slide-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">Credential Not Found</h2>
            <p className="text-sm text-muted-foreground">No credential matching this hash was found. Please double-check the hash and try again.</p>
          </div>
        )}

        {searched && !loading && result && (
          <div className="animate-slide-up space-y-6">
            {/* Verification Badge */}
            <div className={cn(
              "flex items-center gap-4 p-5 rounded-2xl border",
              isValid ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
            )}>
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center",
                isValid ? "bg-success/10" : "bg-destructive/10"
              )}>
                {isValid ? (
                  <CheckCircle2 className="w-7 h-7 text-success" />
                ) : (
                  <XCircle className="w-7 h-7 text-destructive" />
                )}
              </div>
              <div>
                <h2 className={cn("text-lg font-bold", isValid ? "text-success" : "text-destructive")}>
                  {isValid ? "Credential Verified ✓" : "Credential Invalid"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isValid
                    ? "This credential has been verified on the blockchain and is authentic."
                    : "This credential could not be verified."}
                </p>
              </div>
            </div>

            {/* Credential Details */}
            <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
              <div className="p-6 border-b border-border">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Award className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{result.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{result.type}</p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-border/50">
                {[
                  { label: "Credential Type", value: result.type, icon: <GraduationCap className="w-4 h-4 text-muted-foreground" /> },
                  { label: "Date Issued", value: result.issuedAt ? new Date(result.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—", icon: <Clock className="w-4 h-4 text-muted-foreground" /> },
                ].map(row => (
                  <div key={row.label} className="px-6 py-3.5 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">{row.icon}{row.label}</span>
                    <span className="text-sm font-medium text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Blockchain Details */}
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent" />Blockchain Record
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">SHA-256 Hash</span>
                  <span className="text-xs font-mono text-foreground truncate max-w-[400px]">{result.hash}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span className={cn("text-xs font-medium capitalize", isValid ? "text-success" : "text-destructive")}>{result.status}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!searched && !loading && (
          <div className="text-center py-16">
            <Shield className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Enter a credential hash above to verify its authenticity.</p>
          </div>
        )}
      </div>
    </div>
  );
}
