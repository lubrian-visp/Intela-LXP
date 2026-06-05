import { useState } from "react";
import { Award, CheckCircle2, Share2, Copy, Check, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  credentials: any[];
}

function CredentialCard({ c }: { c: any }) {
  const [copied, setCopied] = useState(false);

  const shareUrl  = `${window.location.origin}/verify/${c.id}`;
  const shortHash = c.blockchain_hash ? `${c.blockchain_hash.slice(0, 8)}…` : null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Verification link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      await navigator.share({
        title: c.title,
        text:  `I earned ${c.title} on Intela LXP. Verify here:`,
        url:   shareUrl,
      }).catch(() => {}); // user cancelled
    } else {
      handleCopy(e);
    }
  };

  return (
    <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 hover:border-accent/30 hover:shadow-card-hover transition-all group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 pr-2">
          <h4 className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors truncate">
            {c.title}
          </h4>
          <p className="text-[10px] text-muted-foreground capitalize">{c.credential_type}</p>
        </div>
        <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {c.issued_at ? format(new Date(c.issued_at), "MMM dd, yyyy") : "—"}
        </span>

        <div className="flex items-center gap-1.5">
          {shortHash && (
            <a
              href={`https://etherscan.io/tx/${c.blockchain_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View on blockchain explorer"
              className="text-[10px] font-mono text-muted-foreground flex items-center gap-0.5 hover:text-primary transition-colors"
              onClick={e => e.stopPropagation()}
            >
              {shortHash} <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}

          <button
            onClick={handleCopy}
            aria-label={`Copy verification link for ${c.title}`}
            title="Copy verification link"
            className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center transition-colors",
              copied ? "bg-green-500/10 text-green-600" : "bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10"
            )}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>

          <button
            onClick={handleShare}
            aria-label={`Share ${c.title} credential`}
            title="Share credential"
            className="w-6 h-6 rounded-md bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-colors"
          >
            <Share2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LearnerCredentialWallet({ credentials }: Props) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Award className="w-4 h-4 text-accent" /> Credential Wallet
        {credentials.length > 0 && (
          <span className="text-[10px] text-muted-foreground font-normal ml-auto">
            {credentials.length} earned
          </span>
        )}
      </h3>
      {credentials.length === 0 ? (
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-center">
          <Award className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">No credentials earned yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {credentials.map((c: any) => <CredentialCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}
