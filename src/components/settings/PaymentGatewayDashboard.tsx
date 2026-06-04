import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  CreditCard, Zap, Shield, CheckCircle2, XCircle,
  Settings2, Plus, TestTube, ArrowRightLeft,
  TrendingUp, Globe2, Smartphone, Building2, QrCode, Wifi,
  Copy, RefreshCw, ChevronDown, ChevronUp, Eye, EyeOff,
  Webhook, Play, FileJson, Loader2, Trash2, Edit2,
  Key, ExternalLink, Sparkles, Lock
} from "lucide-react";
import {
  usePaymentGateways, useCreatePaymentGateway, useUpdatePaymentGateway,
  useDeletePaymentGateway, useSetPrimaryGateway,
  usePaymentRoutingRules, useCreateRoutingRule, useDeleteRoutingRule,
  usePaymentWebhookLogs, usePaymentStats,
  PaymentGateway
} from "@/hooks/usePaymentGateways";
import { usePaymentsEnabled } from "@/hooks/usePaymentsEnabled";
import { GATEWAY_TEMPLATES, GatewayTemplate } from "@/lib/gatewayTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type SubView = "dashboard" | "configure" | "webhooks" | "testing";

const MethodIcon = ({ method }: { method: string }) => {
  const icons: Record<string, typeof CreditCard> = {
    Card: CreditCard, "Credit Card": CreditCard,
    "Bank Transfer": Building2, "Instant EFT": Building2,
    USSD: Smartphone, "Mobile Money": Wifi, Mpesa: Wifi,
    QR: QrCode, Mobicred: CreditCard, SCode: CreditCard, SnapScan: QrCode,
  };
  const Icon = icons[method] || CreditCard;
  return <Icon className="w-3.5 h-3.5" />;
};

const StatusDot = ({ status }: { status: string }) => (
  <span className={cn(
    "inline-block w-2 h-2 rounded-full",
    status === "active" && "bg-success",
    status === "inactive" && "bg-muted-foreground/40",
    status === "error" && "bg-destructive",
  )} />
);

