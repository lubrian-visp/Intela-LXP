import { useState } from "react";
import { StickyNote, Plus, Trash2, Star, Lightbulb, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSessionNotes, useCreateSessionNote, useDeleteSessionNote } from "@/hooks/useCollaboration";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SessionNotesPanelProps {
  sessionId: string;
  isLive: boolean;
}

const noteTypeIcons: Record<string, any> = {
  note: StickyNote,
  key_point: Star,
  action_item: ListTodo,
};

const noteTypeLabels: Record<string, string> = {
  note: "Note",
  key_point: "Key Point",
  action_item: "Action Item",
};

export default function SessionNotesPanel({ sessionId, isLive }: SessionNotesPanelProps) {
  const { user } = useAuth();
  const { data: notes = [], isLoading } = useSessionNotes(sessionId);
  const createNote = useCreateSessionNote();
  const deleteNote = useDeleteSessionNote();
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState<string>("note");

  const handleAdd = () => {
    if (!content.trim() || !user?.id) return;
    createNote.mutate(
      { session_id: sessionId, author_id: user.id, content: content.trim(), note_type: noteType },
      { onSuccess: () => { setContent(""); toast.success("Note added"); } }
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-1.5">
        <Lightbulb className="w-4 h-4 text-warning" />
        <h3 className="text-sm font-semibold text-foreground">Shared Notes</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{notes.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[280px]">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
        ) : notes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No notes yet.</p>
        ) : (
          notes.map((note: any) => {
            const Icon = noteTypeIcons[note.note_type] || StickyNote;
            const isMe = note.author_id === user?.id;
            return (
              <div key={note.id} className={cn(
                "p-2.5 rounded-lg border text-xs",
                note.note_type === "key_point" ? "border-warning/30 bg-warning/5" :
                note.note_type === "action_item" ? "border-primary/30 bg-primary/5" :
                "border-border/50 bg-muted/30"
              )}>
                <div className="flex items-center gap-1 mb-1">
                  <Icon className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[9px] font-medium text-muted-foreground uppercase">{noteTypeLabels[note.note_type]}</span>
                  <span className="ml-auto text-[9px] text-muted-foreground">{format(new Date(note.created_at), "HH:mm")}</span>
                  {isMe && (
                    <button onClick={() => deleteNote.mutate(note.id)} className="p-0.5 hover:text-destructive transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
              </div>
            );
          })
        )}
      </div>

      {isLive && (
        <div className="p-2 border-t border-border space-y-1.5">
          <div className="flex gap-1">
            {(["note", "key_point", "action_item"] as const).map(t => {
              const Icon = noteTypeIcons[t];
              return (
                <button
                  key={t}
                  onClick={() => setNoteType(t)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors",
                    noteType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  <Icon className="w-3 h-3" /> {noteTypeLabels[t]}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1.5">
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Add a note…"
              className="min-h-[48px] text-xs resize-none"
              rows={2}
            />
            <Button size="sm" className="h-auto shrink-0" onClick={handleAdd} disabled={!content.trim() || createNote.isPending}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
