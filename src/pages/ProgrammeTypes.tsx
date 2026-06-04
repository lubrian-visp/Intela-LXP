import SafeDeleteProgrammeTypeDialog from "@/components/programme-types/SafeDeleteProgrammeTypeDialog";
import { Cog, Plus, Save, ChevronRight, Briefcase, Users, Clock, FileCheck, Award, Shield, Link, BookOpen, RotateCcw, Pencil, X, Copy, Globe, Loader2, Building2, DollarSign, ShieldCheck, GitBranch, UserCog, FlaskConical, ClipboardList } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useProgrammeTypes, useCountries, useCountryOverlay, useCreateProgrammeType, useUpdateProgrammeType, useDeleteProgrammeType } from "@/hooks/useProgrammeTypes";
import type { ProgrammeType } from "@/hooks/useProgrammeTypes";
import type { Json } from "@/integrations/supabase/types";
import CountryOverlayPanel from "@/components/programme-types/CountryOverlayPanel";
import {
  StructuralEditor,
  FinancialEditor,
  ComplianceEditor,
  WorkflowEditor,
  HREditor,
  EvaluationEditor,
} from "@/components/programme-types/CategoryEditors";
import AssessmentMatrixEditor from "@/components/programme-types/AssessmentMatrixEditor";
import TypeDNACard from "@/components/programme-types/TypeDNACard";
import TabStepper, { type ConfigTab } from "@/components/programme-types/TabStepper";
import ConfigHealthScore from "@/components/programme-types/ConfigHealthScore";
import TemplatePresets, { type PresetTemplate } from "@/components/programme-types/TemplatePresets";
import ConditionalHints from "@/components/programme-types/ConditionalHints";
import ImpactAnalysisPanel from "@/components/programme-types/ImpactAnalysisPanel";
import { resolveConfig, defaultCategories, type OptionValue, type ProgrammeTypeConfig } from "@/types/programmeTypeConfig";
import { toast } from "sonner";

interface BehaviourFlag {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  options: { value: OptionValue; label: string }[];
}

const behaviourFlags: BehaviourFlag[] = [
  { key: "workplace", label: "Workplace Requirements", icon: <Briefcase className="w-4 h-4" />, description: "Controls whether workplace-based learning and mentor validation is required.", options: [{ value: "required", label: "Mandatory" }, { value: "optional", label: "Optional" }, { value: "not_allowed", label: "Not Allowed" }] },
  { key: "cohort", label: "Cohort Model", icon: <Users className="w-4 h-4" />, description: "Determines whether learners must be enrolled in a cohort.", options: [{ value: "required", label: "Required" }, { value: "optional", label: "Optional (Self-paced)" }, { value: "not_allowed", label: "Self-paced Only" }] },
  { key: "duration", label: "Duration Model", icon: <Clock className="w-4 h-4" />, description: "How programme timelines are managed.", options: [{ value: "required", label: "Fixed Duration" }, { value: "optional", label: "Rolling Enrolment" }, { value: "not_allowed", label: "Flexible / Open" }] },
  { key: "assessment", label: "Assessment Model", icon: <FileCheck className="w-4 h-4" />, description: "Primary method of learner evaluation.", options: [{ value: "required", label: "Competency-Based" }, { value: "optional", label: "Exam-Based" }, { value: "not_allowed", label: "Project-Based" }] },
  { key: "poe", label: "Portfolio of Evidence", icon: <BookOpen className="w-4 h-4" />, description: "Whether learners must submit a portfolio of evidence.", options: [{ value: "required", label: "Mandatory" }, { value: "optional", label: "Optional" }, { value: "not_allowed", label: "Not Required" }] },
  { key: "credential", label: "Credential Model", icon: <Award className="w-4 h-4" />, description: "Type of credentials issued upon completion.", options: [{ value: "required", label: "Micro-credentials Only" }, { value: "optional", label: "Stackable" }, { value: "not_allowed", label: "Full Qualification" }] },
  { key: "verification", label: "External Verification", icon: <Shield className="w-4 h-4" />, description: "Whether external body verification is needed.", options: [{ value: "required", label: "Required" }, { value: "optional", label: "Optional" }, { value: "not_allowed", label: "Not Required" }] },
  { key: "regulatory", label: "Regulatory Tagging", icon: <Shield className="w-4 h-4" />, description: "Link to regulatory framework requirements.", options: [{ value: "enabled", label: "Enabled" }, { value: "disabled", label: "Disabled" }] },
  { key: "blockchain", label: "Blockchain Issuance", icon: <Link className="w-4 h-4" />, description: "Whether credentials are anchored on-chain.", options: [{ value: "required", label: "Required" }, { value: "optional", label: "Optional" }, { value: "disabled", label: "Disabled" }] },
];

