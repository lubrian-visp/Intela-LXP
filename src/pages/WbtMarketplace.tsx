import { useState } from "react";
import WbtRecommendationsWidget from "@/components/wbt/WbtRecommendationsWidget";
import { useWbtProjects, useCreateWbtProject, useApplyToWbtProject } from "@/hooks/useWbtProjects";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Plus, Search, Users, Calendar, DollarSign, GitBranch } from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-primary/10 text-primary",
  active: "bg-green-500/10 text-green-600",
  in_progress: "bg-blue-500/10 text-blue-600",
  completed: "bg-accent/10 text-accent-foreground",
};

export default function WbtMarketplace() {
  const { data: projects, isLoading } = useWbtProjects();
  const createProject = useCreateWbtProject();
  const applyToProject = useApplyToWbtProject();
  const { hasRole } = useAuth();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showApply, setShowApply] = useState<string | null>(null);
  const [coverNote, setCoverNote] = useState("");
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    agile_framework: "scrum",
    sprint_length_weeks: 2,
    project_model: "external_client",
    payment_model: "unpaid",
    max_learners: 1,
    required_skills: "",
  });

  const canCreate = hasRole("programme_manager") || hasRole("operations") || hasRole("super_admin") || hasRole("mentor");

  const filtered = projects?.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const handleCreate = () => {
    createProject.mutate({
      ...newProject,
      required_skills: newProject.required_skills.split(",").map(s => s.trim()).filter(Boolean),
    } as any, {
      onSuccess: () => {
        setShowCreate(false);
        setNewProject({ title: "", description: "", agile_framework: "scrum", sprint_length_weeks: 2, project_model: "external_client", payment_model: "unpaid", max_learners: 1, required_skills: "" });
      },
    });
  };

  const handleApply = () => {
    if (!showApply) return;
    applyToProject.mutate({ projectId: showApply, coverNote }, {
      onSuccess: () => { setShowApply(null); setCoverNote(""); },
    });
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Work-Based Training</h1>
            <p className="text-muted-foreground">Browse and apply for real-world Agile projects</p>
          </div>
          {canCreate && (
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" /> New Project
            </Button>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </FadeIn>

      {/* AI Recommendations */}
      <WbtRecommendationsWidget />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Card key={i} className="animate-pulse h-56 bg-muted/50" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No projects found. {canCreate ? "Create one to get started." : ""}</p>
        </Card>
      ) : (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(project => (
            <StaggerItem key={project.id}>
              <Card className="flex flex-col h-full hover:shadow-lg transition-shadow border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">{project.title}</CardTitle>
                    <Badge className={statusColors[project.status] ?? "bg-muted"}>{project.status}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {project.required_skills?.slice(0, 4).map((skill: string) => (
                      <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                    ))}
                    {(project.required_skills?.length ?? 0) > 4 && (
                      <Badge variant="outline" className="text-xs">+{project.required_skills.length - 4}</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{project.agile_framework}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />Max {project.max_learners}</span>
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{project.payment_model}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{project.sprint_length_weeks}w sprints</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{project.project_model === "external_client" ? "Client-Led" : "Mentor-Led"}</Badge>
                </CardContent>
                <CardFooter className="pt-3 border-t border-border/50">
                  {project.status === "published" && hasRole("learner") ? (
                    <Button size="sm" className="w-full" onClick={() => setShowApply(project.id)}>Apply</Button>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => window.location.href = `/wbt/project/${project.id}`}>View Details</Button>
                  )}
                </CardFooter>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {/* Create Project Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={newProject.title} onChange={e => setNewProject(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Agile Framework</Label>
                <Select value={newProject.agile_framework} onValueChange={v => setNewProject(p => ({ ...p, agile_framework: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scrum">Scrum</SelectItem>
                    <SelectItem value="kanban">Kanban</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Project Model</Label>
                <Select value={newProject.project_model} onValueChange={v => setNewProject(p => ({ ...p, project_model: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external_client">Client-Led</SelectItem>
                    <SelectItem value="mentor_led">Mentor-Led</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Sprint Length (weeks)</Label><Input type="number" min={1} max={4} value={newProject.sprint_length_weeks} onChange={e => setNewProject(p => ({ ...p, sprint_length_weeks: +e.target.value }))} /></div>
              <div><Label>Max Learners</Label><Input type="number" min={1} value={newProject.max_learners} onChange={e => setNewProject(p => ({ ...p, max_learners: +e.target.value }))} /></div>
            </div>
            <div><Label>Required Skills (comma-separated)</Label><Input value={newProject.required_skills} onChange={e => setNewProject(p => ({ ...p, required_skills: e.target.value }))} placeholder="React, TypeScript, Agile" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newProject.title || createProject.isPending}>
              {createProject.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Dialog */}
      <Dialog open={!!showApply} onOpenChange={() => setShowApply(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply to Project</DialogTitle></DialogHeader>
          <div><Label>Cover Note (optional)</Label><Textarea value={coverNote} onChange={e => setCoverNote(e.target.value)} placeholder="Why are you interested in this project?" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApply(null)}>Cancel</Button>
            <Button onClick={handleApply} disabled={applyToProject.isPending}>{applyToProject.isPending ? "Submitting..." : "Submit Application"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
