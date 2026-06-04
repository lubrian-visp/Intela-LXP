import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWbtProjects, useCreateWbtProject, useUpdateWbtProject, WbtProject } from "@/hooks/useWbtProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Building2, Plus, Eye, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function WbtClientPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: allProjects, isLoading } = useWbtProjects();
  const createProject = useCreateWbtProject();
  const updateProject = useUpdateWbtProject();

  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "", description: "", required_skills: "", agile_framework: "scrum",
    sprint_length_weeks: 2, payment_model: "paid", budget: 0, currency: "ZAR", max_learners: 5,
  });

  // Filter to client's own projects
  const myProjects = (allProjects || []).filter(
    (p) => p.client_id === user?.id || p.created_by === user?.id
  );

  const draftProjects = myProjects.filter(p => p.status === "draft");
  const activeProjects = myProjects.filter(p => ["published", "in_progress"].includes(p.status));
  const completedProjects = myProjects.filter(p => p.status === "completed");

  const handleCreate = () => {
    createProject.mutate({
      ...newProject,
      required_skills: newProject.required_skills.split(",").map(s => s.trim()).filter(Boolean),
      project_model: "external_client",
      client_id: user?.id,
    } as any, {
      onSuccess: () => {
        setShowCreate(false);
        setNewProject({ title: "", description: "", required_skills: "", agile_framework: "scrum", sprint_length_weeks: 2, payment_model: "paid", budget: 0, currency: "ZAR", max_learners: 5 });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const ProjectCard = ({ project }: { project: WbtProject }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/wbt/project/${project.id}`)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-foreground text-base">{project.title}</h3>
          <Badge variant={project.status === "completed" ? "default" : project.status === "draft" ? "secondary" : "outline"}>
            {project.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary">{project.agile_framework}</Badge>
          <Badge variant="secondary">{project.payment_model}</Badge>
          {project.mentor_id && <Badge variant="outline">Mentor assigned</Badge>}
        </div>
        {project.budget > 0 && (
          <p className="text-sm font-medium text-foreground mt-2">{project.currency} {project.budget.toLocaleString()}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Client Portal</h1>
              <p className="text-muted-foreground">Post projects, track progress, and review deliverables.</p>
            </div>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Post Project
          </Button>
        </div>
      </FadeIn>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold text-foreground">{draftProjects.length}</p>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{activeProjects.length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-foreground">{completedProjects.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active ({activeProjects.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({draftProjects.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedProjects.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3">
          {activeProjects.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No active projects. Post a new project to get started.</Card>
          ) : activeProjects.map(p => <ProjectCard key={p.id} project={p} />)}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-3">
          {draftProjects.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No drafts.</Card>
          ) : draftProjects.map(p => <ProjectCard key={p.id} project={p} />)}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3">
          {completedProjects.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No completed projects yet.</Card>
          ) : completedProjects.map(p => <ProjectCard key={p.id} project={p} />)}
        </TabsContent>
      </Tabs>

      {/* Create Project Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Post a New Project</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Project Title</Label><Input value={newProject.title} onChange={e => setNewProject(s => ({ ...s, title: e.target.value }))} placeholder="e.g. E-commerce Platform MVP" /></div>
            <div><Label>Description</Label><Textarea value={newProject.description} onChange={e => setNewProject(s => ({ ...s, description: e.target.value }))} placeholder="Describe the project scope and objectives..." /></div>
            <div><Label>Required Skills (comma-separated)</Label><Input value={newProject.required_skills} onChange={e => setNewProject(s => ({ ...s, required_skills: e.target.value }))} placeholder="React, Node.js, PostgreSQL" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Framework</Label>
                <Select value={newProject.agile_framework} onValueChange={v => setNewProject(s => ({ ...s, agile_framework: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scrum">Scrum</SelectItem>
                    <SelectItem value="kanban">Kanban</SelectItem>
                    <SelectItem value="scrumban">Scrumban</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Sprint Length (weeks)</Label><Input type="number" min={1} max={4} value={newProject.sprint_length_weeks} onChange={e => setNewProject(s => ({ ...s, sprint_length_weeks: +e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payment Model</Label>
                <Select value={newProject.payment_model} onValueChange={v => setNewProject(s => ({ ...s, payment_model: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                    <SelectItem value="stipend">Stipend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Budget ({newProject.currency})</Label><Input type="number" min={0} value={newProject.budget} onChange={e => setNewProject(s => ({ ...s, budget: +e.target.value }))} /></div>
            </div>
            <div><Label>Max Learners</Label><Input type="number" min={1} max={20} value={newProject.max_learners} onChange={e => setNewProject(s => ({ ...s, max_learners: +e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newProject.title || createProject.isPending}>
              {createProject.isPending ? "Creating..." : "Post Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
