import { useState } from "react";
import { Link2, Plus, Trash2, Building2, GraduationCap, Users, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { useAllSponsorProfiles, useAllSponsorLinks, useCreateSponsorLink, useDeleteSponsorLink } from "@/hooks/useSponsorOnboarding";
import { useProgrammes, useCohorts, useEnrolments } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const linkTypeIcons: Record<string, any> = {
  programme: GraduationCap,
  cohort: Users,
  individual: UserCheck,
};

export default function SponsorLinkingPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [linkType, setLinkType] = useState("programme");
  const [sponsorId, setSponsorId] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [enrolmentId, setEnrolmentId] = useState("");
  const [fundingAmount, setFundingAmount] = useState("");
  const [contractRef, setContractRef] = useState("");

  const { data: sponsors = [], isLoading: loadingSponsors } = useAllSponsorProfiles();
  const { data: links = [], isLoading: loadingLinks } = useAllSponsorLinks();
  const { data: programmes = [] } = useProgrammes();
  const { data: cohorts = [] } = useCohorts();
  const { data: enrolments = [] } = useEnrolments();
  const createLink = useCreateSponsorLink();
  const deleteLink = useDeleteSponsorLink();

  const approvedSponsors = sponsors.filter((s: any) => s.status === "approved");

  const getSponsorName = (sid: string) => sponsors.find((s: any) => s.user_id === sid)?.company_name || sid.slice(0, 8);
  const getProgName = (pid: string) => (programmes as any[]).find(p => p.id === pid)?.title || pid?.slice(0, 8) || "—";
  const getCohortName = (cid: string) => (cohorts as any[]).find(c => c.id === cid)?.name || cid?.slice(0, 8) || "—";

  const handleCreate = () => {
    const payload: Record<string, any> = {
      sponsor_id: sponsorId,
      link_type: linkType,
      funding_amount: fundingAmount ? Number(fundingAmount) : null,
      contract_reference: contractRef || null,
    };
    if (linkType === "programme") payload.programme_id = programmeId;
    if (linkType === "cohort") payload.cohort_id = cohortId;
    if (linkType === "individual") payload.enrolment_id = enrolmentId;

    createLink.mutate(payload);
    setCreateOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSponsorId("");
    setProgrammeId("");
    setCohortId("");
    setEnrolmentId("");
    setFundingAmount("");
    setContractRef("");
    setLinkType("programme");
  };

  if (loadingSponsors || loadingLinks) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sponsor-Programme Linking</h1>
            <p className="text-sm text-muted-foreground mt-1">Link sponsors to programmes, cohorts, or individual learners.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2">
            <Plus className="w-3.5 h-3.5" /> Create Link
          </Button>
        </div>
      </FadeIn>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(["programme", "cohort", "individual"] as const).map(type => {
          const Icon = linkTypeIcons[type];
          const count = links.filter((l: any) => l.link_type === type).length;
          return (
            <div key={type} className="bg-card rounded-xl shadow-card border border-border/50 p-5 flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-secondary"><Icon className="w-5 h-5 text-muted-foreground" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{type} Links</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Links Table */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sponsor</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Target</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Funding</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contract Ref</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {links.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  <Link2 className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  No sponsor links created yet.
                </td></tr>
              ) : links.map((l: any) => {
                const Icon = linkTypeIcons[l.link_type] || Link2;
                const target = l.link_type === "programme" ? getProgName(l.programme_id)
                  : l.link_type === "cohort" ? getCohortName(l.cohort_id)
                  : l.enrolment_id?.slice(0, 8) || "—";
                return (
                  <tr key={l.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        <span className="font-medium text-foreground">{getSponsorName(l.sponsor_id)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] gap-1 capitalize">
                        <Icon className="w-3 h-3" /> {l.link_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-foreground">{target}</td>
                    <td className="px-4 py-3 text-foreground font-medium">
                      {l.funding_amount ? `${l.funding_currency || "ZAR"} ${Number(l.funding_amount).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{l.contract_reference || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn("text-[10px]", l.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{l.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteLink.mutate(l.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" title="Remove">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Link Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Sponsor Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sponsor *</Label>
              <Select value={sponsorId} onValueChange={setSponsorId}>
                <SelectTrigger><SelectValue placeholder="Select sponsor" /></SelectTrigger>
                <SelectContent>
                  {approvedSponsors.map((s: any) => (
                    <SelectItem key={s.user_id} value={s.user_id}>{s.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link Type *</Label>
              <Select value={linkType} onValueChange={setLinkType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="programme">Programme Level</SelectItem>
                  <SelectItem value="cohort">Cohort Level</SelectItem>
                  <SelectItem value="individual">Individual Learner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {linkType === "programme" && (
              <div>
                <Label>Programme *</Label>
                <Select value={programmeId} onValueChange={setProgrammeId}>
                  <SelectTrigger><SelectValue placeholder="Select programme" /></SelectTrigger>
                  <SelectContent>
                    {(programmes as any[]).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {linkType === "cohort" && (
              <div>
                <Label>Cohort *</Label>
                <Select value={cohortId} onValueChange={setCohortId}>
                  <SelectTrigger><SelectValue placeholder="Select cohort" /></SelectTrigger>
                  <SelectContent>
                    {(cohorts as any[]).map(c => (
                      <SelectItem key={c.id} value={c.id}>{(c as any).name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {linkType === "individual" && (
              <div>
                <Label>Enrolment ID *</Label>
                <Select value={enrolmentId} onValueChange={setEnrolmentId}>
                  <SelectTrigger><SelectValue placeholder="Select enrolment" /></SelectTrigger>
                  <SelectContent>
                    {(enrolments as any[]).slice(0, 50).map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.id.slice(0, 8)}… — {e.status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Funding Amount</Label>
              <Input value={fundingAmount} onChange={e => setFundingAmount(e.target.value)} type="number" placeholder="e.g. 500000" />
            </div>
            <div>
              <Label>Contract Reference</Label>
              <Input value={contractRef} onChange={e => setContractRef(e.target.value)} placeholder="e.g. SLA-2026-001" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!sponsorId || (linkType === "programme" && !programmeId) || (linkType === "cohort" && !cohortId) || (linkType === "individual" && !enrolmentId)}>
              Create Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
