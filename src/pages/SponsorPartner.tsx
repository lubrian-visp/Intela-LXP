import { useState } from "react";
import { Building2, DollarSign, Handshake, TrendingUp, Search, ArrowUpRight, ArrowDownRight, ExternalLink, Mail, Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";

const stats = [
  { label: "Active Partners", value: "34", change: "+5", up: true, icon: Handshake },
  { label: "Total Sponsorships", value: "R 4.2M", change: "+18%", up: true, icon: DollarSign },
  { label: "Learners Funded", value: "812", change: "+67", up: true, icon: Users },
  { label: "Avg. ROI Score", value: "8.7/10", change: "+0.3", up: true, icon: TrendingUp },
];

type PartnerTier = "Platinum" | "Gold" | "Silver" | "Bronze";

const tierStyles: Record<PartnerTier, string> = {
  "Platinum": "bg-chart-5/10 text-chart-5",
  "Gold": "bg-accent/10 text-accent",
  "Silver": "bg-muted-foreground/10 text-muted-foreground",
  "Bronze": "bg-warning/10 text-warning",
};

interface Partner {
  id: number;
  name: string;
  type: "Corporate" | "Government" | "NGO" | "Foundation";
  tier: PartnerTier;
  funding: string;
  learners: number;
  programmes: number;
  status: "Active" | "Pending" | "Expired";
  since: string;
  contact: string;
}

const partners: Partner[] = [
  { id: 1, name: "TechCorp Africa", type: "Corporate", tier: "Platinum", funding: "R 1.2M", learners: 245, programmes: 4, status: "Active", since: "2024", contact: "sarah@techcorp.co.za" },
  { id: 2, name: "Dept. of Education", type: "Government", tier: "Platinum", funding: "R 980K", learners: 189, programmes: 3, status: "Active", since: "2023", contact: "grants@doe.gov.za" },
  { id: 3, name: "Ubuntu Foundation", type: "Foundation", tier: "Gold", funding: "R 650K", learners: 134, programmes: 2, status: "Active", since: "2024", contact: "info@ubuntufound.org" },
  { id: 4, name: "SkillsAfrica NGO", type: "NGO", tier: "Gold", funding: "R 480K", learners: 98, programmes: 2, status: "Active", since: "2023", contact: "partnerships@skillsafrica.org" },
  { id: 5, name: "InnoVentures", type: "Corporate", tier: "Silver", funding: "R 320K", learners: 67, programmes: 1, status: "Active", since: "2025", contact: "csr@innoventures.com" },
  { id: 6, name: "National Skills Fund", type: "Government", tier: "Gold", funding: "R 750K", learners: 156, programmes: 3, status: "Pending", since: "2025", contact: "apply@nsf.gov.za" },
  { id: 7, name: "FutureTech Ltd", type: "Corporate", tier: "Bronze", funding: "R 120K", learners: 23, programmes: 1, status: "Expired", since: "2024", contact: "hr@futuretech.co" },
  { id: 8, name: "Pan-African Edu Trust", type: "Foundation", tier: "Silver", funding: "R 290K", learners: 78, programmes: 2, status: "Active", since: "2024", contact: "trust@panafriedu.org" },
];

const fundingByType = [
  { type: "Corporate", amount: 1640, percentage: 39 },
  { type: "Government", amount: 1730, percentage: 41 },
  { type: "Foundation", amount: 940, percentage: 22 },
  { type: "NGO", amount: 480, percentage: 11 },
];

const recentActivities = [
  { partner: "TechCorp Africa", action: "Renewed sponsorship for Data Science programme", time: "2 hours ago" },
  { partner: "Dept. of Education", action: "Approved 50 new learner bursaries", time: "1 day ago" },
  { partner: "Ubuntu Foundation", action: "Requested impact report for Q4 2025", time: "2 days ago" },
  { partner: "National Skills Fund", action: "Submitted partnership application", time: "3 days ago" },
  { partner: "InnoVentures", action: "Scheduled site visit for March 2026", time: "4 days ago" },
];

const statusStyles: Record<string, string> = {
  Active: "bg-success/10 text-success",
  Pending: "bg-accent/10 text-accent",
  Expired: "bg-destructive/10 text-destructive",
};

export default function SponsorPartner() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");

  const filtered = partners.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "All" || p.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sponsors & Partners</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage partnerships, track funding, and measure sponsor impact.</p>
        </div>
      </FadeIn>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <StaggerItem key={s.label}>
            <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
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
          </StaggerItem>
        ))}
      </StaggerContainer>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funding Breakdown */}
        <div className="lg:col-span-1 bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Funding by Type</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total: R 4.2M across all partners</p>
          </div>
          <div className="p-5 space-y-4">
            {fundingByType.map(f => (
              <div key={f.type} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{f.type}</span>
                  <span className="text-xs text-muted-foreground">R {f.amount}K</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", f.type === "Corporate" ? "bg-info" : f.type === "Government" ? "bg-primary" : f.type === "Foundation" ? "bg-chart-5" : "bg-accent")}
                    style={{ width: `${f.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Latest partner engagement updates</p>
          </div>
          <div className="divide-y divide-border/50">
            {recentActivities.map((a, i) => (
              <div key={i} className="px-6 py-3.5 flex items-start gap-3 hover:bg-secondary/20 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{a.partner}</span>
                    {" "}{a.action}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Partners Table */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Partner Directory</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{filtered.length} organizations</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search partners..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48"
              />
            </div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option>All</option>
              <option>Corporate</option>
              <option>Government</option>
              <option>Foundation</option>
              <option>NGO</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Organisation</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tier</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Funding</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Learners</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Programmes</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-secondary/20 transition-colors cursor-pointer">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">Since {p.since}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.type}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", tierStyles[p.tier])}>
                      {p.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{p.funding}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{p.learners}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{p.programmes}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", statusStyles[p.status])}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}