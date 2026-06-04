import { useState } from "react";
import { Building2, UserPlus, Mail, Search, CheckCircle2, XCircle, Clock, Eye, Send, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useAuth } from "@/hooks/useAuth";
import { useAllSponsorProfiles, useUpdateSponsorStatus, useSponsorInvitations, useCreateSponsorInvitation } from "@/hooks/useSponsorOnboarding";
import { useProgrammes } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const statusStyles: Record<string, string> = {
  pending_approval: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  pending: "bg-warning/10 text-warning",
  accepted: "bg-success/10 text-success",
  expired: "bg-muted text-muted-foreground",
  revoked: "bg-destructive/10 text-destructive",
};

export default function SponsorOnboarding() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [detailProfile, setDetailProfile] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: profiles = [], isLoading } = useAllSponsorProfiles();
  const { data: invitations = [], isLoading: invLoading } = useSponsorInvitations();
  const { data: programmes = [] } = useProgrammes();
  const updateStatus = useUpdateSponsorStatus();
  const createInvite = useCreateSponsorInvitation();

  // Invite form state
  const [invEmail, setInvEmail] = useState("");
  const [invCompany, setInvCompany] = useState("");
  const [invNotes, setInvNotes] = useState("");

  const filteredProfiles = profiles.filter((p: any) => {
    const matchSearch = !search || p.company_name?.toLowerCase().includes(search.toLowerCase()) || p.contact_email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: "Total Applications", value: profiles.length, icon: Building2 },
    { label: "Pending Approval", value: profiles.filter((p: any) => p.status === "pending_approval").length, icon: Clock },
    { label: "Approved", value: profiles.filter((p: any) => p.status === "approved").length, icon: CheckCircle2 },
    { label: "Invitations Sent", value: invitations.length, icon: Mail },
  ];

  const handleApprove = (profile: any) => {
    updateStatus.mutate({ id: profile.id, status: "approved" });
    setDetailProfile(null);
  };

  const handleReject = (profile: any) => {
    updateStatus.mutate({ id: profile.id, status: "rejected", rejectionReason: rejectReason });
    setDetailProfile(null);
    setRejectReason("");
  };

  const handleSendInvite = () => {
    if (!invEmail || !invCompany) return;
    createInvite.mutate({ email: invEmail, company_name: invCompany, notes: invNotes });
    setInviteOpen(false);
    setInvEmail("");
    setInvCompany("");
    setInvNotes("");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sponsor Onboarding</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage sponsor registrations, approvals, and invitations.</p>
          </div>
          <Button onClick={() => setInviteOpen(true)} size="sm" className="gap-2">
            <Send className="w-3.5 h-3.5" /> Invite Sponsor
          </Button>
        </div>
      </FadeIn>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <StaggerItem key={s.label}>
            <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary"><s.icon className="w-4 h-4 text-muted-foreground" /></div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <Tabs defaultValue="applications" className="w-full">
        <TabsList>
          <TabsTrigger value="applications">Applications ({profiles.length})</TabsTrigger>
          <TabsTrigger value="invitations">Invitations ({invitations.length})</TabsTrigger>
        </TabsList>

        {/* Applications Tab */}
        <TabsContent value="applications">
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sponsors..." className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground">
                  <option value="All">All Status</option>
                  <option value="pending_approval">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sector</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">B-BBEE Level</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredProfiles.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      <Building2 className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                      No sponsor applications found.
                    </td></tr>
                  ) : filteredProfiles.map((p: any) => (
                    <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{p.company_name}</p>
                            <p className="text-[10px] text-muted-foreground">{p.registration_number || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-foreground text-xs">{p.contact_person || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{p.contact_email || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.sector || "—"}</td>
                      <td className="px-4 py-3 text-xs text-foreground">{p.bee_level || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn("text-[10px]", statusStyles[p.status])}>{p.status.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetailProfile(p)} className="p-1.5 rounded-md hover:bg-secondary transition-colors" title="View details">
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          {p.status === "pending_approval" && (
                            <>
                              <button onClick={() => handleApprove(p)} className="p-1.5 rounded-md hover:bg-success/10 transition-colors" title="Approve">
                                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                              </button>
                              <button onClick={() => setDetailProfile(p)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" title="Reject">
                                <XCircle className="w-3.5 h-3.5 text-destructive" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations">
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {invitations.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      <Mail className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                      No invitations sent yet.
                    </td></tr>
                  ) : invitations.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-3 text-foreground">{inv.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{inv.company_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn("text-[10px]", statusStyles[inv.status])}>{inv.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(inv.expires_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Sponsor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input value={invEmail} onChange={e => setInvEmail(e.target.value)} placeholder="sponsor@company.co.za" />
            </div>
            <div>
              <Label>Company Name</Label>
              <Input value={invCompany} onChange={e => setInvCompany(e.target.value)} placeholder="Company Pty Ltd" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={invNotes} onChange={e => setInvNotes(e.target.value)} placeholder="Any additional context..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleSendInvite} disabled={!invEmail || !invCompany} className="gap-2">
              <Send className="w-3.5 h-3.5" /> Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail / Approve / Reject Dialog */}
      <Dialog open={!!detailProfile} onOpenChange={() => { setDetailProfile(null); setRejectReason(""); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sponsor Profile — {detailProfile?.company_name}</DialogTitle>
          </DialogHeader>
          {detailProfile && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Registration #", detailProfile.registration_number],
                  ["B-BBEE Level", detailProfile.bee_level],
                  ["Sector", detailProfile.sector],
                  ["Industry", detailProfile.industry],
                  ["Contact Person", detailProfile.contact_person],
                  ["Contact Email", detailProfile.contact_email],
                  ["Contact Phone", detailProfile.contact_phone],
                  ["VAT Number", detailProfile.vat_number],
                  ["Billing Email", detailProfile.billing_email],
                ].map(([label, val]) => (
                  <div key={label as string}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="text-foreground font-medium">{(val as string) || "—"}</p>
                  </div>
                ))}
              </div>
              {detailProfile.billing_address && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Billing Address</p>
                  <p className="text-foreground">{detailProfile.billing_address}</p>
                </div>
              )}
              {detailProfile.status === "pending_approval" && (
                <div className="border-t border-border pt-4 space-y-3">
                  <div>
                    <Label>Rejection Reason (if rejecting)</Label>
                    <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..." rows={2} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="destructive" size="sm" onClick={() => handleReject(detailProfile)} disabled={!rejectReason}>
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                    <Button size="sm" onClick={() => handleApprove(detailProfile)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
