import { useState } from "react";
import {
  FileText, Plus, History, Save, ChevronDown, ChevronUp,
  Trash2, Copy, Globe, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useProgrammes } from "@/hooks/useCoreData";
import {
  useAllReportTemplates,
  useUpdateReportTemplate,
  useCreateReportTemplate,
  useTemplateVersions,
  ReportTemplate,
} from "@/hooks/useAssessorReportTemplates";
import { CriterionItem, defaultSection2Criteria, defaultSection3Criteria } from "@/hooks/useAssessorReports";

function CriteriaEditor({ criteria, onChange, sectionLabel }: {
  criteria: CriterionItem[];
  onChange: (c: CriterionItem[]) => void;
  sectionLabel: string;
}) {
  const addCriterion = () => {
    const next = criteria.length + 1;
    onChange([...criteria, {
      id: `${sectionLabel}-${next}`,
      criterion: `${sectionLabel}.${next} New Criterion`,
      description: "",
      yes: false, no: false, comments: "",
    }]);
  };

  const removeCriterion = (idx: number) => {
    onChange(criteria.filter((_, i) => i !== idx));
  };

  const updateField = (idx: number, field: string, value: string) => {
    const updated = [...criteria];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {criteria.map((c, i) => (
        <Card key={c.id} className="p-3 space-y-2 bg-muted/30">
          <div className="flex items-start justify-between gap-2">
            <Input
              value={c.criterion}
              onChange={e => updateField(i, "criterion", e.target.value)}
              className="text-xs font-semibold flex-1"
              placeholder="Criterion title"
            />
            <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7 text-destructive" onClick={() => removeCriterion(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Textarea
            value={c.description}
            onChange={e => updateField(i, "description", e.target.value)}
            className="text-xs"
            rows={2}
            placeholder="Description / guidance text"
          />
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addCriterion} className="text-xs">
        <Plus className="h-3.5 w-3.5 mr-1" /> Add Criterion
      </Button>
    </div>
  );
}

function VersionHistoryDialog({ templateId, open, onOpenChange }: {
  templateId: string; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const { data: versions, isLoading } = useTemplateVersions(open ? templateId : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[70vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" /> Version History</DialogTitle>
          <DialogDescription className="text-xs">Previous versions of this template's criteria.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : !versions?.length ? (
          <p className="text-xs text-muted-foreground">No previous versions yet. Changes will appear here after the first edit.</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">Version</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">S2 Criteria</TableHead>
              <TableHead className="text-xs">S3 Criteria</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {versions.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="text-xs font-medium">v{v.version_number}</TableCell>
                  <TableCell className="text-xs">{format(new Date(v.created_at), "dd MMM yyyy HH:mm")}</TableCell>
                  <TableCell className="text-xs">{(v.section2_criteria as any[])?.length ?? 0} items</TableCell>
                  <TableCell className="text-xs">{(v.section3_criteria as any[])?.length ?? 0} items</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AssessorReportTemplatesPage() {
  const { user } = useAuth();
  const { data: templates, isLoading } = useAllReportTemplates();
  const { data: programmes } = useProgrammes();
  const updateTemplate = useUpdateReportTemplate();
  const createTemplate = useCreateReportTemplate();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editS2, setEditS2] = useState<CriterionItem[]>([]);
  const [editS3, setEditS3] = useState<CriterionItem[]>([]);
  const [editName, setEditName] = useState("");
  const [expandedSection, setExpandedSection] = useState<"s2" | "s3" | null>("s2");
  const [versionDialogId, setVersionDialogId] = useState<string | null>(null);

  // New programme override
  const [showNewOverride, setShowNewOverride] = useState(false);
  const [newProgrammeId, setNewProgrammeId] = useState("");

  const startEdit = (t: ReportTemplate) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditS2(t.section2_criteria?.length ? t.section2_criteria : defaultSection2Criteria);
    setEditS3(t.section3_criteria?.length ? t.section3_criteria : defaultSection3Criteria);
    setExpandedSection("s2");
  };

  const cancelEdit = () => { setEditingId(null); };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await updateTemplate.mutateAsync({
        id: editingId,
        name: editName,
        section2_criteria: editS2,
        section3_criteria: editS3,
      });
      toast.success("Template saved — previous version archived automatically.");
      setEditingId(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const createOverride = async () => {
    if (!newProgrammeId) return;
    const globalTemplate = templates?.find(t => t.scope_level === "global");
    try {
      await createTemplate.mutateAsync({
        name: `Override – ${programmes?.find(p => p.id === newProgrammeId)?.title ?? "Programme"}`,
        scope_level: "programme",
        programme_id: newProgrammeId,
        section2_criteria: globalTemplate?.section2_criteria ?? defaultSection2Criteria,
        section3_criteria: globalTemplate?.section3_criteria ?? defaultSection3Criteria,
        is_active: true,
        created_by: user?.id,
      });
      toast.success("Programme template override created (cloned from global).");
      setShowNewOverride(false);
      setNewProgrammeId("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const globalTemplates = templates?.filter(t => t.scope_level === "global") ?? [];
  const programmeOverrides = templates?.filter(t => t.scope_level === "programme") ?? [];
  const usedProgrammeIds = new Set(programmeOverrides.map(t => t.programme_id));

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Assessor Report Templates
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage the criteria wording for Sections 2 & 3 of Assessor Feedback Reports. Changes are versioned automatically.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowNewOverride(true)} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Programme Override
          </Button>
        </div>
      </FadeIn>

      {/* New override dialog */}
      <Dialog open={showNewOverride} onOpenChange={setShowNewOverride}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Create Programme Override</DialogTitle>
            <DialogDescription className="text-xs">Clone the global template for a specific programme so you can customise its criteria.</DialogDescription>
          </DialogHeader>
          <Select value={newProgrammeId} onValueChange={setNewProgrammeId}>
            <SelectTrigger className="text-xs"><SelectValue placeholder="Select programme" /></SelectTrigger>
            <SelectContent>
              {programmes?.filter(p => !usedProgrammeIds.has(p.id)).map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={!newProgrammeId || createTemplate.isPending} onClick={createOverride}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Clone & Create
          </Button>
        </DialogContent>
      </Dialog>

      {/* Version history dialog */}
      {versionDialogId && (
        <VersionHistoryDialog templateId={versionDialogId} open={!!versionDialogId} onOpenChange={o => !o && setVersionDialogId(null)} />
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading templates…</p>
      ) : (
        <StaggerContainer className="space-y-4">
          {/* Global */}
          <StaggerItem>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Globe className="h-3.5 w-3.5" /> Global Default Template
            </h2>
            {globalTemplates.map(t => (
              <TemplateCard key={t.id} template={t} isEditing={editingId === t.id}
                onEdit={() => startEdit(t)} onCancel={cancelEdit} onSave={saveEdit}
                saving={updateTemplate.isPending}
                editName={editName} onEditNameChange={setEditName}
                editS2={editS2} onEditS2Change={setEditS2}
                editS3={editS3} onEditS3Change={setEditS3}
                expandedSection={expandedSection} onToggleSection={setExpandedSection}
                onShowHistory={() => setVersionDialogId(t.id)}
              />
            ))}
          </StaggerItem>

          {/* Programme overrides */}
          {programmeOverrides.length > 0 && (
            <StaggerItem>
              <Separator className="my-4" />
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <BookOpen className="h-3.5 w-3.5" /> Programme Overrides
              </h2>
              <div className="space-y-3">
                {programmeOverrides.map(t => (
                  <TemplateCard key={t.id} template={t} isEditing={editingId === t.id}
                    programmeTitle={programmes?.find(p => p.id === t.programme_id)?.title}
                    onEdit={() => startEdit(t)} onCancel={cancelEdit} onSave={saveEdit}
                    saving={updateTemplate.isPending}
                    editName={editName} onEditNameChange={setEditName}
                    editS2={editS2} onEditS2Change={setEditS2}
                    editS3={editS3} onEditS3Change={setEditS3}
                    expandedSection={expandedSection} onToggleSection={setExpandedSection}
                    onShowHistory={() => setVersionDialogId(t.id)}
                  />
                ))}
              </div>
            </StaggerItem>
          )}
        </StaggerContainer>
      )}
    </div>
  );
}

function TemplateCard({ template, isEditing, programmeTitle, onEdit, onCancel, onSave, saving,
  editName, onEditNameChange, editS2, onEditS2Change, editS3, onEditS3Change,
  expandedSection, onToggleSection, onShowHistory,
}: {
  template: ReportTemplate; isEditing: boolean; programmeTitle?: string;
  onEdit: () => void; onCancel: () => void; onSave: () => void; saving: boolean;
  editName: string; onEditNameChange: (n: string) => void;
  editS2: CriterionItem[]; onEditS2Change: (c: CriterionItem[]) => void;
  editS3: CriterionItem[]; onEditS3Change: (c: CriterionItem[]) => void;
  expandedSection: "s2" | "s3" | null; onToggleSection: (s: "s2" | "s3" | null) => void;
  onShowHistory: () => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Badge variant={template.scope_level === "global" ? "default" : "secondary"} className="text-[10px]">
            {template.scope_level === "global" ? "Global" : programmeTitle ?? "Programme"}
          </Badge>
          {isEditing ? (
            <Input value={editName} onChange={e => onEditNameChange(e.target.value)} className="text-xs h-7 w-64" />
          ) : (
            <span className="text-xs font-semibold text-foreground">{template.name}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onShowHistory}>
            <History className="h-3.5 w-3.5 mr-1" /> History
          </Button>
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onCancel}>Cancel</Button>
              <Button size="sm" className="text-xs h-7" disabled={saving} onClick={onSave}>
                <Save className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={onEdit}>Edit</Button>
          )}
        </div>
      </div>

      {!isEditing && (
        <p className="text-[10px] text-muted-foreground">
          Section 2: {(template.section2_criteria as any[])?.length ?? 0} criteria · Section 3: {(template.section3_criteria as any[])?.length ?? 0} criteria · Updated {format(new Date(template.updated_at), "dd MMM yyyy")}
        </p>
      )}

      {isEditing && (
        <div className="mt-3 space-y-2">
          {/* Section 2 */}
          <button className="w-full flex items-center justify-between text-xs font-semibold text-foreground bg-muted/50 rounded px-3 py-2"
            onClick={() => onToggleSection(expandedSection === "s2" ? null : "s2")}>
            Section 2: Demonstrate Understanding of Outcomes-Based Assessment ({editS2.length} criteria)
            {expandedSection === "s2" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {expandedSection === "s2" && <CriteriaEditor criteria={editS2} onChange={onEditS2Change} sectionLabel="s2" />}

          {/* Section 3 */}
          <button className="w-full flex items-center justify-between text-xs font-semibold text-foreground bg-muted/50 rounded px-3 py-2"
            onClick={() => onToggleSection(expandedSection === "s3" ? null : "s3")}>
            Section 3: Prepare Candidate for Assessments ({editS3.length} criteria)
            {expandedSection === "s3" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {expandedSection === "s3" && <CriteriaEditor criteria={editS3} onChange={onEditS3Change} sectionLabel="s3" />}
        </div>
      )}
    </Card>
  );
}
