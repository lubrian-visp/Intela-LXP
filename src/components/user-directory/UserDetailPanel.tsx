import { User, Mail, Phone, Briefcase, Building2, MapPin, Calendar, Shield, Copy, CheckCircle2, Clock } from "lucide-react";
import AdminPasswordResetButton from "@/components/admin/AdminPasswordResetButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { DirectoryUser, ROLE_LABELS, ROLE_COLORS } from "@/hooks/useUserDirectory";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, { class: string; icon: any }> = {
  active: { class: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle2 },
  suspended: { class: "bg-destructive/15 text-destructive", icon: Clock },
  verified: { class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: CheckCircle2 },
  pending: { class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", icon: Clock },
};

interface UserDetailPanelProps {
  user: DirectoryUser | null;
  visibleRoles: string[];
}

export default function UserDetailPanel({ user, visibleRoles }: UserDetailPanelProps) {
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-3">
        <User className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Select a user to view their details</p>
      </div>
    );
  }

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const filteredRoles = user.roles.filter((r) => visibleRoles.includes(r));
  const statusInfo = STATUS_STYLES[user.status] ?? STATUS_STYLES.active;
  const StatusIcon = statusInfo.icon;
  const shortId = user.user_id.slice(0, 8);

  return (
    <div className="p-6 space-y-5 overflow-auto h-full">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16 shrink-0">
          {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name ?? ""} />}
          <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
            {getInitials(user.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground">{user.full_name || "Unnamed User"}</h2>
          <p className="text-sm text-muted-foreground truncate">{user.email || "No email"}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={`text-xs ${statusInfo.class}`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-muted-foreground"
              onClick={() => copyToClipboard(user.user_id, "User ID")}
            >
              <Copy className="w-3 h-3 mr-1" />
              ID: {shortId}
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Contact Information */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Contact Information
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase">Email</p>
              <p className="text-sm text-foreground truncate">{user.email || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Phone</p>
              <p className="text-sm text-foreground">{user.phone || "No phone"}</p>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Status & Verification */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Status
        </h3>
        <div className="flex items-center gap-2">
          {user.verified_at ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm text-foreground">
                Verified · {format(new Date(user.verified_at), "MMM dd, HH:mm")}
              </span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Not verified</span>
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* Join Date */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Join Date
        </h3>
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm text-foreground">
            {user.created_at ? format(new Date(user.created_at), "dd MMM yyyy") : "—"}
          </p>
        </div>
      </div>

      <Separator />

      {/* Roles */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> Assigned Roles
        </h3>
        <div className="flex flex-wrap gap-2">
          {filteredRoles.length === 0 && (
            <span className="text-sm text-muted-foreground">No visible roles</span>
          )}
          {filteredRoles.map((r) => (
            <Badge key={r} className={`text-xs ${ROLE_COLORS[r] ?? ""}`}>
              {ROLE_LABELS[r] ?? r}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Profile Details */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Profile Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: Briefcase, label: "Job Title", value: user.job_title },
            { icon: Building2, label: "Department", value: user.department },
            { icon: Building2, label: "Organisation", value: user.organisation },
            { icon: MapPin, label: "Location", value: user.location },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20">
              <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
                <p className="text-sm text-foreground">{value || "—"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Password Reset */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Account Actions
        </h3>
        <AdminPasswordResetButton
          email={user.email}
          userName={user.full_name}
        />
      </div>
    </div>
  );
}