const defaultConfig: Record<string, OptionValue> = {
  workplace: "optional", cohort: "optional", duration: "optional", assessment: "required",
  poe: "optional", credential: "optional", verification: "not_allowed", regulatory: "disabled", blockchain: "disabled",
};

const presetColors = [
  "hsl(222, 60%, 18%)", "hsl(38, 92%, 50%)", "hsl(210, 80%, 55%)",
  "hsl(152, 60%, 40%)", "hsl(0, 70%, 55%)", "hsl(280, 60%, 50%)",
  "hsl(190, 70%, 45%)", "hsl(330, 65%, 50%)",
];

const optionStyle: Record<OptionValue, string> = {
  required: "bg-success/10 text-success border-success/30",
  optional: "bg-info/10 text-info border-info/30",
  not_allowed: "bg-secondary text-muted-foreground border-border",
  enabled: "bg-success/10 text-success border-success/30",
  disabled: "bg-secondary text-muted-foreground border-border",
};

const configTabs: { key: ConfigTab; label: string; icon: React.ReactNode }[] = [
  { key: "behaviour", label: "Behaviour", icon: <Cog className="w-3.5 h-3.5" /> },
  { key: "structural", label: "Structural", icon: <Building2 className="w-3.5 h-3.5" /> },
  { key: "financial", label: "Financial", icon: <DollarSign className="w-3.5 h-3.5" /> },
  { key: "compliance", label: "Compliance", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { key: "workflow", label: "Workflow", icon: <GitBranch className="w-3.5 h-3.5" /> },
  { key: "hr", label: "HR", icon: <UserCog className="w-3.5 h-3.5" /> },
  { key: "evaluation", label: "K/P/W", icon: <FlaskConical className="w-3.5 h-3.5" /> },
  { key: "assessments", label: "Assessments", icon: <ClipboardList className="w-3.5 h-3.5" /> },
];

export default function ProgrammeTypes() {
  const { data: types = [], isLoading } = useProgrammeTypes();
  const { data: countries = [] } = useCountries();
  const createMutation = useCreateProgrammeType();
  const updateMutation = useUpdateProgrammeType();
  const deleteMutation = useDeleteProgrammeType();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localConfigs, setLocalConfigs] = useState<Record<string, Record<string, any>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<ConfigTab>("behaviour");
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null); // unsaved-changes guard

  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formColor, setFormColor] = useState(presetColors[0]);
  const [presetConfig, setPresetConfig] = useState<Record<string, any> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const effectiveSelectedId = selectedId || types[0]?.id || null;
  const selected = types.find(t => t.id === effectiveSelectedId);

  const resolvedConfig = selected
    ? resolveConfig({ ...(selected.config as Record<string, any>), ...(localConfigs[selected.id] || {}) })
    : null;

  const { data: countryOverlay, isLoading: overlayLoading } = useCountryOverlay(
    selectedCountryId || undefined,
    selected?.name
  );

  const updateBehaviourFlag = (key: string, value: OptionValue) => {
    if (!effectiveSelectedId) return;
    setLocalConfigs(prev => ({
      ...prev,
      [effectiveSelectedId]: { ...(prev[effectiveSelectedId] || {}), [key]: value },
    }));
    setHasChanges(true);
  };

  const updateCategory = (category: string, data: any) => {
    if (!effectiveSelectedId) return;
    setLocalConfigs(prev => ({
      ...prev,
      [effectiveSelectedId]: { ...(prev[effectiveSelectedId] || {}), [category]: data },
    }));
    setHasChanges(true);
  };

  // K/P/W validation — must equal 100% before saving
  const kpwValid = resolvedConfig
    ? (resolvedConfig.evaluation.knowledge_weight +
       resolvedConfig.evaluation.practical_weight +
       resolvedConfig.evaluation.workplace_weight) === 100
    : true;

  const saveChanges = async () => {
    if (!kpwValid) {
      toast.error("K/P/W weights must total exactly 100% before saving. Go to the K/P/W tab to fix.");
      setActiveTab("evaluation");
      return;
    }
    for (const [id, overrides] of Object.entries(localConfigs)) {
      const type = types.find(t => t.id === id);
      if (!type) continue;
      const rawConfig = type.config as Record<string, any>;
      const merged = { ...rawConfig, ...overrides };
      await updateMutation.mutateAsync({ id, config: merged as unknown as Json });
    }
    setLocalConfigs({});
    setHasChanges(false);
    toast.success("Changes saved successfully");
  };

  // Unsaved-changes guard: intercept type switch
  const requestSelectType = (id: string) => {
    if (hasChanges && id !== effectiveSelectedId) {
      setPendingSelectId(id);
    } else {
      setSelectedId(id);
      setSelectedCountryId(null);
    }
  };

  const confirmDiscardAndSwitch = () => {
    if (pendingSelectId) {
      setLocalConfigs({});
      setHasChanges(false);
      setSelectedId(pendingSelectId);
      setSelectedCountryId(null);
      setPendingSelectId(null);
    }
  };

  const resetChanges = () => {
    setLocalConfigs({});
    setHasChanges(false);
  };

  const openCreateModal = (preset?: PresetTemplate) => {
    setModalMode("create");
    setFormName(preset?.name || "");
    setFormDesc(preset?.description || "");
    setFormColor(preset?.color || presetColors[Math.floor(Math.random() * presetColors.length)]);
    setPresetConfig(preset?.config || null);
    setShowModal(true);
  };

  const openEditModal = () => {
    if (!selected) return;
    setModalMode("edit");
    setFormName(selected.name);
    setFormDesc(selected.description || "");
    setFormColor(selected.color);
    setPresetConfig(null);
    setShowModal(true);
  };

  const handleSaveModal = async () => {
    if (!formName.trim()) return;
    if (modalMode === "create") {
      const configToUse = presetConfig || { ...defaultConfig, ...defaultCategories };
      const result = await createMutation.mutateAsync({
        name: formName.trim(),
        description: formDesc.trim(),
        color: formColor,
        config: configToUse as unknown as Json,
      });
      setSelectedId(result.id);
    } else if (effectiveSelectedId) {
      await updateMutation.mutateAsync({
        id: effectiveSelectedId,
        name: formName.trim(),
        description: formDesc.trim(),
        color: formColor,
      });
    }
    setShowModal(false);
    setPresetConfig(null);
    toast.success(modalMode === "create" ? "Type created" : "Type updated");
  };

  const handleDelete = async (id: string) => {
    const typeToDelete = types.find(t => t.id === id);
    if (typeToDelete && typeToDelete.programme_count > 0) {
      toast.error("Cannot delete: this type has linked programmes. Remove or reassign them first.");
      return;
    }
    setDeleteTarget(typeToDelete ? { id: typeToDelete.id, name: typeToDelete.name } : null);
  };

  const handleDuplicate = async () => {
    if (!selected) return;
    const result = await createMutation.mutateAsync({
      name: `${selected.name} (Copy)`,
      description: selected.description,
      color: selected.color,
      config: selected.config,
    });
    setSelectedId(result.id);
    toast.success("Type duplicated");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-accent shadow-glow">
            <Cog className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Programme Type Engine</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configure behaviour rules and attribute templates that cascade across all dependent entities.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button onClick={resetChanges} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary text-muted-foreground text-sm font-medium hover:text-foreground transition-colors">
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          )}
          <button
            onClick={saveChanges}
            disabled={!hasChanges || updateMutation.isPending}
            title={hasChanges && !kpwValid ? "K/P/W weights must total 100% before saving" : undefined}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all",
              hasChanges && kpwValid
                ? "bg-gradient-accent text-accent-foreground shadow-glow hover:opacity-90"
                : hasChanges && !kpwValid
                  ? "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {hasChanges && !kpwValid ? "Fix K/P/W first" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Type Selector Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Programme Types</p>
            <button onClick={() => openCreateModal()} className="p-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors" title="Add new type">
              <Plus className="w-3.5 h-3.5 text-accent" />
            </button>
          </div>

          <div className="space-y-2">
            {types.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/50 bg-secondary/20 p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <Cog className="w-5 h-5 text-accent" />
                </div>
                <p className="text-sm font-semibold text-foreground">No programme types yet</p>
                <p className="text-[11px] text-muted-foreground mt-1 mb-3">
                  Create your first type or start from a template below.
                </p>
                <button
                  onClick={() => openCreateModal()}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                >
                  + Create a type
                </button>
              </div>
            )}
            {types.map(t => (
              <TypeDNACard
                key={t.id}
                type={t}
                isSelected={effectiveSelectedId === t.id}
                onSelect={() => requestSelectType(t.id)}
                onDelete={() => handleDelete(t.id)}
                onEdit={() => { requestSelectType(t.id); openEditModal(); }}
                canDelete={t.programme_count === 0}
              />
            ))}
          </div>

          {/* Template Presets */}
          <TemplatePresets onSelect={(preset) => openCreateModal(preset)} />

          {/* Country Selector */}
          {countries.length > 0 && selected && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Country Overlay</p>
              <div className="relative">
                <select
                  value={selectedCountryId || ""}
                  onChange={(e) => setSelectedCountryId(e.target.value || null)}
                  className="w-full px-3 py-2.5 text-sm bg-card rounded-xl border border-border/50 text-foreground appearance-none cursor-pointer focus:ring-2 focus:ring-accent focus:outline-none"
                >
                  <option value="">No country overlay</option>
                  {countries.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.iso_code})</option>
                  ))}
                </select>
                <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Configuration Panel */}
        {selected && resolvedConfig && (
          <div className={cn("space-y-4 animate-fade-in")} style={{ gridColumn: selectedCountryId ? "span 1" : "span 3" }} key={effectiveSelectedId}>
            {/* Header */}
            <div className="bg-card rounded-xl shadow-card border border-border/50 p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: selected.color }} />
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: selected.color }}
                  >
                    {selected.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{selected.name}</h2>
                    <p className="text-xs text-muted-foreground">{selected.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={handleDuplicate} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Duplicate type">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={openEditModal} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Edit name & color">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {selected.programme_count > 0 && (
                <p className="text-[10px] text-warning mt-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />
                  Changes will affect {selected.programme_count} active programme{selected.programme_count !== 1 ? "s" : ""}.
                </p>
              )}
            </div>

            {/* Tab Navigation with completion status */}
            <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
              <TabStepper
                tabs={configTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                config={resolvedConfig}
                compact={!!selectedCountryId}
              />

              <div className="p-5">
                {/* Behaviour Matrix */}
                {activeTab === "behaviour" && (
                  <div className="divide-y divide-border/50 -mx-5 -mt-5">
                    {behaviourFlags.map(flag => {
                      const currentValue = resolvedConfig[flag.key as keyof typeof resolvedConfig] as OptionValue;
                      return (
                        <div key={flag.key} className="px-5 py-4">
                          <div className={cn("flex items-start gap-6", selectedCountryId ? "flex-col" : "justify-between")}>
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2 rounded-lg bg-secondary shrink-0 mt-0.5">{flag.icon}</div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{flag.label}</p>
                                {!selectedCountryId && <p className="text-[11px] text-muted-foreground mt-0.5">{flag.description}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {flag.options.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => updateBehaviourFlag(flag.key, opt.value)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-200",
                                    currentValue === opt.value
                                      ? optionStyle[opt.value]
                                      : "bg-transparent text-muted-foreground/60 border-transparent hover:bg-secondary hover:text-muted-foreground"
                                  )}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Category Editors */}
                {activeTab === "structural" && (
                  <StructuralEditor data={resolvedConfig.structural} onChange={d => updateCategory("structural", d)} />
                )}
                {activeTab === "financial" && (
                  <FinancialEditor data={resolvedConfig.financial} onChange={d => updateCategory("financial", d)} />
                )}
                {activeTab === "compliance" && (
                  <ComplianceEditor data={resolvedConfig.compliance} onChange={d => updateCategory("compliance", d)} />
                )}
                {activeTab === "workflow" && (
                  <WorkflowEditor data={resolvedConfig.workflow} onChange={d => updateCategory("workflow", d)} />
                )}
                {activeTab === "hr" && (
                  <HREditor data={resolvedConfig.hr} onChange={d => updateCategory("hr", d)} />
                )}
                {activeTab === "evaluation" && (
                  <EvaluationEditor data={resolvedConfig.evaluation} onChange={d => updateCategory("evaluation", d)} />
                )}
                {activeTab === "assessments" && (
                  <AssessmentMatrixEditor data={resolvedConfig.assessmentConfig} onChange={d => updateCategory("assessmentConfig", d)} />
                )}
              </div>
            </div>

            {/* Conditional Hints — each hint navigates to the relevant tab */}
            <ConditionalHints config={resolvedConfig} onNavigate={setActiveTab} />

            {/* Impact Analysis */}
            <ImpactAnalysisPanel type={selected} hasChanges={hasChanges} />

            {/* Health Score + Rule Impact (side by side when no country overlay) */}
            {!selectedCountryId && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ConfigHealthScore config={resolvedConfig} />

                {/* Rule Impact Summary */}
                {activeTab === "behaviour" && (
                  <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Rule Impact Summary</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {behaviourFlags.map(flag => {
                        const value = resolvedConfig[flag.key as keyof typeof resolvedConfig] as OptionValue;
                        return (
                          <div key={flag.key} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-secondary/50">
                            <span className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              (value === "required" || value === "enabled") ? "bg-success" :
                              value === "optional" ? "bg-info" : "bg-muted-foreground/30"
                            )} />
                            <span className="text-[10px] text-muted-foreground truncate">{flag.label}</span>
                            <span className={cn(
                              "text-[9px] font-medium ml-auto capitalize shrink-0",
                              (value === "required" || value === "enabled") ? "text-success" :
                              value === "optional" ? "text-info" : "text-muted-foreground"
                            )}>
                              {String(value).replace("_", " ")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Country Overlay Panel */}
        {selectedCountryId && selected && (
          <div className="lg:col-span-2 space-y-4" key={selectedCountryId}>
            {overlayLoading ? (
              <div className="space-y-3">
                <div className="h-32 bg-card rounded-xl border border-border/50 animate-pulse" />
                <div className="h-24 bg-card rounded-xl border border-border/50 animate-pulse" />
                <div className="h-20 bg-card rounded-xl border border-border/50 animate-pulse" />
              </div>
            ) : countryOverlay ? (
              <CountryOverlayPanel
                data={countryOverlay as any}
                countryName={countries.find(c => c.id === selectedCountryId)?.name || ""}
              />
            ) : (
              <div className="bg-card rounded-xl shadow-card border border-border/50 p-8 text-center">
                <Globe className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No country mapping found for <span className="font-medium text-foreground">{selected.name}</span> in this country.</p>
                <p className="text-[11px] text-muted-foreground mt-1">Country-specific rules can be configured in the Country Framework settings.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-2xl shadow-lg border border-border w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                {modalMode === "create" ? "Create Programme Type" : "Edit Programme Type"}
              </h3>
              <button onClick={() => { setShowModal(false); setPresetConfig(null); }} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {presetConfig && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/5 border border-accent/20 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-foreground font-medium">Using starter template — all tabs will be pre-configured.</span>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Name</label>
                <input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Learnership"
                  className="w-full px-3 py-2.5 text-sm bg-secondary rounded-lg border-0 outline-none focus:ring-2 focus:ring-accent text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Brief description of this programme type..."
                  className="w-full px-3 py-2.5 text-sm bg-secondary rounded-lg border-0 outline-none focus:ring-2 focus:ring-accent text-foreground placeholder:text-muted-foreground resize-none h-20"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Color</label>
                <div className="flex items-center gap-2">
                  {presetColors.map(c => (
                    <button
                      key={c}
                      onClick={() => setFormColor(c)}
                      className={cn("w-7 h-7 rounded-full transition-all", formColor === c ? "ring-2 ring-accent ring-offset-2 ring-offset-card scale-110" : "hover:scale-110")}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
              <button onClick={() => { setShowModal(false); setPresetConfig(null); }} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSaveModal}
                disabled={!formName.trim() || createMutation.isPending || updateMutation.isPending}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                  formName.trim()
                    ? "bg-gradient-accent text-accent-foreground shadow-glow hover:opacity-90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  modalMode === "create" ? "Create Type" : "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <SafeDeleteProgrammeTypeDialog
        programmeType={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            if (deleteTarget && effectiveSelectedId === deleteTarget.id) setSelectedId(null);
            setDeleteTarget(null);
          }
        }}
      />

      {/* Unsaved-changes guard dialog */}
      {pendingSelectId && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-card rounded-2xl shadow-lg border border-border w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4 text-warning" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Unsaved Changes</h3>
            </div>
            <p className="text-[13px] text-muted-foreground mb-5">
              You have unsaved changes on this type. Switching will discard them. Save first or discard?
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setPendingSelectId(null)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Keep editing
              </button>
              <button
                onClick={confirmDiscardAndSwitch}
                className="px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                Discard & switch
              </button>
              <button
                onClick={async () => { await saveChanges(); if (kpwValid) { setSelectedId(pendingSelectId); setSelectedCountryId(null); setPendingSelectId(null); } }}
                className="px-3 py-2 rounded-lg text-sm font-semibold bg-gradient-accent text-accent-foreground hover:opacity-90 transition-opacity"
              >
                Save & switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
