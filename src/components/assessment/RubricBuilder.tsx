import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Loader2, GripVertical, Star, Edit2, Save, X, Award,
} from "lucide-react";
import {
  useRubrics, useRubricCriteria, useCreateRubric,
  useCreateRubricCriterion, useUpdateRubricCriterion, useDeleteRubricCriterion,
  useLinkRubricToAssessment, useAssessmentRubrics,
  type RubricCriterion,
} from "@/hooks/useRubrics";

interface RubricBuilderProps {
  programmeId?: string;
  assessmentId?: string;
}

export default function RubricBuilder({ programmeId, assessmentId }: RubricBuilderProps) {
  const [selectedRubricId, setSelectedRubricId] = useState<string>("");
  const [showCreateRubric, setShowCreateRubric] = useState(false);
  const [showAddCriterion, setShowAddCriterion] = useState(false);
  const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);

  // Create rubric form
  const [rubricName, setRubricName] = useState("");
  const [rubricDesc, setRubricDesc] = useState("");
  const [rubricType, setRubricType] = useState("analytic");

  // Create criterion form
  const [critName, setCritName] = useState("");
  const [critDesc, setCritDesc] = useState("");
  const [critMaxPoints, setCritMaxPoints] = useState("10");
  const [critLevels, setCritLevels] = useState([
    { level: "Excellent", points: 10, description: "" },
    { level: "Good", points: 7, description: "" },
    { level: "Satisfactory", points: 5, description: "" },
    { level: "Needs Improvement", points: 2, description: "" },
  ]);

  const { data: rubrics = [] } = useRubrics(programmeId);
  const { data: criteria = [], isLoading: criteriaLoading } = useRubricCriteria(selectedRubricId || undefined);
  const { data: linkedRubrics = [] } = useAssessmentRubrics(assessmentId);
  const createRubric = useCreateRubric();
  const createCriterion = useCreateRubricCriterion();
  const updateCriterion = useUpdateRubricCriterion();
  const deleteCriterion = useDeleteRubricCriterion();
  const linkRubric = useLinkRubricToAssessment();

  const isLinked = linkedRubrics.some((lr: any) => lr.rubric_id === selectedRubricId);
  const totalMaxPoints = criteria.reduce((sum, c) => sum + c.max_points, 0);

  const handleCreateRubric = async () => {
    if (!rubricName.trim()) return;
    const result = await createRubric.mutateAsync({
      name: rubricName,
      description: rubricDesc || undefined,
      rubric_type: rubricType,
      programme_id: programmeId,
    });
    setShowCreateRubric(false);
    setRubricName(""); setRubricDesc("");
    if (result) setSelectedRubricId((result as any).id);
  };

  const handleAddCriterion = async () => {
    if (!critName.trim() || !selectedRubricId) return;
    await createCriterion.mutateAsync({
      rubric_id: selectedRubricId,
      criterion_name: critName,
      description: critDesc || undefined,
      max_points: parseFloat(critMaxPoints) || 10,
      sequence_order: criteria.length,
      performance_levels: critLevels,
    });
    setShowAddCriterion(false);
    setCritName(""); setCritDesc(""); setCritMaxPoints("10");
    setCritLevels([
      { level: "Excellent", points: 10, description: "" },
      { level: "Good", points: 7, description: "" },
      { level: "Satisfactory", points: 5, description: "" },
      { level: "Needs Improvement", points: 2, description: "" },
    ]);
  };

  const handleLinkRubric = async () => {
    if (!assessmentId || !selectedRubricId) return;
    await linkRubric.mutateAsync({ assessment_id: assessmentId, rubric_id: selectedRubricId });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Rubric Builder</h3>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setShowCreateRubric(true)}>
          <Plus className="w-3 h-3" /> New Rubric
        </Button>
      </div>

      {/* Rubric selector */}
      <div className="flex items-center gap-2">
        <Select value={selectedRubricId} onValueChange={setSelectedRubricId}>
          <SelectTrigger className="text-sm flex-1">
            <SelectValue placeholder="Select a rubric..." />
          </SelectTrigger>
          <SelectContent>
            {rubrics.map((r) => (
              <SelectItem key={r.id} value={r.id} className="text-xs">
                {r.name}
                <Badge variant="secondary" className="text-[8px] ml-2">{r.rubric_type}</Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {assessmentId && selectedRubricId && !isLinked && (
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleLinkRubric} disabled={linkRubric.isPending}>
            Link to Assessment
          </Button>
        )}
        {isLinked && (
          <Badge variant="default" className="text-[9px]">Linked ✓</Badge>
        )}
      </div>

      {/* Criteria grid (rubric table) */}
      {selectedRubricId && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              {criteria.length} criteria · {totalMaxPoints} total points
            </p>
            <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setShowAddCriterion(true)}>
              <Plus className="w-3 h-3" /> Add Criterion
            </Button>
          </div>

          {criteriaLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : criteria.length === 0 ? (
            <div className="bg-card rounded-xl p-8 border border-border/50 text-center">
              <Star className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-xs text-muted-foreground">No criteria defined yet. Add your first criterion.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                {criteria.map((crit) => (
                  <div key={crit.id} className="bg-card rounded-lg border border-border/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-xs font-semibold text-foreground">{crit.criterion_name}</h4>
                        {crit.description && <p className="text-[10px] text-muted-foreground">{crit.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px]">{crit.max_points} pts</Badge>
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteCriterion.mutate({ id: crit.id, rubric_id: selectedRubricId })}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    {/* Performance levels grid */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {(crit.performance_levels || []).map((level, i) => (
                        <div
                          key={i}
                          className={cn(
                            "p-2 rounded-md border text-center",
                            i === 0 ? "bg-success/5 border-success/20" :
                            i === 1 ? "bg-info/5 border-info/20" :
                            i === 2 ? "bg-warning/5 border-warning/20" :
                            "bg-destructive/5 border-destructive/20"
                          )}
                        >
                          <p className="text-[10px] font-semibold text-foreground">{level.level}</p>
                          <p className="text-xs font-bold text-foreground mt-0.5">{level.points}</p>
                          {level.description && <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{level.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </>
      )}

      {/* Create Rubric Dialog */}
      <Dialog open={showCreateRubric} onOpenChange={setShowCreateRubric}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-base">Create Rubric</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Rubric Name *</Label>
              <Input value={rubricName} onChange={(e) => setRubricName(e.target.value)} placeholder="e.g., Essay Evaluation Rubric" className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea value={rubricDesc} onChange={(e) => setRubricDesc(e.target.value)} placeholder="Optional description..." className="text-sm min-h-[60px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={rubricType} onValueChange={setRubricType}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="analytic" className="text-xs">Analytic (criteria + levels)</SelectItem>
                  <SelectItem value="holistic" className="text-xs">Holistic (single overall score)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreateRubric(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateRubric} disabled={!rubricName.trim() || createRubric.isPending}>
              {createRubric.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Criterion Dialog */}
      <Dialog open={showAddCriterion} onOpenChange={setShowAddCriterion}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">Add Criterion</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Criterion Name *</Label>
              <Input value={critName} onChange={(e) => setCritName(e.target.value)} placeholder="e.g., Content Quality" className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea value={critDesc} onChange={(e) => setCritDesc(e.target.value)} placeholder="What this criterion measures..." className="text-sm min-h-[50px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Points</Label>
              <Input type="number" value={critMaxPoints} onChange={(e) => setCritMaxPoints(e.target.value)} className="text-sm" />
            </div>

            <Separator />
            <Label className="text-xs font-semibold">Performance Levels</Label>
            {critLevels.map((level, i) => (
              <div key={i} className="space-y-1 p-3 rounded-lg bg-secondary/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <Input
                    value={level.level}
                    onChange={(e) => {
                      const updated = [...critLevels];
                      updated[i] = { ...updated[i], level: e.target.value };
                      setCritLevels(updated);
                    }}
                    placeholder="Level name"
                    className="h-7 text-xs flex-1"
                  />
                  <Input
                    type="number"
                    value={level.points}
                    onChange={(e) => {
                      const updated = [...critLevels];
                      updated[i] = { ...updated[i], points: parseFloat(e.target.value) || 0 };
                      setCritLevels(updated);
                    }}
                    className="h-7 text-xs w-16"
                    placeholder="Pts"
                  />
                  {critLevels.length > 2 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCritLevels((p) => p.filter((_, idx) => idx !== i))}>
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <Textarea
                  value={level.description}
                  onChange={(e) => {
                    const updated = [...critLevels];
                    updated[i] = { ...updated[i], description: e.target.value };
                    setCritLevels(updated);
                  }}
                  placeholder="Description for this level..."
                  className="text-xs min-h-[40px]"
                />
              </div>
            ))}
            {critLevels.length < 6 && (
              <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setCritLevels((p) => [...p, { level: "", points: 0, description: "" }])}>
                <Plus className="w-3 h-3" /> Add Level
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddCriterion(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddCriterion} disabled={!critName.trim() || createCriterion.isPending}>
              {createCriterion.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Add Criterion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