const MaskedField = ({ label, value, onSave, placeholder }: { label: string; value: string; onSave: (v: string) => void; placeholder?: string }) => {
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            className="flex-1 font-mono text-xs h-9"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            type="text"
          />
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => { onSave(draft); setEditing(false); }}>Save</Button>
          <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => { setDraft(value); setEditing(false); }}>Cancel</Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 font-mono text-xs bg-secondary/60 border border-border/50 rounded-lg px-3 py-2 text-foreground">
            {value ? (visible ? value : "••••••••" + value.slice(-4)) : <span className="text-muted-foreground italic">Not configured</span>}
          </div>
          {value && (
            <button onClick={() => setVisible(!visible)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              {visible ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          )}
          <button onClick={() => { setDraft(value); setEditing(true); }} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
};

export default function PaymentGatewayDashboard() {
  const { data: gateways = [], isLoading: gwLoading } = usePaymentGateways();
  const { data: routingRules = [], isLoading: rulesLoading } = usePaymentRoutingRules();
  const { data: webhookLogs = [] } = usePaymentWebhookLogs();
  const { data: stats } = usePaymentStats();
  const createGateway = useCreatePaymentGateway();
  const updateGateway = useUpdatePaymentGateway();
  const deleteGateway = useDeletePaymentGateway();
  const setPrimary = useSetPrimaryGateway();
  const createRule = useCreateRoutingRule();
  const deleteRule = useDeleteRoutingRule();

  const [subView, setSubView] = useState<SubView>("dashboard");
  const [selectedGatewayId, setSelectedGatewayId] = useState<string | null>(null);
  const [expandedRouting, setExpandedRouting] = useState(false);
  const [showCreateGw, setShowCreateGw] = useState(false);
  const [editGw, setEditGw] = useState<PaymentGateway | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [ruleForm, setRuleForm] = useState({ currency: "", primary_gateway_id: "", fallback_gateway_id: "", reason: "" });
  const [showCustomGw, setShowCustomGw] = useState(false);
  const [gwForm, setGwForm] = useState({
    gateway_key: "", name: "", tagline: "", region: "",
    methods: "", currencies: "", test_mode: true, branding_color: "#6366f1"
  });
  const [savingCredentials, setSavingCredentials] = useState(false);
  const { isEnabled: paymentsEnabled, toggle: togglePayments, isToggling, isLoading: paymentsLoading } = usePaymentsEnabled();

  const selectedGateway = gateways.find((g) => g.id === selectedGatewayId) ?? gateways[0] ?? null;
  const selectedTemplate = selectedGateway ? GATEWAY_TEMPLATES.find(t => t.gateway_key === selectedGateway.gateway_key) : null;

  // Find templates not yet added
  const availableTemplates = GATEWAY_TEMPLATES.filter(t => !gateways.some(g => g.gateway_key === t.gateway_key));

  const subTabs: { id: SubView; label: string; icon: typeof CreditCard }[] = [
    { id: "dashboard", label: "Gateways", icon: CreditCard },
    { id: "configure", label: "Configure", icon: Settings2 },
    { id: "webhooks", label: "Webhooks", icon: Webhook },
    { id: "testing", label: "Testing", icon: TestTube },
  ];

  const handleAddFromTemplate = (template: GatewayTemplate) => {
    createGateway.mutate({
      gateway_key: template.gateway_key,
      name: template.name,
      tagline: template.tagline,
      region: template.region,
      methods: template.methods,
      currencies: template.currencies,
      test_mode: true,
      config: {},
      branding_color: template.logo_color,
    } as any, {
      onSuccess: () => {
        setShowCreateGw(false);
        toast.success(`${template.name} added! Configure your API keys in the Configure tab.`);
      },
    });
  };

  const handleCreateCustomGw = () => {
    if (!gwForm.gateway_key || !gwForm.name) { toast.error("Key and name required"); return; }
    createGateway.mutate({
      gateway_key: gwForm.gateway_key,
      name: gwForm.name,
      tagline: gwForm.tagline || null,
      region: gwForm.region || null,
      methods: gwForm.methods.split(",").map((m) => m.trim()).filter(Boolean),
      currencies: gwForm.currencies.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean),
      test_mode: gwForm.test_mode,
      config: {},
    } as any, {
      onSuccess: () => {
        setShowCustomGw(false);
        setGwForm({ gateway_key: "", name: "", tagline: "", region: "", methods: "", currencies: "", test_mode: true, branding_color: "#6366f1" });
      },
    });
  };

  const handleUpdateGw = () => {
    if (!editGw) return;
    updateGateway.mutate({
      id: editGw.id,
      name: editGw.name,
      tagline: editGw.tagline,
      region: editGw.region,
      status: editGw.status,
      test_mode: editGw.test_mode,
      methods: editGw.methods,
      currencies: editGw.currencies,
    } as any);
    setEditGw(null);
  };

  const handleSaveCredential = (gatewayId: string, key: string, value: string) => {
    const gw = gateways.find(g => g.id === gatewayId);
    if (!gw) return;
    const newConfig = { ...(gw.config || {}), [key]: value };
    setSavingCredentials(true);
    updateGateway.mutate({ id: gatewayId, config: newConfig } as any, {
      onSuccess: () => { setSavingCredentials(false); toast.success("Credential saved securely"); },
      onError: () => setSavingCredentials(false),
    });
  };

  const handleCreateRule = () => {
    if (!ruleForm.currency || !ruleForm.primary_gateway_id) { toast.error("Currency and primary gateway required"); return; }
    createRule.mutate({
      currency: ruleForm.currency.toUpperCase(),
      primary_gateway_id: ruleForm.primary_gateway_id,
      fallback_gateway_id: ruleForm.fallback_gateway_id || null,
      reason: ruleForm.reason || null,
    } as any, {
      onSuccess: () => {
        setShowCreateRule(false);
        setRuleForm({ currency: "", primary_gateway_id: "", fallback_gateway_id: "", reason: "" });
      },
    });
  };

  const webhookBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook`;

  if (gwLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Global Payments Toggle */}
      <div className={cn(
        "rounded-xl border p-4 flex items-center justify-between transition-all",
        paymentsEnabled
          ? "bg-accent/5 border-accent/30"
          : "bg-destructive/5 border-destructive/30"
      )}>
        <div className="flex items-center gap-3">
          {paymentsEnabled ? (
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
              <CreditCard className="w-4.5 h-4.5 text-accent" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Lock className="w-4.5 h-4.5 text-destructive" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">
              {paymentsEnabled ? "Payments Enabled" : "Payments Disabled"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {paymentsEnabled
                ? "Payment gateways are active. Paid enrolment modes are available."
                : "All payment processing is disabled. Programmes default to free access."}
            </p>
          </div>
        </div>
        <Switch
          checked={paymentsEnabled}
          onCheckedChange={togglePayments}
          disabled={isToggling || paymentsLoading}
        />
      </div>

      {!paymentsEnabled && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-700">Platform Running in Free Mode</p>
            <p className="text-[11px] text-amber-600/80 mt-0.5">
              All programmes are accessible without payment. Paid enrolment modes (Buy Now, Subscription) are hidden from programme configuration. Re-enable payments to restore paid access.
            </p>
          </div>
        </div>
      )}

      {/* Sub-navigation */}
      <div className="flex items-center gap-1 bg-secondary/40 rounded-xl p-1">
        {subTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubView(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all",
              subView === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Dashboard View ── */}
      {subView === "dashboard" && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{gateways.length}</p>
              <p className="text-[10px] text-muted-foreground">Gateways</p>
            </div>
            <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats?.totalTransactions ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Transactions</p>
            </div>
            <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
              <p className="text-2xl font-bold text-success">{stats?.successRate ?? 0}%</p>
              <p className="text-[10px] text-muted-foreground">Success Rate</p>
            </div>
          </div>

          {/* Gateway Cards */}
          {gateways.length === 0 ? (
            <div className="bg-card rounded-xl border border-border/50 p-12 text-center">
              <CreditCard className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Payment Gateways</h3>
              <p className="text-sm text-muted-foreground mb-4">Add your first payment gateway to start processing payments.</p>
              <Button onClick={() => setShowCreateGw(true)} className="gap-2"><Plus className="w-4 h-4" /> Add Gateway</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowCreateGw(true)} className="gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Add Gateway
                </Button>
              </div>
              {gateways.map((gw) => {
                const template = GATEWAY_TEMPLATES.find(t => t.gateway_key === gw.gateway_key);
                const hasCredentials = gw.config && Object.keys(gw.config).some(k => 
                  template?.credential_fields.some(f => f.key === k && gw.config[k])
                );
                const allCredentialsSet = template ? template.credential_fields.every(f => gw.config?.[f.key]) : false;

                return (
                  <div key={gw.id} className={cn(
                    "bg-card rounded-xl border overflow-hidden transition-all",
                    gw.is_primary ? "border-accent/30 shadow-card" : "border-border/50"
                  )}>
                    <div className="px-5 py-4 flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: template ? `${template.logo_color}15` : undefined }}
                        >
                          <CreditCard className="w-5 h-5" style={{ color: template?.logo_color || undefined }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold text-foreground">{gw.name}</h4>
                            <StatusDot status={gw.status} />
                            {gw.is_primary && <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/10 text-accent">Primary</span>}
                            {gw.test_mode && <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/10 text-warning">Test Mode</span>}
                            {!allCredentialsSet && template && (
                              <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex items-center gap-1">
                                <Key className="w-2.5 h-2.5" /> Keys Missing
                              </span>
                            )}
                            {allCredentialsSet && (
                              <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/10 text-success flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Configured
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{gw.tagline} {gw.region ? `· ${gw.region}` : ""}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {gw.methods?.map((m) => (
                              <span key={m} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-md">
                                <MethodIcon method={m} /> {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="px-5 py-2.5 bg-secondary/20 border-t border-border/30 flex items-center gap-2 flex-wrap">
                      <button onClick={() => { setSelectedGatewayId(gw.id); setSubView("configure"); }} className="text-[11px] font-medium text-accent hover:underline flex items-center gap-1">
                        <Key className="w-3 h-3" /> Configure Keys
                      </button>
                      <span className="text-border">·</span>
                      {!gw.is_primary && (
                        <>
                          <button onClick={() => setPrimary.mutate(gw.id)} className="text-[11px] font-medium text-muted-foreground hover:text-foreground">Set as Primary</button>
                          <span className="text-border">·</span>
                        </>
                      )}
                      <button
                        onClick={() => updateGateway.mutate({ id: gw.id, status: gw.status === "active" ? "inactive" : "active" } as any)}
                        className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        {gw.status === "active" ? "Disable" : "Enable"}
                      </button>
                      <span className="text-border">·</span>
                      <button onClick={() => setEditGw({ ...gw })} className="text-[11px] font-medium text-muted-foreground hover:text-foreground">Edit</button>
                      <span className="text-border">·</span>
                      <button onClick={() => setDeletingId(gw.id)} className="text-[11px] font-medium text-destructive hover:underline">Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Routing Rules */}
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <button onClick={() => setExpandedRouting(!expandedRouting)} className="w-full px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="w-4 h-4 text-accent" />
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-foreground">Intelligent Routing Rules</h4>
                  <p className="text-[10px] text-muted-foreground">{routingRules.length} rule(s) · Auto-failover enabled</p>
                </div>
              </div>
              {expandedRouting ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {expandedRouting && (
              <div className="border-t border-border/30">
                <div className="px-5 py-2 flex justify-end">
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setShowCreateRule(true)}>
                    <Plus className="w-3 h-3" /> Add Rule
                  </Button>
                </div>
                {routingRules.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No routing rules configured</p>
                ) : (
                  <>
                    <div className="grid grid-cols-5 px-5 py-2 bg-secondary/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <span>Currency</span><span>Primary</span><span>Fallback</span><span>Reason</span><span></span>
                    </div>
                    {routingRules.map((r: any) => (
                      <div key={r.id} className="grid grid-cols-5 px-5 py-3 text-xs border-t border-border/20 items-center">
                        <span className="font-mono font-semibold text-foreground">{r.currency}</span>
                        <span className="text-foreground">{r.primary_gateway?.name ?? "—"}</span>
                        <span className="text-muted-foreground">{r.fallback_gateway?.name ?? "—"}</span>
                        <span className="text-muted-foreground text-[11px]">{r.reason ?? "—"}</span>
                        <div className="text-right">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteRule.mutate(r.id)}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Configure View ── */}
      {subView === "configure" && (
        <div className="space-y-5">
          {gateways.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No gateways to configure. Add one first.</p>
          ) : (
            <>
              {/* Gateway selector tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                {gateways.map((gw) => {
                  const template = GATEWAY_TEMPLATES.find(t => t.gateway_key === gw.gateway_key);
                  return (
                    <button
                      key={gw.id}
                      onClick={() => setSelectedGatewayId(gw.id)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2",
                        selectedGateway?.id === gw.id ? "bg-accent/10 text-accent border border-accent/20" : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: template?.logo_color || "var(--muted-foreground)" }} />
                      {gw.name}
                    </button>
                  );
                })}
              </div>

              {selectedGateway && (
                <div className="space-y-4">
                  {/* API Credentials Section */}
                  <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Key className="w-4 h-4 text-accent" /> API Credentials
                      </h4>
                      {selectedTemplate && (
                        <a
                          href={selectedTemplate.docs_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-accent hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> View Docs
                        </a>
                      )}
                    </div>

                    {selectedTemplate ? (
                      <div className="space-y-3">
                        <div className="bg-accent/5 border border-accent/10 rounded-lg p-3">
                          <p className="text-[11px] text-foreground font-medium mb-1">
                            Where to find your {selectedGateway.name} API keys:
                          </p>
                          <ol className="text-[10px] text-muted-foreground space-y-0.5 list-decimal list-inside">
                            {selectedGateway.gateway_key === "flutterwave" && (
                              <>
                                <li>Log in to your <a href="https://dashboard.flutterwave.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Flutterwave Dashboard</a></li>
                                <li>Go to <strong>Settings → API</strong></li>
                                <li>Copy your Public Key, Secret Key, and Encryption Key</li>
                                <li>For test mode, use your test API keys from the same page</li>
                              </>
                            )}
                            {selectedGateway.gateway_key === "paystack" && (
                              <>
                                <li>Log in to your <a href="https://dashboard.paystack.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Paystack Dashboard</a></li>
                                <li>Go to <strong>Settings → API Keys & Webhooks</strong></li>
                                <li>Copy your Public Key and Secret Key</li>
                              </>
                            )}
                            {selectedGateway.gateway_key === "payfast" && (
                              <>
                                <li>Log in to your <a href="https://www.payfast.co.za" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Payfast Dashboard</a></li>
                                <li>Go to <strong>Settings → Integration</strong></li>
                                <li>Copy your Merchant ID, Merchant Key, and set a Passphrase</li>
                              </>
                            )}
                          </ol>
                        </div>

                        {selectedTemplate.credential_fields.map((field) => (
                          <MaskedField
                            key={field.key}
                            label={field.label}
                            value={selectedGateway.config?.[field.key] || ""}
                            placeholder={field.placeholder}
                            onSave={(v) => handleSaveCredential(selectedGateway.id, field.key, v)}
                          />
                        ))}

                        <div className="flex items-center gap-2 pt-1">
                          <Lock className="w-3 h-3 text-muted-foreground" />
                          <p className="text-[10px] text-muted-foreground">
                            Credentials are stored securely in the database config column and only accessed server-side by backend functions.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-secondary/40 rounded-lg p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          This is a custom gateway. Store credentials in the config JSON below.
                        </p>
                        <MaskedField
                          label="API Key"
                          value={selectedGateway.config?.api_key || ""}
                          placeholder="Your API key"
                          onSave={(v) => handleSaveCredential(selectedGateway.id, "api_key", v)}
                        />
                        <MaskedField
                          label="Secret Key"
                          value={selectedGateway.config?.secret_key || ""}
                          placeholder="Your secret key"
                          onSave={(v) => handleSaveCredential(selectedGateway.id, "secret_key", v)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Gateway Info */}
                  <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Shield className="w-4 h-4 text-accent" /> Gateway Configuration
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Gateway Key</label>
                        <div className="font-mono text-xs bg-secondary/60 border border-border/50 rounded-lg px-3 py-2 text-foreground">{selectedGateway.gateway_key}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                        <div className="flex items-center gap-2">
                          <StatusDot status={selectedGateway.status} />
                          <span className="text-xs text-foreground capitalize">{selectedGateway.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Webhook URL</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 font-mono text-[11px] bg-secondary/60 border border-border/50 rounded-lg px-3 py-2 text-muted-foreground truncate">
                          {`${webhookBaseUrl}?gateway=${selectedGateway.gateway_key}`}
                        </div>
                        <button onClick={() => { navigator.clipboard.writeText(`${webhookBaseUrl}?gateway=${selectedGateway.gateway_key}`); toast.success("Webhook URL copied"); }} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Paste this URL into your {selectedGateway.name} webhook settings
                      </p>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="bg-card rounded-xl border border-border/50 p-5 space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">Payment Methods</h4>
                    {selectedGateway.methods?.length > 0 ? (
                      selectedGateway.methods.map((m) => (
                        <div key={m} className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-foreground flex items-center gap-2"><MethodIcon method={m} /> {m}</span>
                          <Switch checked defaultChecked />
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No payment methods configured</p>
                    )}
                  </div>

                  {/* Currencies */}
                  <div className="bg-card rounded-xl border border-border/50 p-5 space-y-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Globe2 className="w-4 h-4 text-accent" /> Currencies</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedGateway.currencies?.length > 0 ? (
                        selectedGateway.currencies.map((c) => (
                          <Badge key={c} variant="outline" className="font-mono text-xs">{c}</Badge>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No currencies configured</p>
                      )}
                    </div>
                  </div>

                  {/* Test Mode Toggle */}
                  <div className="flex items-center justify-between bg-card rounded-xl border border-border/50 p-5">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Test Mode</h4>
                      <p className="text-[10px] text-muted-foreground">Toggle between live and sandbox environment</p>
                    </div>
                    <Switch
                      checked={selectedGateway.test_mode}
                      onCheckedChange={(checked) => updateGateway.mutate({ id: selectedGateway.id, test_mode: checked } as any)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Webhooks View ── */}
      {subView === "webhooks" && (
        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Webhook Endpoints</h4>
            <p className="text-[11px] text-muted-foreground">Copy the webhook URL for each gateway and paste it into your provider's dashboard.</p>
            {gateways.map((gw) => (
              <div key={gw.id} className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">{gw.name}</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-[11px] bg-secondary/60 border border-border/50 rounded-lg px-3 py-2 text-muted-foreground truncate">
                    {`${webhookBaseUrl}?gateway=${gw.gateway_key}`}
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(`${webhookBaseUrl}?gateway=${gw.gateway_key}`); toast.success("Copied"); }} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Webhook Logs</h4>
                <p className="text-[10px] text-muted-foreground">Recent webhook deliveries across all gateways</p>
              </div>
            </div>
            {webhookLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No webhook logs yet</p>
            ) : (
              <div className="divide-y divide-border/30">
                {webhookLogs.map((log: any) => (
                  <div key={log.id} className="px-5 py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-muted-foreground w-20">{new Date(log.created_at).toLocaleTimeString()}</span>
                      <span className="font-medium text-foreground w-24">{log.payment_gateways?.name ?? "—"}</span>
                      <code className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">{log.event_type}</code>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-muted-foreground">{log.reference ?? "—"}</span>
                      <span className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full",
                        log.status === "success" && "bg-success/10 text-success",
                        log.status === "retry" && "bg-warning/10 text-warning",
                        log.status === "failed" && "bg-destructive/10 text-destructive",
                        log.status === "received" && "bg-accent/10 text-accent",
                      )}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Testing View ── */}
      {subView === "testing" && (
        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" /> Gateway Connection Test
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {gateways.length === 0 ? (
                <p className="text-xs text-muted-foreground col-span-3 text-center py-4">No gateways configured</p>
              ) : (
                gateways.map((gw) => {
                  const template = GATEWAY_TEMPLATES.find(t => t.gateway_key === gw.gateway_key);
                  const allSet = template ? template.credential_fields.every(f => gw.config?.[f.key]) : !!gw.config?.api_key;

                  return (
                    <div key={gw.id} className={cn(
                      "rounded-xl border p-4 text-center space-y-2",
                      gw.status === "active" && allSet ? "border-success/30 bg-success/5" : "border-border/50"
                    )}>
                      <p className="text-xs font-semibold text-foreground">{gw.name}</p>
                      {gw.status === "active" && allSet ? (
                        <div className="flex items-center justify-center gap-1 text-success">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-[11px] font-medium">Ready</span>
                        </div>
                      ) : !allSet ? (
                        <div className="flex items-center justify-center gap-1 text-warning">
                          <Key className="w-4 h-4" />
                          <span className="text-[11px] font-medium">Keys Missing</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <XCircle className="w-4 h-4" />
                          <span className="text-[11px] font-medium">Inactive</span>
                        </div>
                      )}
                      <Badge variant="outline" className="text-[10px]">{gw.test_mode ? "Sandbox" : "Live"}</Badge>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border/50 p-5 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-accent" /> Test Card Numbers
            </h4>
            <p className="text-[10px] text-muted-foreground">Provider-specific test cards for sandbox environments.</p>
            <div className="divide-y divide-border/30">
              {gateways.map((gw) => {
                const template = GATEWAY_TEMPLATES.find(t => t.gateway_key === gw.gateway_key);
                if (!template) return null;
                return template.test_cards.map((c, i) => (
                  <div key={`${gw.id}-${i}`} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-foreground w-24">{gw.name}</span>
                      <code className="font-mono text-xs bg-secondary/60 px-2 py-1 rounded text-foreground">{c.number}</code>
                    </div>
                    <div className="flex items-center gap-3">
                      {c.cvv && <span className="text-[10px] text-muted-foreground">CVV: {c.cvv}</span>}
                      {c.expiry && <span className="text-[10px] text-muted-foreground">Exp: {c.expiry}</span>}
                      {c.pin && <span className="text-[10px] text-muted-foreground">PIN: {c.pin}</span>}
                      <span className="text-[10px] text-muted-foreground">{c.type}</span>
                    </div>
                  </div>
                ));
              })}
            </div>
          </div>
        </div>
      )}

      {/* ADD GATEWAY DIALOG — Templates */}
      <Dialog open={showCreateGw} onOpenChange={setShowCreateGw}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Payment Gateway</DialogTitle>
            <DialogDescription>Choose a pre-configured provider or create a custom one</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {availableTemplates.length > 0 && (
              <>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Supported Providers</p>
                <div className="grid grid-cols-1 gap-3">
                  {availableTemplates.map((t) => (
                    <button
                      key={t.gateway_key}
                      onClick={() => handleAddFromTemplate(t)}
                      disabled={createGateway.isPending}
                      className="flex items-start gap-4 p-4 rounded-xl border border-border/50 hover:border-accent/30 hover:bg-accent/5 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${t.logo_color}15` }}>
                        <CreditCard className="w-5 h-5" style={{ color: t.logo_color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground">{t.name}</h4>
                          <Sparkles className="w-3 h-3 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{t.tagline}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {t.currencies.slice(0, 5).map(c => (
                            <span key={c} className="text-[9px] font-mono bg-secondary/60 px-1.5 py-0.5 rounded text-muted-foreground">{c}</span>
                          ))}
                          {t.currencies.length > 5 && (
                            <span className="text-[9px] text-muted-foreground">+{t.currencies.length - 5} more</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {availableTemplates.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">All supported providers have been added.</p>
            )}

            <div className="border-t border-border/30 pt-3">
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => { setShowCreateGw(false); setShowCustomGw(true); }}>
                <Plus className="w-3.5 h-3.5" /> Add Custom Gateway
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CUSTOM GATEWAY DIALOG */}
      <Dialog open={showCustomGw} onOpenChange={setShowCustomGw}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Custom Payment Gateway</DialogTitle>
            <DialogDescription>Configure a custom payment processor</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Gateway Key *</Label>
                <Input value={gwForm.gateway_key} onChange={(e) => setGwForm({ ...gwForm, gateway_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} placeholder="my_gateway" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Display Name *</Label>
                <Input value={gwForm.name} onChange={(e) => setGwForm({ ...gwForm, name: e.target.value })} placeholder="My Gateway" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tagline</Label>
              <Input value={gwForm.tagline} onChange={(e) => setGwForm({ ...gwForm, tagline: e.target.value })} placeholder="Description" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Region</Label>
              <Input value={gwForm.region} onChange={(e) => setGwForm({ ...gwForm, region: e.target.value })} placeholder="Global" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Methods (comma-separated)</Label>
              <Input value={gwForm.methods} onChange={(e) => setGwForm({ ...gwForm, methods: e.target.value })} placeholder="Card, Bank Transfer" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Currencies (comma-separated)</Label>
              <Input value={gwForm.currencies} onChange={(e) => setGwForm({ ...gwForm, currencies: e.target.value })} placeholder="USD, EUR" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Start in Test Mode</Label>
              <Switch checked={gwForm.test_mode} onCheckedChange={(c) => setGwForm({ ...gwForm, test_mode: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCustomGw(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateCustomGw} disabled={createGateway.isPending}>
              {createGateway.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
              Add Gateway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT GATEWAY DIALOG */}
      <Dialog open={!!editGw} onOpenChange={(o) => !o && setEditGw(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Gateway</DialogTitle>
            <DialogDescription>Update gateway configuration</DialogDescription>
          </DialogHeader>
          {editGw && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Display Name</Label>
                <Input value={editGw.name} onChange={(e) => setEditGw({ ...editGw, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tagline</Label>
                <Input value={editGw.tagline || ""} onChange={(e) => setEditGw({ ...editGw, tagline: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Region</Label>
                <Input value={editGw.region || ""} onChange={(e) => setEditGw({ ...editGw, region: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={editGw.status} onValueChange={(v) => setEditGw({ ...editGw, status: v })}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end pb-1">
                  <div className="flex items-center gap-2">
                    <Switch checked={editGw.test_mode} onCheckedChange={(c) => setEditGw({ ...editGw, test_mode: c })} />
                    <Label className="text-xs">Test Mode</Label>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditGw(null)}>Cancel</Button>
            <Button size="sm" onClick={handleUpdateGw}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE ROUTING RULE DIALOG */}
      <Dialog open={showCreateRule} onOpenChange={setShowCreateRule}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Routing Rule</DialogTitle>
            <DialogDescription>Route payments by currency to the best gateway</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Currency Code *</Label>
              <Input value={ruleForm.currency} onChange={(e) => setRuleForm({ ...ruleForm, currency: e.target.value.toUpperCase() })} placeholder="ZAR" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Primary Gateway *</Label>
              <Select value={ruleForm.primary_gateway_id} onValueChange={(v) => setRuleForm({ ...ruleForm, primary_gateway_id: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select gateway" /></SelectTrigger>
                <SelectContent>
                  {gateways.map((gw) => <SelectItem key={gw.id} value={gw.id}>{gw.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fallback Gateway</Label>
              <Select value={ruleForm.fallback_gateway_id} onValueChange={(v) => setRuleForm({ ...ruleForm, fallback_gateway_id: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {gateways.filter((gw) => gw.id !== ruleForm.primary_gateway_id).map((gw) => <SelectItem key={gw.id} value={gw.id}>{gw.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reason</Label>
              <Input value={ruleForm.reason} onChange={(e) => setRuleForm({ ...ruleForm, reason: e.target.value })} placeholder="Best local processing rate" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreateRule(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateRule} disabled={createRule.isPending}>Add Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gateway?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the gateway, its routing rules, and webhook logs. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deletingId) deleteGateway.mutate(deletingId); setDeletingId(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
