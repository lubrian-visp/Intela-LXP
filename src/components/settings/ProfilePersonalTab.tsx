import { useState, useRef } from "react";
import { User, Briefcase, Building2, MapPin, Mail, Phone, Pencil, Check, X, Loader2, Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

const roleBadgeColor: Record<string, string> = {
  super_admin: "bg-destructive/10 text-destructive border-destructive/20",
  systems_admin: "bg-info/10 text-info border-info/20",
  programme_manager: "bg-accent/10 text-accent border-accent/20",
  operations: "bg-warning/10 text-warning border-warning/20",
  facilitator: "bg-success/10 text-success border-success/20",
  learner: "bg-primary/10 text-primary border-primary/20",
  assessor: "bg-info/10 text-info border-info/20",
  moderator: "bg-accent/10 text-accent border-accent/20",
  mentor: "bg-success/10 text-success border-success/20",
  sponsor: "bg-warning/10 text-warning border-warning/20",
  talent_manager: "bg-primary/10 text-primary border-primary/20",
};

export default function ProfilePersonalTab() {
  const { user, profile, roles, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    job_title: "",
    department: "",
    location: "",
    organisation: "",
  });

  const startEditing = () => {
    setForm({
      full_name: (profile as any)?.full_name ?? "",
      phone: (profile as any)?.phone ?? "",
      job_title: (profile as any)?.job_title ?? "",
      department: (profile as any)?.department ?? "",
      location: (profile as any)?.location ?? "",
      organisation: (profile as any)?.organisation ?? "",
    });
    setEditing(true);
  };

  const cancelEditing = () => setEditing(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 5MB.", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;

    // Remove old avatar if exists
    await supabase.storage.from("avatars").remove([filePath]);

    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const db = supabase as any;
    const { error: updateError } = await db.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
    setUploadingAvatar(false);
    if (updateError) {
      toast({ title: "Failed to save avatar", description: updateError.message, variant: "destructive" });
    } else {
      toast({ title: "Profile picture updated" });
      await refreshProfile();
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const db = supabase as any;
    const { error } = await db
      .from("profiles")
      .update({
        full_name: form.full_name || null,
        phone: form.phone || null,
        job_title: form.job_title || null,
        department: form.department || null,
        location: form.location || null,
        organisation: form.organisation || null,
      })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
      setEditing(false);
      await refreshProfile();
    }
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : (user?.email?.[0] ?? "?").toUpperCase();

  const primaryRole = roles[0]
    ? roles[0].replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
    : "User";

  const p = profile as any;

  return (
    <div className="space-y-6">
      {/* Personal Details Card */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Personal Details</h3>
          {!editing ? (
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={startEditing}>
              <Pencil className="w-3 h-3" /> Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={cancelEditing} disabled={saving}>
                <X className="w-3 h-3" /> Cancel
              </Button>
              <Button size="sm" className="gap-1 text-xs" onClick={saveProfile} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
              </Button>
            </div>
          )}
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Avatar className="w-20 h-20 border-2 border-accent/20">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-accent/10 text-accent text-lg font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingAvatar ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </div>
              <Badge variant="outline" className={roleBadgeColor[roles[0]] ?? "bg-muted text-muted-foreground"}>
                {primaryRole}
              </Badge>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              {editing ? (
                <>
                  <EditField label="Full Name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
                  <DetailField icon={User} label="Username" value={user?.email?.split("@")[0] ? `@${user.email.split("@")[0]}` : null} />
                  <EditField label="Job Title" value={form.job_title} onChange={(v) => setForm({ ...form, job_title: v })} />
                  <EditField label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
                  <EditField label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
                </>
              ) : (
                <>
                  <DetailField icon={User} label="Full Name" value={p?.full_name} />
                  <DetailField icon={User} label="Username" value={user?.email?.split("@")[0] ? `@${user.email.split("@")[0]}` : null} />
                  <DetailField icon={Briefcase} label="Job Title" value={p?.job_title} placeholder="Not specified" />
                  <DetailField icon={Building2} label="Department" value={p?.department} placeholder="Not specified" />
                  <DetailField icon={MapPin} label="Location" value={p?.location} placeholder="Not specified" />
                </>
              )}
            </div>
          </div>

          <Separator className="my-5" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
            <DetailField icon={Mail} label="Email" value={user?.email} />
            {editing ? (
              <EditField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            ) : (
              <DetailField icon={Phone} label="Phone" value={p?.phone} placeholder="Not provided" />
            )}
          </div>
        </div>
      </div>

      {/* Account Information Card */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Account Information</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
          <DetailField icon={User} label="Username" value={user?.email?.split("@")[0] ? `@${user.email.split("@")[0]}` : null} />
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">Access Level</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {roles.map((r) => (
                <Badge key={r} variant="outline" className={roleBadgeColor[r] ?? "bg-muted text-muted-foreground"}>
                  {r.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </Badge>
              ))}
            </div>
          </div>
          <DetailField
            icon={User}
            label="Registered"
            value={user?.created_at ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null}
          />
        </div>
      </div>

      {/* Organisation & Cohorts Card */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Organisation & Cohorts</h3>
        </div>
        <div className="p-6">
          {editing ? (
            <EditField label="Organisation" value={form.organisation} onChange={(v) => setForm({ ...form, organisation: v })} />
          ) : (
            <DetailField icon={Building2} label="Organisation" value={p?.organisation} placeholder="Not assigned" />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailField({ icon: Icon, label, value, placeholder }: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  placeholder?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium ${value ? "text-foreground" : "text-muted-foreground/60 italic"}`}>
          {value ?? placeholder ?? "Not provided"}
        </p>
      </div>
    </div>
  );
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${label.toLowerCase()}`}
        className="h-8 text-sm"
      />
    </div>
  );
}
