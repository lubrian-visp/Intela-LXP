import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useWbtBoardColumns, useWbtBoardCards, useMoveWbtCard, useCreateWbtCard } from "@/hooks/useWbtBoard";
import { useWbtProject } from "@/hooks/useWbtProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, GripVertical, ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";

export default function WbtAgileBoard() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useWbtProject(projectId);
  const { data: columns } = useWbtBoardColumns(projectId);
  const { data: cards } = useWbtBoardCards(projectId);
  const moveCard = useMoveWbtCard();
  const createCard = useCreateWbtCard();
  const [showAddCard, setShowAddCard] = useState<string | null>(null);
  const [newCard, setNewCard] = useState({ title: "", description: "", priority: "medium" });

  const cardsByColumn = useMemo(() => {
    const map: Record<string, typeof cards> = {};
    columns?.forEach(col => { map[col.id] = []; });
    cards?.forEach(card => {
      if (map[card.column_id]) map[card.column_id]!.push(card);
    });
    return map;
  }, [columns, cards]);

  const handleMoveCard = (cardId: string, currentColId: string) => {
    if (!columns) return;
    const currentIdx = columns.findIndex(c => c.id === currentColId);
    const nextCol = columns[currentIdx + 1];
    if (nextCol) {
      moveCard.mutate({ cardId, columnId: nextCol.id, sequenceOrder: 0 });
    }
  };

  const handleAddCard = () => {
    if (!showAddCard || !projectId || !newCard.title) return;
    createCard.mutate({
      project_id: projectId,
      column_id: showAddCard,
      title: newCard.title,
      description: newCard.description || null,
      priority: newCard.priority,
      sequence_order: (cardsByColumn[showAddCard]?.length ?? 0),
    } as any, {
      onSuccess: () => {
        setShowAddCard(null);
        setNewCard({ title: "", description: "", priority: "medium" });
      },
    });
  };

  const columnColors: Record<string, string> = {
    todo: "border-t-muted-foreground",
    in_progress: "border-t-blue-500",
    review: "border-t-amber-500",
    done: "border-t-green-500",
  };

  const priorityColors: Record<string, string> = {
    high: "bg-red-500/10 text-red-600",
    medium: "bg-amber-500/10 text-amber-600",
    low: "bg-green-500/10 text-green-600",
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{project?.title ?? "Agile Board"}</h1>
            <p className="text-muted-foreground text-sm">
              {project?.agile_framework === "kanban" ? "Kanban Board" : `Scrum Board — ${project?.sprint_length_weeks}w sprints`}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">{project?.project_model === "external_client" ? "Client-Led" : "Mentor-Led"}</Badge>
        </div>
      </FadeIn>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 220px)" }}>
        {columns?.map(col => (
          <div key={col.id} className={`flex-shrink-0 w-72 flex flex-col bg-muted/30 rounded-lg border border-border/50 border-t-4 ${columnColors[col.column_key] ?? "border-t-primary"}`}>
            <div className="p-3 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">{col.title}</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{cardsByColumn[col.id]?.length ?? 0}</Badge>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowAddCard(col.id)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {cardsByColumn[col.id]?.map(card => (
                <Card key={card.id} className="cursor-pointer hover:shadow-md transition-shadow bg-card">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-2">{card.title}</p>
                        {card.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{card.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge className={`text-xs ${priorityColors[card.priority] ?? ""}`}>{card.priority}</Badge>
                      {!col.is_done && (
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleMoveCard(card.id, col.id)}>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Card Dialog */}
      <Dialog open={!!showAddCard} onOpenChange={() => setShowAddCard(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Card</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={newCard.title} onChange={e => setNewCard(c => ({ ...c, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={newCard.description} onChange={e => setNewCard(c => ({ ...c, description: e.target.value }))} /></div>
            <div>
              <Label>Priority</Label>
              <Select value={newCard.priority} onValueChange={v => setNewCard(c => ({ ...c, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCard(null)}>Cancel</Button>
            <Button onClick={handleAddCard} disabled={!newCard.title || createCard.isPending}>{createCard.isPending ? "Adding..." : "Add Card"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
