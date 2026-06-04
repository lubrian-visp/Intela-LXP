import { useState } from "react";
import {
  Shield, AlertTriangle, CheckCircle2, Clock, Users,
  FileText, Eye, Lock, ArrowUpRight, ArrowDownRight,
  Search, Calendar, Download, Bell, UserCheck, Database,
  BarChart3, XCircle, Mail
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Stats ── */
const stats = [
  { label: "Compliance Score", value: "87%", change: "+4%", up: true, icon: Shield },
  { label: "Active Consents", value: "1,248", change: "+56", up: true, icon: UserCheck },
  { label: "Open DSARs", value: "5", change: "-2", up: true, icon: FileText },
  { label: "Days Since Breach", value: "342", change: "+30", up: true, icon: Lock },
];

/* ── Data Inventory ── */
const dataInventory = [
  { category: "Learner Personal Info", records: 2450, lawfulBasis: "Consent", retention: "5 years", sensitivity: "High", lastAudit: "Jan 2026" },
  { category: "Assessment Records", records: 12800, lawfulBasis: "Legitimate Interest", retention: "10 years", sensitivity: "Medium", lastAudit: "Dec 2025" },
  { category: "Financial / Billing", records: 890, lawfulBasis: "Contract", retention: "7 years", sensitivity: "High", lastAudit: "Jan 2026" },
  { category: "Facilitator Records", records: 145, lawfulBasis: "Contract", retention: "Active + 2 years", sensitivity: "Medium", lastAudit: "Nov 2025" },
  { category: "Analytics & Cookies", records: 8500, lawfulBasis: "Consent", retention: "12 months", sensitivity: "Low", lastAudit: "Feb 2026" },
  { category: "Sponsor/Partner Data", records: 340, lawfulBasis: "Legitimate Interest", retention: "Active + 3 years", sensitivity: "Medium", lastAudit: "Jan 2026" },
];

/* ── Breach Register ── */
const breachRegister = [
  { id: "BR-001", date: "Mar 2025", type: "Unauthorised Access", affected: 12, severity: "Medium", status: "Resolved", reportedToRegulator: true, description: "Facilitator accessed learner records outside scope" },
  { id: "BR-002", date: "Aug 2024", type: "Data Loss", affected: 0, severity: "Low", status: "Resolved", reportedToRegulator: false, description: "Backup failure. No data exposed, restored within 4 hours" },
];

/* ── DSARs ── */
type DSARStatus = "Open" | "In Progress" | "Completed" | "Overdue";
interface DSAR {
  id: string;
  requester: string;
  email: string;
  type: "Access" | "Correction" | "Deletion" | "Objection" | "Portability";
  submitted: string;
  deadline: string;
  status: DSARStatus;
  assignee: string;
}

const dsars: DSAR[] = [
  { id: "DSAR-042", requester: "Thabo Mokoena", email: "thabo@email.com", type: "Access", submitted: "12 Feb 2026", deadline: "14 Mar 2026", status: "In Progress", assignee: "Info Officer" },
  { id: "DSAR-041", requester: "Naledi Dlamini", email: "naledi@email.com", type: "Deletion", submitted: "8 Feb 2026", deadline: "10 Mar 2026", status: "Open", assignee: "Unassigned" },
  { id: "DSAR-040", requester: "Sipho Nkosi", email: "sipho@email.com", type: "Correction", submitted: "1 Feb 2026", deadline: "3 Mar 2026", status: "In Progress", assignee: "Data Steward" },
  { id: "DSAR-039", requester: "Amahle Zulu", email: "amahle@email.com", type: "Portability", submitted: "25 Jan 2026", deadline: "24 Feb 2026", status: "Overdue", assignee: "Info Officer" },
  { id: "DSAR-038", requester: "Kagiso Molefe", email: "kagiso@email.com", type: "Access", submitted: "15 Jan 2026", deadline: "14 Feb 2026", status: "Completed", assignee: "Data Steward" },
];

/* ── Consent Audit ── */
const consentAudit = [
  { purpose: "Marketing communications", consented: 892, declined: 356, withdrawals: 23, rate: 71 },
  { purpose: "Analytics & performance tracking", consented: 1105, declined: 143, withdrawals: 8, rate: 89 },
  { purpose: "Third-party data sharing (sponsors)", consented: 645, declined: 603, withdrawals: 45, rate: 52 },
  { purpose: "Automated profiling & recommendations", consented: 780, declined: 468, withdrawals: 15, rate: 63 },
];

/* ── Compliance Checklist ── */
const complianceChecklist = [
  { item: "Information Officer registered with Regulator", done: true },
  { item: "Privacy Policy published and accessible", done: true },
  { item: "Cookie consent banner implemented", done: true },
  { item: "Data Processing Agreement with processors", done: true },
  { item: "Learner consent flows implemented", done: true },
  { item: "Data retention policy enforced", done: false },
  { item: "Annual PAIA manual updated", done: false },
  { item: "Staff data protection training completed", done: true },
  { item: "Breach notification procedure documented", done: true },
  { item: "Cross-border transfer safeguards in place", done: false },
];

const dsarStatusStyles: Record<DSARStatus, string> = {
  Open: "bg-info/10 text-info",
  "In Progress": "bg-warning/10 text-warning",
  Completed: "bg-success/10 text-success",
  Overdue: "bg-destructive/10 text-destructive",
};

const sensitivityStyles: Record<string, string> = {
  High: "bg-destructive/10 text-destructive",
  Medium: "bg-warning/10 text-warning",
  Low: "bg-success/10 text-success",
};

export default function PopiaCompliance() {
  const [dsarFilter, setDsarFilter] = useState("All");
  const [searchDsar, setSearchDsar] = useState("");

  const filteredDsars = dsars.filter(d => {
    const matchesSearch = d.requester.toLowerCase().includes(searchDsar.toLowerCase()) || d.id.toLowerCase().includes(searchDsar.toLowerCase());
    const matchesFilter = dsarFilter === "All" || d.status === dsarFilter;
    return matchesSearch && matchesFilter;
  });

  const checklistDone = complianceChecklist.filter(c => c.done).length;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">PoPIA Compliance</h1>
          <p className="text-sm text-muted-foreground mt-1">Protection of Personal Information Act — compliance management & monitoring.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
            <Download className="w-3.5 h-3.5" />
            Export Audit Report
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-card rounded-xl shadow-card border border-border/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-secondary">
                <s.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className={cn("text-[11px] font-medium flex items-center gap-0.5", s.up ? "text-success" : "text-destructive")}>
                {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {s.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Checklist */}
        <div className="lg:col-span-1 bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Compliance Checklist</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{checklistDone}/{complianceChecklist.length} complete</p>
            </div>
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", checklistDone === complianceChecklist.length ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
              {Math.round((checklistDone / complianceChecklist.length) * 100)}%
            </span>
          </div>
          <div className="p-4 space-y-1 max-h-[360px] overflow-y-auto">
            {complianceChecklist.map((c, i) => (
              <div key={i} className={cn("flex items-start gap-2.5 px-2 py-2 rounded-lg transition-colors", c.done ? "opacity-80" : "bg-warning/5")}>
                {c.done ? (
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                )}
                <span className={cn("text-xs", c.done ? "text-muted-foreground line-through" : "text-foreground font-medium")}>{c.item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Consent Audit */}
        <div className="lg:col-span-2 bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Consent Audit Trail</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Consent rates by processing purpose</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Purpose</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Consented</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Declined</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Withdrawals</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Consent Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {consentAudit.map(c => (
                  <tr key={c.purpose} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-3 font-medium text-foreground">{c.purpose}</td>
                    <td className="px-4 py-3 text-center text-success font-medium">{c.consented}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{c.declined}</td>
                    <td className="px-4 py-3 text-center text-destructive">{c.withdrawals}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", c.rate >= 80 ? "bg-success" : c.rate >= 60 ? "bg-warning" : "bg-destructive")} style={{ width: `${c.rate}%` }} />
                        </div>
                        <span className="text-xs font-medium text-foreground">{c.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Information Officer */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Information Officer</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Section 55 — Appointed officer details</p>
        </div>
        <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Name", value: "Adv. Priya Naidoo" },
            { label: "Registration No.", value: "IO-2024-00891" },
            { label: "Email", value: "privacy@intelaskillchain.co.za" },
            { label: "Registered Since", value: "15 March 2024" },
          ].map(f => (
            <div key={f.label}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{f.label}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Data Inventory */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Data Inventory</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Personal information categories processed by the system</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Records</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Lawful Basis</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Retention</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sensitivity</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Last Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {dataInventory.map(d => (
                <tr key={d.category} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-6 py-3 font-medium text-foreground flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary shrink-0" /> {d.category}
                  </td>
                  <td className="px-4 py-3 text-center text-foreground">{d.records.toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.lawfulBasis}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.retention}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", sensitivityStyles[d.sensitivity])}>{d.sensitivity}</span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground">{d.lastAudit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DSARs */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Data Subject Access Requests</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{filteredDsars.length} requests</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={searchDsar} onChange={e => setSearchDsar(e.target.value)} placeholder="Search requests..." className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48" />
            </div>
            <select value={dsarFilter} onChange={e => setDsarFilter(e.target.value)} className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option>All</option>
              <option>Open</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Overdue</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Requester</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Submitted</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Deadline</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredDsars.map(d => (
                <tr key={d.id} className="hover:bg-secondary/20 transition-colors cursor-pointer">
                  <td className="px-6 py-3 font-mono text-xs font-semibold text-primary">{d.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{d.requester}</p>
                    <p className="text-[10px] text-muted-foreground">{d.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-foreground">{d.type}</span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground">{d.submitted}</td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground">{d.deadline}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", dsarStatusStyles[d.status])}>{d.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground">{d.assignee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breach Register */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Breach Register</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Section 22 — Security compromise notifications</p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success/10 text-success">{breachRegister.length} total — all resolved</span>
        </div>
        <div className="divide-y divide-border/50">
          {breachRegister.map(b => (
            <div key={b.id} className="px-6 py-4 hover:bg-secondary/20 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">{b.id}</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-foreground">{b.type}</span>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", b.severity === "Medium" ? "bg-warning/10 text-warning" : "bg-success/10 text-success")}>{b.severity}</span>
                </div>
                <div className="flex items-center gap-2">
                  {b.reportedToRegulator && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Bell className="w-3 h-3" /> Reported to Regulator</span>}
                  <span className="text-[10px] text-muted-foreground">{b.date}</span>
                </div>
              </div>
              <p className="text-sm text-foreground">{b.description}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{b.affected} data subjects affected · Status: {b.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
