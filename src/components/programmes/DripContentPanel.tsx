import { useState } from "react";
import { Calendar, Clock, Eye, Plus, Trash2, Loader2, Droplets, Gift, CalendarCheck, Zap, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useDripSchedules, useCreateDripSchedule, useDeleteDripSchedule,
  useCompletionConfig, useUpsertCompletionConfig,
  type DripSchedule, type CompletionConfig,
} from "@/hooks/useDripContent";

interface DripContentPanelProps {
  programmeId: string;
}

const DRIP_TYPE_LABELS: Record<string, string> = {
  days_after_enrolment: "Days After Enrolment",
  fixed_date: "Fixed Date",
  after_prerequisite: "After Prerequisite",
  weekly: "Weekly",
  daily: "Daily",
};

export function DripContentPanel({ programmeId }: DripContentPanelProps) {
  const { data: schedules = [], isLoading: dripLoading } = useDripSchedules(programmeId);
  const { data: completionConfig, isLoading: completionLoading } = useCompletionConfig(programmeId);
  const createDrip = useCreateDripSchedule();
  const deleteDrip = useDeleteDripSchedule();
  const upsertCompletion = useUpsertCompletionConfig();

  const [showAddDrip, setShowAddDrip] = useState(false);
  const [dripForm, setDripForm] = useState({
    drip_type: "days_after_enrolment",
    drip_value: 7,
    drip_date: "",
    is_sample: false,
  });

  const [completionForm, setCompletionForm] = useState<Partial<CompletionConfig> | null>(null);
  const currentCompletion = completionForm ?? completionConfig ?? {
    completion_message: "Congratulations! You have completed this programme.",
    show_certificate: true,
    show_social_share: true,
    show_next_recommendations: true,
    custom_html: null,
    redirect_url: null,
    recommended_programme_ids: [],
  };

  const handleAddDrip = () => {
    createDrip.mutate({
      programme_id: programmeId,
      drip_type: dripForm.drip_type,
      drip_value: dripForm.drip_value,
      drip_date: dripForm.drip_date || null,
      is_sample: dripForm.is_sample,
    }, {
      onSuccess: () => {
        setShowAddDrip(false);
        setDripForm({ drip_type: "days_after_enrolment", drip_value: 7, drip_date: "", is_sample: false });
      },
    });
  };

  const handleSaveCompletion = () => {
    upsertCompletion.mutate({
      programme_id: programmeId,
      ...currentCompletion,
    } as any, {
      onSuccess: () => setCompletionForm(null),
    });
  };

  const updateCompletionField = (key: string, value: any) => {
    setCompletionForm({ ...currentCompletion, [key]: value });
  };

  const isLoading = dripLoading || completionLoading;

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* ── DRIP CONTENT ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Droplets className="w-4 h-4 text-accent" /> Drip Content Schedules
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Schedule when content becomes available to learners</p>
          </div>
          <Button size="sm" onClick={() => setShowAddDrip(true)} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Schedule
          </Button>
        </div>

        {schedules.length === 0 ? (
          <div className="bg-card rounded-xl border border-border/50 p-8 text-center">
            <Calendar className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No drip schedules configured. All content is available immediately.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map((s) => (
              <div key={s.id} className="bg-card rounded-lg border border-border/50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {DRIP_TYPE_LABELS[s.drip_type] || s.drip_type}
                      {s.drip_type !== "fixed_date" && ` — ${s.drip_value} ${s.drip_type === "days_after_enrolment" ? "days" : "units"}`}
                      {s.drip_date && ` — ${new Date(s.drip_date).toLocaleDateString()}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {s.is_sample && <Badge variant="secondary" className="text-[9px]"><Eye className="w-2.5 h-2.5 mr-0.5" /> Sample Lesson</Badge>}
                      {s.module_id && <span className="text-[10px] text-muted-foreground">Module-level</span>}
                      {s.lesson_id && <span className="text-[10px] text-muted-foreground">Lesson-level</span>}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteDrip.mutate(s.id)} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add Drip Dialog */}
        {showAddDrip && (
          <div className="bg-card rounded-xl border border-accent/20 p-4 space-y-4">
            <h4 className="text-xs font-semibold text-foreground">New Drip Schedule</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Drip Type</Label>
                <Select value={dripForm.drip_type} onValueChange={(v) => setDripForm({ ...dripForm, drip_type: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days_after_enrolment">Days After Enrolment</SelectItem>
                    <SelectItem value="fixed_date">Fixed Date</SelectItem>
                    <SelectItem value="after_prerequisite">After Prerequisite</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {dripForm.drip_type === "fixed_date" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Release Date</Label>
                  <Input type="date" value={dripForm.drip_date} onChange={(e) => setDripForm({ ...dripForm, drip_date: e.target.value })} />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs">Value (days/units)</Label>
                  <Input type="number" value={dripForm.drip_value} onChange={(e) => setDripForm({ ...dripForm, drip_value: parseInt(e.target.value) || 0 })} min={0} />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Mark as Free Sample</Label>
              <Switch checked={dripForm.is_sample} onCheckedChange={(c) => setDripForm({ ...dripForm, is_sample: c })} />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowAddDrip(false)} className="text-xs">Cancel</Button>
              <Button size="sm" onClick={handleAddDrip} disabled={createDrip.isPending} className="text-xs">
                {createDrip.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Add Schedule
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── COMPLETION PAGE ── */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-accent" /> Completion Page
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Customise what learners see when they complete this programme</p>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Completion Message</Label>
            <Textarea
              value={currentCompletion.completion_message || ""}
              onChange={(e) => updateCompletionField("completion_message", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Certificate</Label>
              <Switch checked={currentCompletion.show_certificate ?? true} onCheckedChange={(c) => updateCompletionField("show_certificate", c)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Social Share</Label>
              <Switch checked={currentCompletion.show_social_share ?? true} onCheckedChange={(c) => updateCompletionField("show_social_share", c)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Recommendations</Label>
              <Switch checked={currentCompletion.show_next_recommendations ?? true} onCheckedChange={(c) => updateCompletionField("show_next_recommendations", c)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Custom HTML (optional)</Label>
            <Textarea
              value={currentCompletion.custom_html || ""}
              onChange={(e) => updateCompletionField("custom_html", e.target.value || null)}
              rows={3}
              placeholder="<div>Custom completion page content...</div>"
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Redirect URL (optional)</Label>
            <Input
              value={currentCompletion.redirect_url || ""}
              onChange={(e) => updateCompletionField("redirect_url", e.target.value || null)}
              placeholder="https://example.com/next-steps"
            />
          </div>

          <Button onClick={handleSaveCompletion} disabled={upsertCompletion.isPending} className="w-full gap-1.5 text-xs" size="sm">
            {upsertCompletion.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Save Completion Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
