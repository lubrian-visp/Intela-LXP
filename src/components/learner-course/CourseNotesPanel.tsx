import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Plus, Trash2, StickyNote } from "lucide-react";
import { format } from "date-fns";

interface Note {
  id: string;
  note_text: string;
  content_block_id: string | null;
  created_at: string;
}

interface CourseNotesPanelProps {
  notes: Note[];
  blockTitle: string;
  blockId: string | null;
  onAddNote: (text: string) => void;
  onDeleteNote: (id: string) => void;
  onClose: () => void;
  isAdding: boolean;
}

export default function CourseNotesPanel({
  notes,
  blockTitle,
  blockId,
  onAddNote,
  onDeleteNote,
  onClose,
  isAdding,
}: CourseNotesPanelProps) {
  const [newNote, setNewNote] = useState("");

  const blockNotes = blockId
    ? notes.filter((n) => n.content_block_id === blockId)
    : notes;

  const handleSubmit = () => {
    if (!newNote.trim()) return;
    onAddNote(newNote.trim());
    setNewNote("");
  };

  return (
    <div className="w-80 border-l border-border/50 bg-card flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold text-foreground">My Notes</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground px-4 pt-2 truncate">
        {blockTitle || "All notes"}
      </p>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {blockNotes.length === 0 && (
            <p className="text-xs text-muted-foreground/60 text-center py-6 italic">
              No notes yet for this lesson.
            </p>
          )}
          {blockNotes.map((note) => (
            <div
              key={note.id}
              className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 group"
            >
              <p className="text-xs text-foreground whitespace-pre-wrap">{note.note_text}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[9px] text-muted-foreground">
                  {format(new Date(note.created_at), "MMM dd, HH:mm")}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onDeleteNote(note.id)}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/50 space-y-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write a note..."
          className="text-xs min-h-[60px] resize-none"
        />
        <Button
          size="sm"
          className="w-full text-xs gap-1"
          onClick={handleSubmit}
          disabled={!newNote.trim() || isAdding}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Note
        </Button>
      </div>
    </div>
  );
}
