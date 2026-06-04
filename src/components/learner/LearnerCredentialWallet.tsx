import { Award, CheckCircle2, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Props {
  credentials: any[];
}

export default function LearnerCredentialWallet({ credentials }: Props) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Award className="w-4 h-4 text-accent" /> Credential Wallet
      </h3>
      {credentials.length === 0 ? (
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-center">
          <Award className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">No credentials earned yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {credentials.map((c: any) => (
            <div key={c.id} className="bg-card rounded-xl p-4 shadow-card border border-border/50 hover:border-accent/30 hover:shadow-card-hover transition-all cursor-pointer group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">{c.title}</h4>
                  <p className="text-[10px] text-muted-foreground capitalize">{c.credential_type}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {c.issued_at ? format(new Date(c.issued_at), "MMM dd, yyyy") : "—"}
                </span>
                {c.blockchain_hash && (
                  <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                    {c.blockchain_hash.slice(0, 8)}… <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
