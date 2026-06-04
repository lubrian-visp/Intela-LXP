import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Pencil, ExternalLink, Plus, Trash2, Lock, Calendar, Layers, FileCheck, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAssessmentPrerequisites,
  useAddAssessmentPrerequisite,
  useDeleteAssessmentPrerequisite,
} from "@/hooks/useAssessmentPrerequisites";
import {
  useDripSchedules,
  useCreateDripSchedule,
  useDeleteDripSchedule,
  type DripSchedule,
} from "@/hooks/useDripContent";
import { useProgrammeModules } from "@/hooks/useCoreData";
import { useState } from "react";

interface Props {
  assessmentId: string;
  programmeId: string;
  isDraft: boolean;
}

const db = supabase as any;

export function AssessmentNodePanel({ assessmentId, programmeId, isDraft }: Props) {
  const navigate = useNavigate();

  const { data: assessment } = useQuery({
    queryKey: ["assessment-detail", assessmentId],
    queryFn: async () => {
      const { data, error } = await db
        .from("assessments")
        .select("*, programme_modules(title)")
        .eq("id", assessmentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["assessment-settings", assessmentId],
    queryFn: async () => {
      const { data } = await db
        .from("assessment_settings")
        .select("*")
        .eq("assessment_id", assessmentId)
        .maybeSingle();
      return data;
    },
  });

  const { data: modules = [] } = useProgrammeModules(programmeId);
  const { data: prereqs = [] } = useAssessmentPrerequisites(assessmentId);
  const { data: drips = [] } = useDripSchedules(programmeId);
  const assessmentDrips = (drips as DripSchedule[]).filter((d) => (d as any).assessment_id === assessmentId);

  const addPrereq = useAddAssessmentPrerequisite();
  const deletePrereq = useDeleteAssessmentPrerequisite();
  const createDrip = useCreateDripSchedule();
  const deleteDrip = useDeleteDripSchedule();

  const [prereqModuleId, setPrereqModuleId] = useState<string>("");
  const [dripDays, setDripDays] = useState<number>(7);

  const status = assessment?.status ?? "draft";
  const statusBadge =
    status === "published" ? "bg-success/10 text-success border-success/30" :
    status === "active" ? "bg-primary/10 text-primary border-primary/30" :
    status === "archived" ? "bg-muted text-muted-foreground border-border" :
    "bg-warning/10 text-warning border-warning/30";

  return (
    <Tabs defaultValue="settings" className="h-full">
      <div className="px-6 pt-3 border-b border-border">
        <TabsList className="h-8">
          <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
          <TabsTrigger value="gating" className="text-xs">Gating</TabsTrigger>
          <TabsTrigger value="drip" className="text-xs">Drip</TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs">Compliance</TabsTrigger>
        </TabsList>
      </div>

      {/* Settings */}
      <TabsContent value="settings" className="p-6 space-y-4 mt-0">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">{assessment?.title ?? "Assessment"}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {assessment?.assessment_type ?? "—"} ·{" "}
                {(assessment as any)?.programme_modules?.title ?? "Unassigned module"}
              </p>
            </div>
            <Badge variant="outline" className={`text-[10px] ${statusBadge}`}>{status}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <Field label="Max Score" value={`${assessment?.max_score ?? 100} marks`} />
            <Field label="Pass Mark" value={`${assessment?.pass_mark ?? "—"}%`} />
            <Field label="Time limit" value={settings?.time_limit_minutes ? `${settings.time_limit_minutes} min` : "Untimed"} />
            <Field label="Attempts" value={settings?.attempts_allowed ?? "Unlimited"} />
            <Field label="Category" value={(assessment as any)?.assessment_category ?? "formative"} />
            <Field
              label="Moderation"
              value={(assessment as any)?.requires_moderation ? "Required (4-eyes)" : "Not required"}
              icon={(assessment as any)?.requires_moderation ? <Lock className="w-3 h-3" /> : undefined}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => navigate(`/assessments/${assessmentId}/builder-v2`)}
          >
            <Pencil className="w-3 h-3" />
            Edit in Builder V2
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => navigate(`/assessments?focus=${assessmentId}`)}
          >
            <ExternalLink className="w-3 h-3" />
            Open in Assessments Hub
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5 text-xs"
            onClick={() => window.open(`/quiz/${assessmentId}?preview=1`, "_blank")}
          >
            <Eye className="w-3 h-3" />
            Open in Learner Preview
          </Button>
        </div>
      </TabsContent>

      {/* Gating / Prerequisites */}
      <TabsContent value="gating" className="p-6 space-y-4 mt-0">
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Module Prerequisites</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Learners must complete these modules before this assessment becomes available.
          </p>

          {prereqs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No prerequisites set.</p>
          ) : (
            <div className="space-y-1.5">
              {prereqs.map((p) => {
                const mod = (modules as any[]).find((m) => m.id === p.prerequisite_module_id);
                return (
                  <div key={p.id} className="flex items-center justify-between rounded border border-border bg-muted/30 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">Module</Badge>
                      <span>{mod?.title ?? p.prerequisite_module_id}</span>
                    </div>
                    {isDraft && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive"
                        onClick={() => deletePrereq.mutate({ id: p.id, assessment_id: assessmentId })}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isDraft && (
            <div className="flex gap-2 items-end pt-2 border-t border-border">
              <div className="flex-1">
                <Label className="text-[10px] text-muted-foreground">Add Module Prerequisite</Label>
                <Select value={prereqModuleId} onValueChange={setPrereqModuleId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose a module…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(modules as any[])
                      .filter((m) => !prereqs.some((p) => p.prerequisite_module_id === m.id))
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">{m.title}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                disabled={!prereqModuleId}
                onClick={() => {
                  addPrereq.mutate(
                    { assessment_id: assessmentId, prerequisite_module_id: prereqModuleId },
                    { onSuccess: () => setPrereqModuleId("") }
                  );
                }}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Drip */}
      <TabsContent value="drip" className="p-6 space-y-4 mt-0">
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Drip Schedule</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Delay availability of this assessment relative to enrolment.
          </p>

          {assessmentDrips.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Available immediately on enrolment.</p>
          ) : (
            <div className="space-y-1.5">
              {assessmentDrips.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded border border-border bg-muted/30 px-3 py-2 text-xs">
                  <span>
                    Released <span className="font-semibold">{d.drip_value}</span> day(s) after enrolment
                  </span>
                  {isDraft && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => deleteDrip.mutate(d.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isDraft && assessmentDrips.length === 0 && (
            <div className="flex gap-2 items-end pt-2 border-t border-border">
              <div className="flex-1">
                <Label className="text-[10px] text-muted-foreground">Days after enrolment</Label>
                <Input
                  type="number"
                  min={0}
                  value={dripDays}
                  onChange={(e) => setDripDays(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
              <Button
                size="sm"
                onClick={() => {
                  createDrip.mutate({
                    programme_id: programmeId,
                    assessment_id: assessmentId,
                    drip_type: "days_after_enrolment",
                    drip_value: dripDays,
                  } as any);
                }}
              >
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Compliance */}
      <TabsContent value="compliance" className="p-6 space-y-4 mt-0">
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Publish Readiness</h3>
          <ComplianceRow ok={!!assessment?.assessment_type} label="Assessment type configured" />
          <ComplianceRow ok={(assessment?.pass_mark ?? null) !== null} label="Pass mark set" />
          <ComplianceRow ok={!!assessment?.module_id} label="Linked to a module" />
          <ComplianceRow ok={(assessment as any)?.requires_moderation === true} label="Moderation enabled (4-eyes)" />
          <ComplianceRow ok={prereqs.length > 0} label="Prerequisites configured" optional />
        </div>
      </TabsContent>
    </Tabs>
  );
}

function Field({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium flex items-center gap-1">
        {icon}
        {value ?? "—"}
      </span>
    </div>
  );
}

function ComplianceRow({ ok, label, optional }: { ok: boolean; label: string; optional?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-foreground">{label}</span>
      <Badge
        variant="outline"
        className={
          ok
            ? "bg-success/10 text-success border-success/30 text-[10px]"
            : optional
            ? "bg-muted text-muted-foreground border-border text-[10px]"
            : "bg-warning/10 text-warning border-warning/30 text-[10px]"
        }
      >
        {ok ? "OK" : optional ? "Optional" : "Required"}
      </Badge>
    </div>
  );
}
