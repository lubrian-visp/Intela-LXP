import { useState } from "react";
import { Plus, Trash2, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  useSDExpenditures, useAddExpenditure, useDeleteExpenditure,
  SD_CATEGORIES, calculateExpenditureSummary,
  type SDProfile, type SDExpenditure,
} from "@/hooks/useSponsorSD";
import { useEnrolments } from "@/hooks/useCoreData";
import { FadeIn } from "@/components/animations/MotionWrappers";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const BENEFICIARY_TYPES = [
  "Black African", "Coloured", "Indian", "Black Women",
  "Black Youth", "People with Disabilities", "Rural/Under-developed", "Military Veterans",
];

function AddExpenditureDialog({ profile, enrolments, onAdded }: { profile: SDProfile; enrolments: any[]; onAdded: () => void }) {
  const { user } = useAuth();
  const addMut = useAddExpenditure();
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState("direct_training");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [accredited, setAccredited] = useState(false);
  const [date, setDate] = useState("");
  const [learnerId, setLearnerId] = useState("");

  const handleAdd = () => {
    if (!user || !amount) return;
    addMut.mutate({
      profile_id: profile.id,
      sponsor_id: user.id,
      category: cat,
      amount: parseFloat(amount),
      description: desc || null,
      beneficiary_type: beneficiary || null,
      is_accredited: accredited,
      expenditure_date: date || null,
      learner_id: learnerId || null,
    } as any, {
      onSuccess: () => {
        setOpen(false);
        setAmount(""); setDesc(""); setBeneficiary(""); setAccredited(false); setDate(""); setLearnerId("");
        onAdded();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-all">
          <Plus className="w-3.5 h-3.5" /> Add Expenditure
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add SD Expenditure</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <select value={cat} onChange={e => setCat(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm">
              {SD_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Amount (ZAR)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Assign to Learner (optional)</label>
            <select value={learnerId} onChange={e => setLearnerId(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm">
              <option value="">— Untagged (general) —</option>
              {enrolments.map((e: any) => (
                <option key={e.id} value={e.learner_id}>
                  {e.profiles?.full_name || e.learner_id?.substring(0, 8)} — {e.cohorts?.programmes?.title ?? "Programme"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Beneficiary Type</label>
            <select value={beneficiary} onChange={e => setBeneficiary(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm">
              <option value="">— Select —</option>
              {BENEFICIARY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={accredited} onChange={e => setAccredited(e.target.checked)} className="rounded" />
              Accredited training
            </label>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="ml-2 px-2 py-1 rounded border border-border bg-background text-xs" />
            </div>
          </div>
          <button onClick={handleAdd} disabled={addMut.isPending || !amount} className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {addMut.isPending ? "Adding…" : "Add Expenditure"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ExpenditureTracker({ profile }: { profile: SDProfile | null }) {
  const { data: expenditures = [], refetch } = useSDExpenditures(profile?.id);
  const { data: enrolments = [] } = useEnrolments();
  const deleteMut = useDeleteExpenditure();
  const summary = calculateExpenditureSummary(expenditures, profile);

  if (!profile) {
    return (
      <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 text-center">
        <p className="text-sm text-muted-foreground">Save your leviable amount profile first to track expenditures.</p>
      </div>
    );
  }

  return (
    <FadeIn>
      <div className="space-y-4">
        {/* Summary bar */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Expenditure Summary
            </h3>
            <AddExpenditureDialog profile={profile} enrolments={enrolments as any[]} onAdded={() => refetch()} />
          </div>

          {/* Achievement vs target + per-learner average */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">R{summary.total.toLocaleString("en-ZA")}</p>
              <p className="text-[10px] text-muted-foreground">Total Spend</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">R{summary.target.toLocaleString("en-ZA")}</p>
              <p className="text-[10px] text-muted-foreground">Target</p>
            </div>
            <div className="text-center">
              <p className={cn("text-lg font-bold", summary.achievementPct >= 100 ? "text-success" : summary.achievementPct >= 40 ? "text-warning" : "text-destructive")}>
                {summary.achievementPct.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground">Achievement</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-accent">
                R{summary.perLearner.averageSpend.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-muted-foreground">Avg / Learner ({summary.perLearner.learnerCount})</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 bg-secondary rounded-full overflow-hidden relative">
            <div className="absolute top-0 bottom-0 w-0.5 bg-warning z-10" style={{ left: "40%" }} />
            <div
              className={cn("h-full rounded-full transition-all duration-700", summary.achievementPct >= 100 ? "bg-success" : summary.achievementPct >= 40 ? "bg-primary" : "bg-destructive")}
              style={{ width: `${Math.min(summary.achievementPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
            <span>0%</span>
            <span className="text-warning font-medium">40% sub-min</span>
            <span>100%</span>
          </div>

          {/* Sub-minimum warning */}
          {!summary.meetsSubMinimum && summary.target > 0 && (
            <div className="mt-3 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-[11px] text-destructive font-medium">
                Below 40% sub-minimum! Spending R{summary.total.toLocaleString("en-ZA")} of R{summary.subMinAmount.toLocaleString("en-ZA")} required. B-BBEE level penalty will apply.
              </p>
            </div>
          )}
        </div>

        {/* Category breakdown with cap warnings */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
          <h4 className="text-xs font-semibold text-foreground mb-3">Category Breakdown</h4>
          <div className="space-y-2">
            {SD_CATEGORIES.map(cat => {
              const spend = summary.byCategory[cat.key] ?? 0;
              const capInfo = cat.key === "admin" ? summary.caps.admin
                : cat.key === "informal_training" ? summary.caps.informal
                : cat.key === "travel_accommodation" ? summary.caps.travel
                : null;
              return (
                <div key={cat.key} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground">{cat.label}</span>
                    {capInfo?.exceeded && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Cap exceeded
                      </span>
                    )}
                  </div>
                  <span className={cn("text-xs font-medium", capInfo?.exceeded ? "text-destructive" : "text-foreground")}>
                    R{spend.toLocaleString("en-ZA")}
                    {capInfo && <span className="text-muted-foreground font-normal"> / R{capInfo.cap.toLocaleString("en-ZA")}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-learner spend breakdown */}
        {summary.perLearner.learnerCount > 0 && (
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
            <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" /> Spend Per Learner
            </h4>
            <div className="space-y-2">
              {Object.entries(summary.perLearner.byLearner)
                .sort(([, a], [, b]) => b - a)
                .map(([lid, spend]) => {
                  const enrolment = (enrolments as any[]).find((e: any) => e.learner_id === lid);
                  const name = enrolment?.profiles?.full_name || lid.substring(0, 8);
                  const programme = enrolment?.cohorts?.programmes?.title ?? "";
                  return (
                    <div key={lid} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                      <div>
                        <p className="text-xs font-medium text-foreground">{name}</p>
                        {programme && <p className="text-[10px] text-muted-foreground">{programme}</p>}
                      </div>
                      <span className="text-xs font-bold text-foreground">R{spend.toLocaleString("en-ZA")}</span>
                    </div>
                  );
                })}
              {summary.perLearner.untaggedSpend > 0 && (
                <div className="flex items-center justify-between py-1.5 text-muted-foreground">
                  <span className="text-xs italic">Untagged / General</span>
                  <span className="text-xs font-medium">R{summary.perLearner.untaggedSpend.toLocaleString("en-ZA")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent expenditures */}
        {expenditures.length > 0 && (
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Date</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Category</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Description</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Beneficiary</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Learner</th>
                  <th className="text-right px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Amount</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {expenditures.slice(0, 20).map(exp => {
                  const enrolment = exp.learner_id ? (enrolments as any[]).find((e: any) => e.learner_id === exp.learner_id) : null;
                  return (
                    <tr key={exp.id} className="hover:bg-secondary/20">
                      <td className="px-3 py-2 text-muted-foreground">{exp.expenditure_date ?? "—"}</td>
                      <td className="px-3 py-2">{SD_CATEGORIES.find(c => c.key === exp.category)?.label ?? exp.category}</td>
                      <td className="px-3 py-2 text-muted-foreground">{exp.description ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{exp.beneficiary_type ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{enrolment?.profiles?.full_name ?? (exp.learner_id ? exp.learner_id.substring(0, 8) : "—")}</td>
                      <td className="px-3 py-2 text-right font-medium">R{exp.amount.toLocaleString("en-ZA")}</td>
                      <td className="px-2 py-2">
                        <button onClick={() => deleteMut.mutate(exp.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FadeIn>
  );
}
