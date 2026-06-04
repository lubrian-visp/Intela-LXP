import { useState, useMemo } from "react";
import { useProgrammes, useAssessments, useProgrammeModules, usePathways } from "@/hooks/useCoreData";
import { useAssessmentLinks } from "@/hooks/useAssessmentLinks";
import { useLessons } from "@/hooks/useLessons";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ExportButton from "@/components/ExportButton";
import {
  Target, AlertTriangle, CheckCircle2, Layers, BookOpen,
  FileText, ShieldCheck, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CoverageNode {
  id: string;
  label: string;
  type: "pathway" | "module" | "lesson";
  directLinks: number;
  inheritedLinks: number;
  totalLinks: number;
  categories: Set<string>;
}

export default function AssessmentCoverageReport() {
  const [programmeId, setProgrammeId] = useState<string>("");

  const { data: programmes = [], isLoading: progLoading } = useProgrammes();
  const activeProgrammeId = programmeId || programmes[0]?.id;

  const { data: assessments = [] } = useAssessments(activeProgrammeId);
  const { data: links = [] } = useAssessmentLinks(activeProgrammeId);
  const { data: modules = [] } = useProgrammeModules(activeProgrammeId);
  const { data: pathways = [] } = usePathways(activeProgrammeId);
  const { data: lessons = [] } = useLessons(activeProgrammeId);

  // Build assessment ID → category map
  const assessmentMap = useMemo(() => {
    const m: Record<string, { title: string; category: string }> = {};
    assessments.forEach((a: any) => { m[a.id] = { title: a.title, category: a.assessment_category || "formative" }; });
    return m;
  }, [assessments]);

  // Build coverage nodes
  const coverageData = useMemo(() => {
    const nodes: CoverageNode[] = [];

    // Pathways
    (pathways as any[]).forEach(p => {
      const direct = links.filter(l => l.pathway_id === p.id && !l.module_id && !l.lesson_id);
      const cats = new Set(direct.map(l => assessmentMap[l.assessment_id]?.category).filter(Boolean));
      nodes.push({ id: p.id, label: p.name, type: "pathway", directLinks: direct.length, inheritedLinks: 0, totalLinks: direct.length, categories: cats });
    });

    // Modules
    (modules as any[]).forEach(m => {
      const direct = links.filter(l => l.module_id === m.id);
      const inherited = links.filter(l => l.pathway_id === m.pathway_id && !l.module_id && !l.lesson_id);
      const allLinks = [...direct, ...inherited];
      const cats = new Set(allLinks.map(l => assessmentMap[l.assessment_id]?.category).filter(Boolean));
      nodes.push({ id: m.id, label: m.title, type: "module", directLinks: direct.length, inheritedLinks: inherited.length, totalLinks: allLinks.length, categories: cats });
    });

    // Lessons
    (lessons as any[]).forEach(l => {
      const mod = (modules as any[]).find(m => m.id === l.module_id);
      const direct = links.filter(lk => lk.lesson_id === l.id);
      const modInherited = links.filter(lk => lk.module_id === l.module_id && !lk.lesson_id);
      const trackInherited = mod?.pathway_id ? links.filter(lk => lk.pathway_id === mod.pathway_id && !lk.module_id && !lk.lesson_id) : [];
      const allLinks = [...direct, ...modInherited, ...trackInherited];
      const cats = new Set(allLinks.map(lk => assessmentMap[lk.assessment_id]?.category).filter(Boolean));
      nodes.push({ id: l.id, label: l.title, type: "lesson", directLinks: direct.length, inheritedLinks: modInherited.length + trackInherited.length, totalLinks: allLinks.length, categories: cats });
    });

    return nodes;
  }, [pathways, modules, lessons, links, assessmentMap]);

  // Stats
  const stats = useMemo(() => {
    const totalNodes = coverageData.length;
    const covered = coverageData.filter(n => n.totalLinks > 0).length;
    const gaps = coverageData.filter(n => n.totalLinks === 0);
    const overloaded = coverageData.filter(n => n.totalLinks > 5);
    const coveragePct = totalNodes > 0 ? Math.round((covered / totalNodes) * 100) : 0;

    // Category coverage
    const catCounts: Record<string, number> = {};
    links.forEach(l => {
      const cat = assessmentMap[l.assessment_id]?.category;
      if (cat) catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    return { totalNodes, covered, gaps, overloaded, coveragePct, catCounts, totalAssessments: assessments.length, totalLinks: links.length };
  }, [coverageData, links, assessmentMap, assessments]);

  if (progLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-72 rounded-xl" /></div>;
  }

  const exportRows = coverageData.map(n => ({
    Name: n.label,
    Type: n.type,
    "Direct Links": n.directLinks,
    "Inherited Links": n.inheritedLinks,
    "Total Links": n.totalLinks,
    Categories: Array.from(n.categories).join(", "),
    Status: n.totalLinks === 0 ? "Gap" : n.totalLinks > 5 ? "Overloaded" : "OK",
  }));

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Assessment Coverage Report</h1>
            <p className="text-sm text-muted-foreground">Gap analysis and coverage health across programme structure.</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={activeProgrammeId || ""} onValueChange={setProgrammeId}>
              <SelectTrigger className="w-52 h-9 text-xs"><SelectValue placeholder="Select Programme" /></SelectTrigger>
              <SelectContent>
                {programmes.map((p: any) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportButton data={exportRows} filename="assessment-coverage" />
          </div>
        </div>
      </FadeIn>

      {!activeProgrammeId ? (
        <div className="bg-card rounded-xl p-12 text-center border border-border/50">
          <Layers className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">Select a programme to view coverage analysis</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Coverage Score", value: `${stats.coveragePct}%`, icon: <ShieldCheck className="w-4 h-4 text-success" />, bg: "bg-success/5" },
              { label: "Total Nodes", value: stats.totalNodes, icon: <Layers className="w-4 h-4 text-info" />, bg: "bg-info/5" },
              { label: "Gaps Found", value: stats.gaps.length, icon: <AlertTriangle className="w-4 h-4 text-destructive" />, bg: "bg-destructive/5" },
              { label: "Overloaded", value: stats.overloaded.length, icon: <BarChart3 className="w-4 h-4 text-warning" />, bg: "bg-warning/5" },
            ].map(s => (
              <div key={s.label} className="bg-card rounded-xl p-4 shadow-card border border-border/50">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", s.bg)}>{s.icon}</div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Coverage progress */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Overall Coverage</CardTitle></CardHeader>
            <CardContent>
              <Progress value={stats.coveragePct} className="h-3 mb-2" />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{stats.covered} of {stats.totalNodes} nodes have assessment links</span>
                <span>{stats.totalAssessments} assessments, {stats.totalLinks} total links</span>
              </div>
            </CardContent>
          </Card>

          {/* Category distribution */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Category Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {["diagnostic", "formative", "summative", "transfer"].map(cat => (
                  <div key={cat} className="text-center p-3 rounded-lg bg-secondary/30">
                    <p className="text-lg font-bold text-foreground">{stats.catCounts[cat] || 0}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{cat} links</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Gap analysis */}
          {stats.gaps.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" /> Coverage Gaps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {stats.gaps.map(g => (
                  <div key={g.id} className="flex items-center gap-3 p-2 rounded-lg bg-destructive/5">
                    {g.type === "pathway" ? <Layers className="w-3.5 h-3.5 text-muted-foreground" /> :
                     g.type === "module" ? <BookOpen className="w-3.5 h-3.5 text-muted-foreground" /> :
                     <FileText className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className="text-xs text-foreground flex-1 truncate">{g.label}</span>
                    <Badge variant="outline" className="text-[8px]">{g.type}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Full node list */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">All Nodes</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {coverageData.map(n => (
                <div key={n.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/20 transition-colors">
                  {n.type === "pathway" ? <Layers className="w-3.5 h-3.5 text-primary" /> :
                   n.type === "module" ? <BookOpen className="w-3.5 h-3.5 text-info" /> :
                   <FileText className="w-3.5 h-3.5 text-muted-foreground" />}
                  <span className="text-xs text-foreground flex-1 truncate">{n.label}</span>
                  <span className="text-[10px] text-muted-foreground">{n.directLinks}d / {n.inheritedLinks}i</span>
                  {n.totalLinks === 0 ? (
                    <Badge variant="destructive" className="text-[8px]">Gap</Badge>
                  ) : n.totalLinks > 5 ? (
                    <Badge className="text-[8px] bg-warning/10 text-warning border-0">Overloaded</Badge>
                  ) : (
                    <Badge className="text-[8px] bg-success/10 text-success border-0"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />OK</Badge>
                  )}
                </div>
              ))}
              {coverageData.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No structure nodes found for this programme</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
