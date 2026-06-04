import { useState, useMemo } from "react";
import {
  Target, TrendingUp, Award, FileBarChart, Shield,
  ChevronDown, Upload, ExternalLink, Info, Calculator, ClipboardCheck, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useAuth } from "@/hooks/useAuth";
import {
  useComplianceFrameworks,
  useComplianceIndicators,
  useComplianceRecords,
  calculateScore,
} from "@/hooks/useSponsorCompliance";
import { useRealtimeSync } from "@/hooks/useCoreData";
import { useSDProfile, useSDExpenditures, calculateExpenditureSummary } from "@/hooks/useSponsorSD";
import { Skeleton } from "@/components/ui/skeleton";
import ExportButton from "@/components/ExportButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeviableAmountCalculator from "@/components/compliance/LeviableAmountCalculator";
import ExpenditureTracker from "@/components/compliance/ExpenditureTracker";
import SETAComplianceChecklist from "@/components/compliance/SETAComplianceChecklist";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function ScoreGauge({ score, max, label }: { score: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min((score / max) * 100, 100) : 0;
  const color = pct >= 80 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive";
  return (
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto">
        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" className="stroke-secondary" strokeWidth="3" />
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" className={cn("transition-all duration-700", color.replace("text-", "stroke-"))} strokeWidth="3" strokeDasharray={`${pct}, 100`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-sm font-bold", color)}>{score.toFixed(1)}</span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
      <p className="text-[10px] text-muted-foreground">/ {max} pts</p>
    </div>
  );
}

function IndicatorRow({ indicator, record }: { indicator: any; record?: any }) {
  const actual = record?.actual_value ?? 0;
  const target = record?.target_value ?? indicator.target_value ?? 0;
  const score = calculateScore(actual, target, indicator.max_points);
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0;

  const formatVal = (v: number, unit: string) => {
    if (unit === "ZAR") return `R${v.toLocaleString()}`;
    if (unit === "percentage") return `${v}%`;
    if (unit === "hours") return `${v.toLocaleString()}h`;
    return v.toLocaleString();
  };

  return (
    <tr className="hover:bg-secondary/20 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full shrink-0", indicator.is_auto_captured ? "bg-success" : "bg-warning")} />
          <div>
            <p className="text-sm font-medium text-foreground">{indicator.indicator_name}</p>
            <p className="text-[10px] text-muted-foreground">{indicator.description}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground text-center">{formatVal(target, indicator.unit)}</td>
      <td className="px-4 py-3 text-center">
        <span className={cn("text-sm font-medium", pct >= 80 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive")}>
          {formatVal(actual, indicator.unit)}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center gap-2 justify-center">
          <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", pct >= 80 ? "bg-success" : pct >= 50 ? "bg-primary" : "bg-warning")} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground w-8">{Math.round(pct)}%</span>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={cn("text-sm font-bold", score >= indicator.max_points * 0.8 ? "text-success" : score >= indicator.max_points * 0.5 ? "text-warning" : "text-destructive")}>
          {score.toFixed(1)}
        </span>
        <span className="text-[10px] text-muted-foreground"> / {indicator.max_points}</span>
      </td>
      <td className="px-4 py-3 text-center">
        {record ? (
          <span className="text-[10px] text-muted-foreground">{(record.beneficiary_breakdown && Object.keys(record.beneficiary_breakdown).length > 0) ? "✓" : "—"}</span>
        ) : <span className="text-[10px] text-muted-foreground">—</span>}
      </td>
    </tr>
  );
}

