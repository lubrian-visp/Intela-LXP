import { useState } from "react";
import { Settings, Shield, Info, Download, Eye, Loader2, CheckCircle2, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFeatureFlags, useToggleFeatureFlag, usePlatformSettings, useUpdatePlatformSetting } from "@/hooks/usePlatformSettings";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AIWorkflowSettingsPanel from "@/components/ai-learning/AIWorkflowSettingsPanel";
import AdaptiveRulesPanel from "@/components/ai-learning/AdaptiveRulesPanel";

export default function SystemSection() {
  const { data: sysFlags, isLoading: flagsLoading } = useFeatureFlags();
  const aiContentFlag = sysFlags?.find((f) => f.flag_key === "ai_content_generation");
  const toggle = useToggleFeatureFlag();
  const { data: sysSettings, isLoading: settingsLoading } = usePlatformSettings("system");
  const { data: modSettings, isLoading: modLoading } = usePlatformSettings("moderation");
  const updateSetting = useUpdatePlatformSetting();

  const isLoading = flagsLoading || settingsLoading || modLoading;

  const autoApproveSetting = sysFlags?.find((f) => f.flag_key === "system_auto_approve_self_reg");
  const sponsorSetting = sysFlags?.find((f) => f.flag_key === "system_sponsor_dashboard");
  const cohortAssignSetting = sysFlags?.find((f) => f.flag_key === "system_cohort_assignment_auto");
  const versionSetting = sysSettings?.find((s) => s.setting_key === "platform_version");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Registration Settings */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Registration Settings</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Configure automatic approval settings for learner registrations</p>
        </div>
        <div className="p-6 space-y-4">
          {autoApproveSetting && (
            <div className="flex items-center justify-between">
              <div className="max-w-lg">
                <p className="text-sm font-semibold text-foreground">Auto-Approve Self Registrations</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Automatically approve learner registrations after email verification. When disabled, registrations require manual review by designated personnel.
                </p>
              </div>
              <Switch
                checked={autoApproveSetting.is_enabled}
                onCheckedChange={(checked) => toggle.mutate({ id: autoApproveSetting.id, is_enabled: checked })}
                disabled={toggle.isPending}
              />
            </div>
          )}

          <div className="border-t border-border/30" />

          {sponsorSetting && (
            <div className="flex items-center justify-between">
              <div className="max-w-lg">
                <p className="text-sm font-semibold text-foreground">Sponsor Dashboard Access</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Allow sponsor users to access their dashboard and register learners on behalf of organisations. Only Ops Control and Super Admin can modify this setting.
                </p>
              </div>
              <Switch
                checked={sponsorSetting.is_enabled}
                onCheckedChange={(checked) => toggle.mutate({ id: sponsorSetting.id, is_enabled: checked })}
                disabled={toggle.isPending}
              />
            </div>
          )}

          <div className="border-t border-border/30" />

          {cohortAssignSetting && (
            <div className="flex items-center justify-between">
              <div className="max-w-lg">
                <p className="text-sm font-semibold text-foreground">Cohort Assignment Mode</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Controls how learners are assigned to cohorts after enrolment. When enabled, learners are automatically assigned to the next available cohort with capacity. When disabled (default), staff must manually select a cohort.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {cohortAssignSetting.is_enabled ? "Automatic" : "Manual"}
                </span>
                <Switch
                  checked={cohortAssignSetting.is_enabled}
                  onCheckedChange={(checked) => toggle.mutate({ id: cohortAssignSetting.id, is_enabled: checked })}
                  disabled={toggle.isPending}
                />
              </div>
            </div>
          )}

          <div className="border-t border-border/30" />

          {aiContentFlag && (
            <div className="flex items-center justify-between">
              <div className="max-w-lg">
                <p className="text-sm font-semibold text-foreground">AI Content Generation</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Enable AI-powered content generation in the Programme Builder. When disabled, the AI Generate option will be hidden platform-wide. Individual programmes can also override this setting.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {aiContentFlag.is_enabled ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={aiContentFlag.is_enabled}
                  onCheckedChange={(checked) => toggle.mutate({ id: aiContentFlag.id, is_enabled: checked })}
                  disabled={toggle.isPending}
                />
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
            <p className="text-xs font-medium text-accent mb-1">How it works:</p>
            <ul className="space-y-0.5 text-[10px] text-muted-foreground">
              <li>• <strong>Enabled:</strong> Self-registrations are automatically approved after email verification and learners are assigned the 'learner' role</li>
              <li>• <strong>Disabled:</strong> Self-registrations require manual approval by ops_control or super_admin users</li>
              <li>• <strong>Note:</strong> Sponsor and admin registrations always require manual review regardless of this setting</li>
              <li>• <strong>Cohort Auto-Assign:</strong> When enabled, learners are placed in the next available cohort (by start date and capacity) — no manual selection needed</li>
              <li>• <strong>AI Content:</strong> When enabled, Programme Builders can use AI to generate lesson content. Per-programme overrides are available in the programme settings</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Moderation Sampling Settings */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" />
            Moderation Sampling
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Configure how assessment submissions are sampled for quality moderation.
          </p>
        </div>
        <div className="p-6 space-y-5">
          {(() => {
            const thresholdSetting = modSettings?.find((s) => s.setting_key === "moderation_learner_threshold");
            const percentSetting = modSettings?.find((s) => s.setting_key === "moderation_sample_percentage");
            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="mod-threshold" className="text-xs font-semibold">
                      Small Cohort Threshold
                    </Label>
                    <Input
                      id="mod-threshold"
                      type="number"
                      min={1}
                      max={100}
                      defaultValue={thresholdSetting?.setting_value ?? "10"}
                      className="max-w-[120px]"
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (thresholdSetting && val !== thresholdSetting.setting_value) {
                          updateSetting.mutate({ id: thresholdSetting.id, setting_value: val });
                        }
                      }}
                      disabled={updateSetting.isPending}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Programmes with this many learners or fewer require 100% moderation.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mod-percent" className="text-xs font-semibold">
                      Sampling Percentage
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="mod-percent"
                        type="number"
                        min={1}
                        max={100}
                        defaultValue={percentSetting?.setting_value ?? "25"}
                        className="max-w-[120px]"
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (percentSetting && val !== percentSetting.setting_value) {
                            updateSetting.mutate({ id: percentSetting.id, setting_value: val });
                          }
                        }}
                        disabled={updateSetting.isPending}
                      />
                      <span className="text-xs text-muted-foreground font-medium">%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Percentage of submissions randomly sampled when learners exceed the threshold.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                  <p className="text-xs font-medium text-accent mb-1">How it works:</p>
                  <ul className="space-y-0.5 text-[10px] text-muted-foreground">
                    <li>• <strong>≤ {thresholdSetting?.setting_value ?? "10"} learners:</strong> Every submission is automatically sent for moderation (100%)</li>
                    <li>• <strong>&gt; {thresholdSetting?.setting_value ?? "10"} learners:</strong> {percentSetting?.setting_value ?? "25"}% of submissions are randomly selected for quality review</li>
                    <li>• <strong>Risk-based priority:</strong> Submissions below the pass mark are flagged as high priority</li>
                    <li>• Changes take effect immediately for new submissions</li>
                  </ul>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* System Information */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">System Information</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Platform configuration and system details</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
            <div>
              <p className="text-xs font-semibold text-foreground">Platform Version</p>
              <p className="text-sm text-muted-foreground mt-0.5">{versionSetting?.setting_value ?? "1.0.0"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Database Status</p>
              <p className="text-sm text-success mt-0.5">Connected</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Last Backup</p>
              <p className="text-sm text-muted-foreground mt-0.5">2 hours ago</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">System Health</p>
              <p className="text-sm text-success mt-0.5">Operational</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <Download className="w-3 h-3" /> Download Backup
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <Eye className="w-3 h-3" /> System Logs
            </Button>
          </div>
        </div>
      </div>

      {/* AI Learning Workflow Settings */}
      <AIWorkflowSettingsPanel />

      {/* Adaptive Rules Management */}
      <AdaptiveRulesPanel />
    </div>
  );
}
