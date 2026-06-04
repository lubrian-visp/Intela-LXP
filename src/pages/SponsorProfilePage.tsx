import { useState, useEffect } from "react";
import { Building2, Save } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { useAuth } from "@/hooks/useAuth";
import { useSponsorProfile, useUpsertSponsorProfile } from "@/hooks/useSponsorOnboarding";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const sectors = ["Technology", "Finance", "Mining", "Manufacturing", "Agriculture", "Energy", "Healthcare", "Education", "Construction", "Retail", "Government", "NGO", "Other"];
const beeLevels = ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6", "Level 7", "Level 8", "Non-Compliant", "Exempt"];

export default function SponsorProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useSponsorProfile();
  const upsert = useUpsertSponsorProfile();

  const [form, setForm] = useState({
    company_name: "",
    registration_number: "",
    bee_level: "",
    sector: "",
    industry: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    billing_address: "",
    billing_email: "",
    vat_number: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        company_name: profile.company_name || "",
        registration_number: profile.registration_number || "",
        bee_level: profile.bee_level || "",
        sector: profile.sector || "",
        industry: profile.industry || "",
        contact_person: profile.contact_person || "",
        contact_email: profile.contact_email || "",
        contact_phone: profile.contact_phone || "",
        billing_address: profile.billing_address || "",
        billing_email: profile.billing_email || "",
        vat_number: profile.vat_number || "",
      });
    }
  }, [profile]);

  const handleSave = () => {
    upsert.mutate({ ...form, user_id: user!.id });
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  const statusBadge = profile?.status ? (
    <Badge variant="outline" className={cn("text-xs",
      profile.status === "approved" ? "bg-success/10 text-success" :
      profile.status === "rejected" ? "bg-destructive/10 text-destructive" :
      "bg-warning/10 text-warning"
    )}>
      {profile.status.replace(/_/g, " ")}
    </Badge>
  ) : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sponsor Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {profile ? "Manage your company details and compliance information." : "Complete your sponsor registration to access the platform."}
            </p>
          </div>
          {statusBadge}
        </div>
      </FadeIn>

      <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 space-y-6">
        {/* Company Details */}
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-primary" /> Company Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Company Name *</Label>
              <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Acme Holdings Pty Ltd" />
            </div>
            <div>
              <Label>Registration Number</Label>
              <Input value={form.registration_number} onChange={e => setForm(f => ({ ...f, registration_number: e.target.value }))} placeholder="2024/123456/07" />
            </div>
            <div>
              <Label>B-BBEE Level</Label>
              <Select value={form.bee_level} onValueChange={v => setForm(f => ({ ...f, bee_level: v }))}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  {beeLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sector</Label>
              <Select value={form.sector} onValueChange={v => setForm(f => ({ ...f, sector: v }))}>
                <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                <SelectContent>
                  {sectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Industry</Label>
              <Input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} placeholder="e.g. Information Technology" />
            </div>
            <div>
              <Label>VAT Number</Label>
              <Input value={form.vat_number} onChange={e => setForm(f => ({ ...f, vat_number: e.target.value }))} placeholder="4012345678" />
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4">Contact Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Contact Person</Label>
              <Input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} placeholder="Full name" />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} type="email" placeholder="contact@company.co.za" />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="+27 11 123 4567" />
            </div>
          </div>
        </div>

        {/* Billing */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4">Billing Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Billing Email</Label>
              <Input value={form.billing_email} onChange={e => setForm(f => ({ ...f, billing_email: e.target.value }))} type="email" placeholder="accounts@company.co.za" />
            </div>
            <div className="md:col-span-2">
              <Label>Billing Address</Label>
              <Textarea value={form.billing_address} onChange={e => setForm(f => ({ ...f, billing_address: e.target.value }))} placeholder="Physical or postal address" rows={2} />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={!form.company_name || upsert.isPending} className="gap-2">
            <Save className="w-3.5 h-3.5" /> {profile ? "Update Profile" : "Submit Registration"}
          </Button>
        </div>
      </div>
    </div>
  );
}