export default function SponsorComplianceDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const currentFY = useMemo(() => {
    const now = new Date();
    const year = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
    return `${year}/${year + 1}`;
  }, []);

  const { data: sdProfile } = useSDProfile(currentFY);
  const { data: sdExpenditures = [] } = useSDExpenditures(sdProfile?.id);
  const spendSummary = useMemo(() => calculateExpenditureSummary(sdExpenditures, sdProfile ?? null), [sdExpenditures, sdProfile]);

  const { data: frameworks = [], isLoading: loadingFw } = useComplianceFrameworks();
  const framework = frameworks[0]; // Active framework
  const { data: indicators = [], isLoading: loadingInd } = useComplianceIndicators(framework?.id);
  const { data: records = [] } = useComplianceRecords(framework?.id, user?.id);

  useRealtimeSync(["sponsor_compliance_records", "sponsor_compliance_reports"]);

  const sdIndicators = useMemo(() => indicators.filter((i: any) => i.category === "skills_development"), [indicators]);
  const edIndicators = useMemo(() => indicators.filter((i: any) => i.category === "enterprise_development"), [indicators]);

  const getRecord = (indicatorId: string) => records.find((r: any) => r.indicator_id === indicatorId);

  const sdScore = useMemo(() => sdIndicators.reduce((sum: number, ind: any) => {
    const rec = getRecord(ind.id);
    return sum + calculateScore(rec?.actual_value ?? 0, rec?.target_value ?? ind.target_value ?? 0, ind.max_points);
  }, 0), [sdIndicators, records]);

  const edScore = useMemo(() => edIndicators.reduce((sum: number, ind: any) => {
    const rec = getRecord(ind.id);
    return sum + calculateScore(rec?.actual_value ?? 0, rec?.target_value ?? ind.target_value ?? 0, ind.max_points);
  }, 0), [edIndicators, records]);

  const sdMax = useMemo(() => sdIndicators.reduce((s: number, i: any) => s + i.max_points, 0), [sdIndicators]);
  const edMax = useMemo(() => edIndicators.reduce((s: number, i: any) => s + i.max_points, 0), [edIndicators]);
  const totalScore = sdScore + edScore;
  const totalMax = sdMax + edMax;

  // B-BBEE Level calculation
  const bbbeeLevel = useMemo(() => {
    const pct = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
    if (pct >= 100) return "Level 1";
    if (pct >= 95) return "Level 2";
    if (pct >= 90) return "Level 3";
    if (pct >= 80) return "Level 4";
    if (pct >= 60) return "Level 5";
    if (pct >= 50) return "Level 6";
    if (pct >= 40) return "Level 7";
    if (pct >= 30) return "Level 8";
    return "Non-Compliant";
  }, [totalScore, totalMax]);

  const exportData = useMemo(() => indicators.map((ind: any) => {
    const rec = getRecord(ind.id);
    return {
      Category: ind.category === "skills_development" ? "Skills Development" : "Enterprise Development",
      Indicator: ind.indicator_name,
      Unit: ind.unit,
      Target: rec?.target_value ?? ind.target_value ?? 0,
      Actual: rec?.actual_value ?? 0,
      Score: calculateScore(rec?.actual_value ?? 0, rec?.target_value ?? ind.target_value ?? 0, ind.max_points),
      Max_Points: ind.max_points,
    };
  }), [indicators, records]);

  if (loadingFw || loadingInd) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!framework) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold text-foreground">No Compliance Framework</h2>
        <p className="text-sm text-muted-foreground mt-1">No active compliance framework is configured for your region.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{framework.framework_name}</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {(framework as any).countries?.iso_code ?? ""}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{framework.description}</p>
          </div>
          <ExportButton
            data={exportData}
            filename={`bbbee-compliance-report`}
            columns={[
              { key: "Category", label: "Category" },
              { key: "Indicator", label: "Indicator" },
              { key: "Unit", label: "Unit" },
              { key: "Target", label: "Target" },
              { key: "Actual", label: "Actual" },
              { key: "Score", label: "Score" },
              { key: "Max_Points", label: "Max Points" },
            ]}
          />
        </div>
      </FadeIn>

      {/* Score Summary Cards */}
      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "SD Score", value: sdScore.toFixed(1), sub: `/ ${sdMax} pts`, icon: TrendingUp, color: "text-primary" },
          { label: "ED Score", value: edScore.toFixed(1), sub: `/ ${edMax} pts`, icon: Target, color: "text-accent" },
          { label: "Total Score", value: totalScore.toFixed(1), sub: `/ ${totalMax} pts`, icon: Award, color: "text-success" },
          { label: "B-BBEE Level", value: bbbeeLevel, sub: framework.version ? `v${framework.version}` : "", icon: Shield, color: "text-warning" },
          {
            label: "Avg Spend / Learner",
            value: `R${spendSummary.perLearner.averageSpend.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`,
            sub: `${spendSummary.perLearner.learnerCount} learner${spendSummary.perLearner.learnerCount !== 1 ? "s" : ""} tagged`,
            icon: Users,
            color: "text-accent",
          },
        ].map(s => (
          <StaggerItem key={s.label}>
            <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-secondary"><s.icon className="w-4 h-4 text-muted-foreground" /></div>
              </div>
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              {s.sub && <p className="text-[10px] text-muted-foreground">{s.sub}</p>}
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Score Gauges */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Score Breakdown</h3>
        <div className="flex items-center justify-center gap-8 flex-wrap">
          <ScoreGauge score={sdScore} max={sdMax} label="Skills Development" />
          <ScoreGauge score={edScore} max={edMax} label="Enterprise Development" />
          <ScoreGauge score={totalScore} max={totalMax} label="Combined Total" />
        </div>
      </div>

      {/* Tabs: SD / ED / Beneficiaries */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-secondary/50 flex-wrap">
          <TabsTrigger value="overview">All Indicators</TabsTrigger>
          <TabsTrigger value="sd">Skills Development</TabsTrigger>
          <TabsTrigger value="ed">Enterprise Development</TabsTrigger>
          <TabsTrigger value="beneficiaries">Beneficiaries</TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center gap-1"><Calculator className="w-3.5 h-3.5" /> SD Calculator</TabsTrigger>
          <TabsTrigger value="expenditure" className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Expenditure</TabsTrigger>
          <TabsTrigger value="seta" className="flex items-center gap-1"><ClipboardCheck className="w-3.5 h-3.5" /> SETA Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <IndicatorTable indicators={indicators} getRecord={getRecord} />
        </TabsContent>
        <TabsContent value="sd">
          <IndicatorTable indicators={sdIndicators} getRecord={getRecord} />
        </TabsContent>
        <TabsContent value="ed">
          <IndicatorTable indicators={edIndicators} getRecord={getRecord} />
        </TabsContent>
        <TabsContent value="beneficiaries">
          <BeneficiaryPanel categories={framework.beneficiary_categories ?? []} />
        </TabsContent>
        <TabsContent value="calculator">
          <LeviableAmountCalculator />
        </TabsContent>
        <TabsContent value="expenditure">
          <ExpenditureTracker profile={sdProfile ?? null} />
        </TabsContent>
        <TabsContent value="seta">
          <SETAComplianceChecklist financialYear={currentFY} />
        </TabsContent>
      </Tabs>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Auto-captured</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> Manual entry</span>
        <span>Formula: Score = (Actual ÷ Target) × Max Points (capped)</span>
      </div>
    </div>
  );
}

function IndicatorTable({ indicators, getRecord }: { indicators: any[]; getRecord: (id: string) => any }) {
  if (indicators.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No indicators configured.</p>;
  }
  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Indicator</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Target</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actual</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Progress</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {indicators.map((ind: any) => (
              <IndicatorRow key={ind.id} indicator={ind} record={getRecord(ind.id)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BeneficiaryPanel({ categories }: { categories: string[] }) {
  if (!categories.length) return <p className="text-sm text-muted-foreground text-center py-8">No beneficiary categories defined.</p>;
  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">B-BBEE Beneficiary Categories</h3>
      <p className="text-xs text-muted-foreground mb-4">Previously Disadvantaged Individuals (HDIs) eligible for SD and ED tracking under South African B-BBEE Codes.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {categories.map((cat: string) => (
          <div key={cat} className="bg-secondary/40 rounded-lg p-3 text-center">
            <p className="text-xs font-medium text-foreground">{cat}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
