import { Globe, Building2, GraduationCap, Briefcase, FileCheck, DollarSign, FileText, Shield, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CountryMapping, ComplianceRequirement, FundingRule, ReportingMandate, IncentiveScheme } from "@/hooks/useProgrammeTypes";
import type { Json } from "@/integrations/supabase/types";

interface CountryOverlayData {
  mapping: CountryMapping & {
    regulatory_bodies: { name: string; acronym: string } | null;
    qualification_frameworks: { name: string; acronym: string; total_levels: number } | null;
  };
  compliance: (ComplianceRequirement & { regulatory_bodies: { name: string; acronym: string } | null })[];
  framework: { legislative_references: Json | null; sector_regulations: Json | null } | null;
  fundingRules: FundingRule[];
  reportingMandates: ReportingMandate[];
  incentives: IncentiveScheme[];
}

interface CountryOverlayPanelProps {
  data: CountryOverlayData;
  countryName: string;
  countryFlag?: string;
}

export default function CountryOverlayPanel({ data, countryName }: CountryOverlayPanelProps) {
  const { mapping, compliance, fundingRules, reportingMandates, incentives } = data;

  const additionalRules = mapping.additional_rules as Record<string, boolean> | null;
  const activeRules = additionalRules ? Object.entries(additionalRules).filter(([, v]) => v) : [];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="bg-card rounded-xl shadow-card border border-accent/20 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent/10">
            <Globe className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Country Overlay: {countryName}</h3>
            <p className="text-[11px] text-muted-foreground">
              Local name: <span className="font-semibold text-accent">{mapping.local_name}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {mapping.regulatory_bodies && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Regulatory Body</p>
                <p className="text-[11px] font-medium text-foreground truncate">{mapping.regulatory_bodies.acronym}</p>
              </div>
            </div>
          )}
          {mapping.qualification_frameworks && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
              <GraduationCap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Qualification Framework</p>
                <p className="text-[11px] font-medium text-foreground truncate">{mapping.qualification_frameworks.acronym} ({mapping.qualification_frameworks.total_levels} levels)</p>
              </div>
            </div>
          )}
          {mapping.workplace_percentage !== null && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
              <Briefcase className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Workplace / Theory Split</p>
                <p className="text-[11px] font-medium text-foreground">{mapping.workplace_percentage}% / {mapping.theory_percentage}%</p>
              </div>
            </div>
          )}
          {mapping.mentor_requirements && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
              <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Mentor Requirements</p>
                <p className="text-[11px] font-medium text-foreground truncate" title={mapping.mentor_requirements}>{mapping.mentor_requirements}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compliance Requirements */}
      {compliance.length > 0 && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-warning" />
            <h4 className="text-xs font-semibold text-foreground">Compliance Requirements ({compliance.length})</h4>
          </div>
          <div className="divide-y divide-border/50">
            {compliance.map((req) => (
              <div key={req.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-foreground">{req.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{req.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium",
                    req.is_mandatory ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"
                  )}>
                    {req.is_mandatory ? "Mandatory" : "Optional"}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground capitalize">
                    {req.frequency?.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Funding Rules */}
      {fundingRules.length > 0 && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-success" />
            <h4 className="text-xs font-semibold text-foreground">Funding & Tax Incentives ({fundingRules.length})</h4>
          </div>
          <div className="divide-y divide-border/50">
            {fundingRules.map((rule) => (
              <div key={rule.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-foreground">{rule.name}</p>
                    <p className="text-[10px] text-muted-foreground">{rule.description}</p>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium shrink-0 capitalize",
                    rule.funding_type === "levy" ? "bg-info/10 text-info" :
                    rule.funding_type === "grant" ? "bg-success/10 text-success" :
                    rule.funding_type === "tax_incentive" ? "bg-warning/10 text-warning" :
                    "bg-secondary text-muted-foreground"
                  )}>
                    {rule.funding_type.replace("_", " ")}
                  </span>
                </div>
                {rule.rate_or_amount && (
                  <p className="text-[10px] text-accent font-medium mt-1">{rule.rate_or_amount}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reporting Mandates */}
      {reportingMandates.length > 0 && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <FileText className="w-4 h-4 text-info" />
            <h4 className="text-xs font-semibold text-foreground">Reporting Mandates ({reportingMandates.length})</h4>
          </div>
          <div className="divide-y divide-border/50">
            {reportingMandates.map((mandate) => (
              <div key={mandate.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-foreground">
                    {mandate.acronym && <span className="text-accent mr-1">[{mandate.acronym}]</span>}
                    {mandate.report_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{mandate.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground capitalize">{mandate.frequency}</span>
                  <span className="px-2 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground uppercase">{mandate.template_format}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incentive Schemes */}
      {incentives.length > 0 && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h4 className="text-xs font-semibold text-foreground">Incentive Schemes ({incentives.length})</h4>
          </div>
          <div className="divide-y divide-border/50">
            {incentives.map((scheme) => (
              <div key={scheme.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-foreground">{scheme.scheme_name}</p>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium capitalize",
                    scheme.scheme_type === "points" ? "bg-accent/10 text-accent" :
                    scheme.scheme_type === "tax_deduction" ? "bg-warning/10 text-warning" :
                    "bg-secondary text-muted-foreground"
                  )}>
                    {scheme.scheme_type.replace("_", " ")}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{scheme.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Additional Rules */}
      {activeRules.length > 0 && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
          <h4 className="text-xs font-semibold text-foreground mb-3">Active Country Rules</h4>
          <div className="flex flex-wrap gap-2">
            {activeRules.map(([key]) => (
              <span key={key} className="px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-[10px] font-medium">
                {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
