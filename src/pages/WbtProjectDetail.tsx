import { useState } from "react";
import { useParams } from "react-router-dom";
import { useWbtProject, useUpdateWbtProject, useWbtProjectApplications } from "@/hooks/useWbtProjects";
import { useWbtBacklog, useCreateBacklogItem, useUpdateBacklogItem } from "@/hooks/useWbtBacklog";
import { useWbtMentorNotes, useCreateMentorNote } from "@/hooks/useWbtMentorNotes";
import { useWbtMentorSuggestions } from "@/hooks/useWbtAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Kanban, ListChecks, Users, StickyNote, Plus, ArrowUpDown, CheckCircle2, DollarSign, Star, ClipboardCheck, Wand2, FileText } from "lucide-react";
import WbtSprintReportButton from "@/components/wbt/WbtSprintReportButton";
import WbtSprintReviewPanel from "@/components/wbt/WbtSprintReviewPanel";
import WbtEscrowPanel from "@/components/wbt/WbtEscrowPanel";
import WbtMentorRatingPanel from "@/components/wbt/WbtMentorRatingPanel";
import { useNavigate } from "react-router-dom";

export default function WbtProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useWbtProject(projectId);
  const updateProject = useUpdateWbtProject();
  const { data: backlog } = useWbtBacklog(projectId);
  const createBacklogItem = useCreateBacklogItem();
  const { data: applications } = useWbtProjectApplications(projectId);
  const { data: mentorNotes } = useWbtMentorNotes(projectId);
  const createNote = useCreateMentorNote();
  const { data: mentorSuggestions } = useWbtMentorSuggestions(projectId);
  const { user, hasRole } = useAuth();

  const [showAddStory, setShowAddStory] = useState(false);
  const [newStory, setNewStory] = useState({ title: "", description: "", acceptance_criteria: "", story_points: 0 });
  const [noteContent, setNoteContent] = useState("");
  const [showMentorSuggestions, setShowMentorSuggestions] = useState(false);

  const isMentor = project?.mentor_id === user?.id;
  const isOwner = project?.created_by === user?.id || project?.client_id === user?.id;
  const isAdmin = hasRole("super_admin") || hasRole("operations");

  const handleAddStory = () => {
    if (!projectId || !newStory.title) return;
    createBacklogItem.mutate({ project_id: projectId, ...newStory, story_points: newStory.story_points || null } as any, {
      onSuccess: () => { setShowAddStory(false); setNewStory({ title: "", description: "", acceptance_criteria: "", story_points: 0 }); },
    });
  };

  const handleAddNote = () => {
    if (!projectId || !noteContent) return;
    createNote.mutate({ project_id: projectId, content: noteContent }, {
      onSuccess: () => setNoteContent(""),
    });
  };

  const handlePublish = () => {
    if (!projectId) return;
    updateProject.mutate({ id: projectId, status: "published" });
  };

  const handleAssignMentor = (mentorUserId: string) => {
    if (!projectId) return;
    updateProject.mutate({ id: projectId, mentor_id: mentorUserId } as any);
    setShowMentorSuggestions(false);
  };

  const handleToggleMentorReview = () => {
    if (!projectId || !project) return;
    updateProject.mutate({ id: projectId, enable_mentor_review_column: !project.config_json?.enable_mentor_review_column } as any);
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[40vh]"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!project) return <div className="text-center py-12 text-muted-foreground">Project not found</div>;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
            <p className="text-muted-foreground">{project.description}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {project.status === "draft" && (isOwner || isAdmin) && (
              <Button onClick={handlePublish} disabled={updateProject.isPending}>Publish</Button>
            )}
            {!project.mentor_id && (isOwner || isAdmin) && (
              <Button variant="outline" onClick={() => setShowMentorSuggestions(true)} className="gap-1">
                <Wand2 className="h-4 w-4" /> Auto-Assign Mentor
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(`/wbt/board/${projectId}`)} className="gap-2">
              <Kanban className="h-4 w-4" /> Open Board
            </Button>
            <WbtSprintReportButton projectId={projectId!} projectTitle={project.title} />
          </div>
        </div>
      </FadeIn>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{project.agile_framework}</Badge>
        <Badge variant="secondary">{project.project_model === "external_client" ? "Client-Led" : "Mentor-Led"}</Badge>
        <Badge variant="secondary">{project.payment_model}</Badge>
        <Badge>{project.status}</Badge>
        {project.mentor_id && <Badge variant="outline">Mentor assigned</Badge>}
      </div>

      <Tabs defaultValue="backlog" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="backlog" className="gap-1.5"><ListChecks className="h-4 w-4" />Backlog</TabsTrigger>
          <TabsTrigger value="applications" className="gap-1.5"><Users className="h-4 w-4" />Applications</TabsTrigger>
          <TabsTrigger value="sprint-reviews" className="gap-1.5"><ClipboardCheck className="h-4 w-4" />Sprint Reviews</TabsTrigger>
          {project.payment_model === "paid" && <TabsTrigger value="escrow" className="gap-1.5"><DollarSign className="h-4 w-4" />Payments</TabsTrigger>}
          <TabsTrigger value="ratings" className="gap-1.5"><Star className="h-4 w-4" />Ratings</TabsTrigger>
          {(isMentor || isAdmin) && <TabsTrigger value="mentor-notes" className="gap-1.5"><StickyNote className="h-4 w-4" />Mentor Notes</TabsTrigger>}
        </TabsList>

        <TabsContent value="backlog" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Product Backlog</h2>
            {(isOwner || isMentor || isAdmin) && (
              <Button size="sm" onClick={() => setShowAddStory(true)} className="gap-1"><Plus className="h-4 w-4" />Add Story</Button>
            )}
          </div>
          {backlog?.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No backlog items yet. Add user stories to define the project scope.</Card>
          ) : (
            <div className="space-y-2">
              {backlog?.map((item, idx) => (
                <Card key={item.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ArrowUpDown className="h-4 w-4" />
                      <span className="text-xs font-mono">#{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.title}</p>
                      {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                      {item.acceptance_criteria && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <span className="font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Acceptance Criteria:</span>
                          <p className="mt-0.5">{item.acceptance_criteria}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.story_points && <Badge variant="outline">{item.story_points} pts</Badge>}
                      <Badge variant={item.status === "backlog" ? "secondary" : "default"}>{item.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <h2 className="text-lg font-semibold">Learner Applications ({applications?.length ?? 0})</h2>
          {applications?.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No applications yet.</Card>
          ) : (
            <div className="space-y-2">
              {applications?.map(app => (
                <Card key={app.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Learner: {app.learner_id.slice(0, 8)}...</p>
                      {app.cover_note && <p className="text-sm text-muted-foreground">{app.cover_note}</p>}
                    </div>
                    <Badge>{app.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sprint-reviews">
          <WbtSprintReviewPanel projectId={projectId!} />
        </TabsContent>

        {project.payment_model === "paid" && (
          <TabsContent value="escrow">
            <WbtEscrowPanel projectId={projectId!} />
          </TabsContent>
        )}

        <TabsContent value="ratings">
          <WbtMentorRatingPanel projectId={projectId!} />
        </TabsContent>

        {(isMentor || isAdmin) && (
          <TabsContent value="mentor-notes" className="space-y-4">
            <h2 className="text-lg font-semibold">Mentor Notes (Private)</h2>
            <div className="flex gap-2">
              <Textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Add a private coaching note..." className="flex-1" />
              <Button onClick={handleAddNote} disabled={!noteContent || createNote.isPending}>Save</Button>
            </div>
            <div className="space-y-2">
              {mentorNotes?.map(note => (
                <Card key={note.id}>
                  <CardContent className="p-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">{new Date(note.created_at).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Add Story Dialog */}
      <Dialog open={showAddStory} onOpenChange={setShowAddStory}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add User Story</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={newStory.title} onChange={e => setNewStory(s => ({ ...s, title: e.target.value }))} placeholder="As a user, I want to..." /></div>
            <div><Label>Description</Label><Textarea value={newStory.description} onChange={e => setNewStory(s => ({ ...s, description: e.target.value }))} /></div>
            <div><Label>Acceptance Criteria</Label><Textarea value={newStory.acceptance_criteria} onChange={e => setNewStory(s => ({ ...s, acceptance_criteria: e.target.value }))} /></div>
            <div><Label>Story Points</Label><Input type="number" min={0} value={newStory.story_points} onChange={e => setNewStory(s => ({ ...s, story_points: +e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStory(false)}>Cancel</Button>
            <Button onClick={handleAddStory} disabled={!newStory.title || createBacklogItem.isPending}>{createBacklogItem.isPending ? "Adding..." : "Add Story"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mentor Auto-Assignment Dialog */}
      <Dialog open={showMentorSuggestions} onOpenChange={setShowMentorSuggestions}>
        <DialogContent>
          <DialogHeader><DialogTitle>Suggested Mentors</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Ranked by skill match, rating, and availability.</p>
          <div className="space-y-3 mt-4">
            {mentorSuggestions && mentorSuggestions.length > 0 ? mentorSuggestions.map((m, i) => (
              <Card key={m.user_id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Mentor {m.user_id.slice(0, 8)}...</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <Badge variant="outline">Score: {m.match_score}</Badge>
                      <Badge variant="outline">Rating: {m.rating_average || 0}/5</Badge>
                      <Badge variant="outline">{m.current_projects} active</Badge>
                    </div>
                    {m.skills?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {m.skills.slice(0, 5).map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                      </div>
                    )}
                  </div>
                  <Button size="sm" onClick={() => handleAssignMentor(m.user_id)}>Assign</Button>
                </CardContent>
              </Card>
            )) : (
              <p className="text-center text-muted-foreground py-4">No available mentors found. Ensure mentor profiles have been created.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
