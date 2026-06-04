import { useState } from "react";
import { CreditCard, Lock, Unlock, DollarSign, Users, Clock, CalendarDays, Repeat, Gift, Tag, Loader2, Shield, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useEnrolmentConfig, useUpsertEnrolmentConfig, type EnrolmentConfig } from "@/hooks/useEnrolmentConfig";
import { usePaymentGateways } from "@/hooks/usePaymentGateways";
import { usePaymentsEnabled } from "@/hooks/usePaymentsEnabled";
import { toast } from "sonner";

interface EnrolmentConfigPanelProps {
  programmeId: string;
}

const MODE_OPTIONS = [
  { value: "open", label: "Open Access", icon: Unlock, desc: "No login required, public access" },
  { value: "free", label: "Free", icon: Gift, desc: "Requires registration, free enrolment" },
  { value: "buy_now", label: "Buy Now", icon: DollarSign, desc: "One-time payment required" },
  { value: "recurring", label: "Subscription", icon: Repeat, desc: "Recurring payment for access" },
  { value: "closed", label: "Closed", icon: Lock, desc: "Manual enrolment only" },
  { value: "prerequisite", label: "Prerequisite", icon: Shield, desc: "Must complete other programmes" },
  { value: "approval", label: "Approval Required", icon: Users, desc: "Admin must approve enrolment" },
  { value: "invitation", label: "Invitation Only", icon: Ticket, desc: "Email-based access codes" },
];

export function EnrolmentConfigPanel({ programmeId }: EnrolmentConfigPanelProps) {
  const { data: config, isLoading } = useEnrolmentConfig(programmeId);
  const upsertMutation = useUpsertEnrolmentConfig();
  const { data: gateways = [] } = usePaymentGateways();
  const { isEnabled: paymentsEnabled } = usePaymentsEnabled();

  const PAID_MODES = ["buy_now", "recurring"];
  const filteredModes = paymentsEnabled
    ? MODE_OPTIONS
    : MODE_OPTIONS.filter((m) => !PAID_MODES.includes(m.value));

  const [form, setForm] = useState<Partial<EnrolmentConfig> | null>(null);
  const currentForm = form ?? config ?? {
    enrolment_mode: "free",
    price: 0,
    currency: "ZAR",
    recurring_interval: null,
    free_trial_days: 0,
    capacity_limit: null,
    waitlist_enabled: false,
    duration_type: "lifetime",
    duration_days: null,
    allow_re_enrolment: false,
    gateway_key: null,
    coupon_codes: [],
  };

  const updateField = (key: string, value: any) => {
    setForm({ ...currentForm, [key]: value });
  };

  const handleSave = () => {
    upsertMutation.mutate({
      programme_id: programmeId,
      ...currentForm,
    } as any, {
      onSuccess: () => setForm(null),
    });
  };

  const isPaid = currentForm.enrolment_mode === "buy_now" || currentForm.enrolment_mode === "recurring";

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-accent" /> Enrolment Configuration
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Control how learners access this programme</p>
      </div>

      {/* Mode Selector */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Enrolment Mode</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {filteredModes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = currentForm.enrolment_mode === mode.value;
            return (
              <button
                key={mode.value}
                onClick={() => updateField("enrolment_mode", mode.value)}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all",
                  isSelected
                    ? "border-accent bg-accent/5 shadow-sm"
                    : "border-border/50 hover:border-accent/30 hover:bg-accent/5"
                )}
              >
                <Icon className={cn("w-4 h-4 mb-1.5", isSelected ? "text-accent" : "text-muted-foreground")} />
                <p className="text-xs font-semibold text-foreground">{mode.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{mode.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment Settings (for paid modes) */}
      {isPaid && (
        <div className="bg-secondary/20 rounded-xl p-4 space-y-4 border border-border/30">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-accent" /> Payment Settings
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Price</Label>
              <Input type="number" value={currentForm.price ?? 0} onChange={(e) => updateField("price", parseFloat(e.target.value) || 0)} min={0} step={0.01} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Currency</Label>
              <Select value={currentForm.currency || "ZAR"} onValueChange={(v) => updateField("currency", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ZAR">ZAR (South African Rand)</SelectItem>
                  <SelectItem value="USD">USD (US Dollar)</SelectItem>
                  <SelectItem value="EUR">EUR (Euro)</SelectItem>
                  <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                  <SelectItem value="NGN">NGN (Nigerian Naira)</SelectItem>
                  <SelectItem value="KES">KES (Kenyan Shilling)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {currentForm.enrolment_mode === "recurring" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Billing Interval</Label>
                <Select value={currentForm.recurring_interval || "monthly"} onValueChange={(v) => updateField("recurring_interval", v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Free Trial (days)</Label>
                <Input type="number" value={currentForm.free_trial_days ?? 0} onChange={(e) => updateField("free_trial_days", parseInt(e.target.value) || 0)} min={0} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Payment Gateway</Label>
            <Select value={currentForm.gateway_key || ""} onValueChange={(v) => updateField("gateway_key", v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Use primary gateway" /></SelectTrigger>
              <SelectContent>
                {gateways.filter(g => g.status === "active").map((gw) => (
                  <SelectItem key={gw.gateway_key} value={gw.gateway_key}>
                    {gw.name} {gw.is_primary ? "(Primary)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Access Controls */}
      <div className="bg-secondary/20 rounded-xl p-4 space-y-4 border border-border/30">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-accent" /> Access Controls
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Capacity Limit</Label>
            <Input type="number" value={currentForm.capacity_limit ?? ""} onChange={(e) => updateField("capacity_limit", e.target.value ? parseInt(e.target.value) : null)} placeholder="Unlimited" min={1} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Access Duration</Label>
            <Select value={currentForm.duration_type || "lifetime"} onValueChange={(v) => updateField("duration_type", v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lifetime">Lifetime Access</SelectItem>
                <SelectItem value="fixed_days">Fixed Days</SelectItem>
                <SelectItem value="fixed_date">Until Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {currentForm.duration_type === "fixed_days" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Duration (days)</Label>
            <Input type="number" value={currentForm.duration_days ?? ""} onChange={(e) => updateField("duration_days", parseInt(e.target.value) || null)} min={1} />
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label className="text-xs">Enable Waitlist</Label>
          <Switch checked={currentForm.waitlist_enabled || false} onCheckedChange={(c) => updateField("waitlist_enabled", c)} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Allow Re-enrolment</Label>
          <Switch checked={currentForm.allow_re_enrolment || false} onCheckedChange={(c) => updateField("allow_re_enrolment", c)} />
        </div>
      </div>

      {/* Enrolment Window */}
      <div className="bg-secondary/20 rounded-xl p-4 space-y-4 border border-border/30">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-accent" /> Enrolment Window
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Start Date</Label>
            <Input type="date" value={currentForm.enrolment_start || ""} onChange={(e) => updateField("enrolment_start", e.target.value || null)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">End Date</Label>
            <Input type="date" value={currentForm.enrolment_end || ""} onChange={(e) => updateField("enrolment_end", e.target.value || null)} />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={upsertMutation.isPending} className="w-full gap-1.5">
        {upsertMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
        Save Enrolment Configuration
      </Button>
    </div>
  );
}
