import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSkills, useCreateSkill, useLearnerSkillProfile, useUpsertSkillProfile } from "@/hooks/useLxpData";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Plus, Search, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = ["general", "technical", "business", "soft_skills"];

export default function SkillsManager() {
  const { user } = useAuth();
  const { data: skills = [], isLoading: skillsLoading } = useSkills();
  const { data: myProfile = [], isLoading: profileLoading } = useLearnerSkillProfile(user?.id);
  const createSkill = useCreateSkill();
  const upsertProfile = useUpsertSkillProfile();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: "", category: "general", description: "" });
  const [editingSkill, setEditingSkill] = useState<any>(null);

  const isLoading = skillsLoading || profileLoading;

  const profileMap = new Map<string, any>();
  myProfile.forEach((sp: any) => profileMap.set(sp.skill_id, sp));

  const filtered = skills.filter((s: any) => {
    if (catFilter !== "all" && s.category !== catFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const gapSkills = skills.filter((s: any) => {
    const profile = profileMap.get(s.id);
    return profile && profile.proficiency_level < profile.target_level;
  });

  const handleAddSkill = async () => {
    if (!newSkill.name.trim()) return;
    try {
      await createSkill.mutateAsync(newSkill);
      toast({ title: "Skill created" });
      setShowAddSkill(false);
      setNewSkill({ name: "", category: "general", description: "" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleUpdateProficiency = async (skillId: string, level: number) => {
    if (!user?.id) return;
    try {
      await upsertProfile.mutateAsync({
        learner_id: user.id,
        skill_id: skillId,
        proficiency_level: level,
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSetTarget = async (skillId: string, target: number) => {
    if (!user?.id) return;
    const existing = profileMap.get(skillId);
    try {
      await upsertProfile.mutateAsync({
        learner_id: user.id,
        skill_id: skillId,
        proficiency_level: existing?.proficiency_level ?? 0,
        target_level: target,
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> Skills Architecture
            </h1>
            <p className="text-sm text-muted-foreground">Track, develop, and manage skills across the platform.</p>
          </div>
          <Button size="sm" onClick={() => setShowAddSkill(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Skill
          </Button>
        </div>
      </FadeIn>

      {/* Gap Analysis Summary */}
      {gapSkills.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-sm font-semibold text-foreground">Skill Gaps Identified</span>
              <Badge variant="outline" className="ml-auto">{gapSkills.length} gap{gapSkills.length !== 1 ? "s" : ""}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {gapSkills.slice(0, 6).map((s: any) => {
                const profile = profileMap.get(s.id);
                return (
                  <Badge key={s.id} variant="secondary" className="text-xs">
                    {s.name}: {profile.proficiency_level}/{profile.target_level}
                  </Badge>
                );
              })}
              {gapSkills.length > 6 && <Badge variant="outline" className="text-xs">+{gapSkills.length - 6} more</Badge>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search skills..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Skills Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">No Skills Found</h3>
            <p className="text-xs text-muted-foreground">Add skills to begin tracking development.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((skill: any) => {
            const profile = profileMap.get(skill.id);
            const current = profile?.proficiency_level ?? 0;
            const target = profile?.target_level ?? 3;
            const pct = Math.round((current / 5) * 100);
            const hasGap = current < target;

            return (
              <Card key={skill.id} className="hover:shadow-card-hover transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm">{skill.name}</CardTitle>
                      <Badge variant="outline" className="text-[10px] mt-1 capitalize">{skill.category.replace(/_/g, " ")}</Badge>
                    </div>
                    {hasGap && <AlertTriangle className="w-4 h-4 text-warning shrink-0" />}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {skill.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{skill.description}</p>
                  )}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Proficiency</span>
                      <span className="font-medium text-foreground">{current}/5</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Target</span>
                      <span className="font-medium text-foreground">{target}/5</span>
                    </div>
                    <Slider
                      value={[current]}
                      max={5}
                      step={1}
                      onValueCommit={(val) => handleUpdateProficiency(skill.id, val[0])}
                      className="py-1"
                    />
                  </div>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => handleSetTarget(skill.id, lvl)}
                        className={`flex-1 text-[10px] py-1 rounded border transition-all ${
                          lvl === target
                            ? "bg-primary/10 border-primary text-primary font-medium"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        T{lvl}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Skill Dialog */}
      <Dialog open={showAddSkill} onOpenChange={setShowAddSkill}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Skill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Skill Name</Label>
              <Input value={newSkill.name} onChange={e => setNewSkill(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Data Analysis" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Category</Label>
              <Select value={newSkill.category} onValueChange={v => setNewSkill(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Textarea value={newSkill.description} onChange={e => setNewSkill(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddSkill(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddSkill} disabled={!newSkill.name.trim() || createSkill.isPending}>
              {createSkill.isPending ? "Creating..." : "Create Skill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
