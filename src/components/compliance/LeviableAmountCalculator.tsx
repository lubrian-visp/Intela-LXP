import { useState, useEffect } from "react";
import { Calculator, Info, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSDProfile, useUpsertSDProfile, type SDProfile } from "@/hooks/useSponsorSD";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const currentFY = () => {
  const now = new Date();
  const year = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}/${year + 1}`;
};

export default function LeviableAmountCalculator() {
  const { user } = useAuth();
  const fy = currentFY();
  const { data: profile, isLoading } = useSDProfile(fy);
  const upsert = useUpsertSDProfile();

  const [leviable, setLeviable] = useState("");
  const [type, setType] = useState<"generic" | "qse">("generic");

  useEffect(() => {
    if (profile) {
      setLeviable(profile.annual_leviable_amount.toString());
      setType(profile.scorecard_type);
    }
  }, [profile]);

  const pct = type === "generic" ? 6 : 3;
  const amount = parseFloat(leviable) || 0;
  const target = amount * pct / 100;

  const handleSave = () => {
    if (!user) return;
    upsert.mutate({
      sponsor_id: user.id,
      financial_year: fy,
      scorecard_type: type,
      annual_leviable_amount: amount,
      target_percentage: pct,
    });
  };

  if (isLoading) return null;

  return (
    <FadeIn>
      <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Leviable Amount Calculator</h3>
          <Tooltip>
            <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              The leviable amount is your total annual remuneration derived from 12 months' EMP201 SDL contributions × 100.
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Scorecard type */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Scorecard Type</label>
            <div className="flex gap-2 mt-1.5">
              {(["generic", "qse"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    type === t ? "bg-primary text-primary-foreground shadow" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}
                >
                  {t === "generic" ? "Generic (6%)" : "QSE (3%)"}
                </button>
              ))}
            </div>
          </div>

          {/* Annual leviable amount */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Annual Leviable Amount (ZAR)
            </label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R</span>
              <input
                type="number"
                value={leviable}
                onChange={e => setLeviable(e.target.value)}
                placeholder="e.g. 10000000"
                className="w-full pl-7 pr-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Calculated target */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Required SD Spend ({pct}%)
            </label>
            <div className="mt-1.5 bg-secondary/50 rounded-lg px-4 py-2.5">
              <p className="text-lg font-bold text-success">R{target.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}</p>
              <p className="text-[10px] text-muted-foreground">FY {fy}</p>
            </div>
          </div>
        </div>

        {/* Sub-minimum warning */}
        {amount > 0 && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-3 flex items-start gap-3">
            <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground">Priority Element: 40% Sub-Minimum</p>
              <p className="text-[11px] text-muted-foreground">
                You must spend at least <strong>R{(target * 0.4).toLocaleString("en-ZA")}</strong> (40% of target) to avoid a B-BBEE level penalty.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={upsert.isPending || amount <= 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            {upsert.isPending ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </div>
    </FadeIn>
  );
}
