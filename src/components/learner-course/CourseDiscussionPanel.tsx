import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, MessageSquare, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface CourseDiscussionPanelProps {
  moduleId: string | null;
  onClose: () => void;
}

export default function CourseDiscussionPanel({ moduleId, onClose }: CourseDiscussionPanelProps) {
  const [newPost, setNewPost] = useState("");

  const { data: threads = [] } = useQuery({
    queryKey: ["discussion_threads", "module", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discussion_threads")
        .select("*, discussion_posts(id, body, author_id, created_at)")
        .eq("scope_type", "module")
        .eq("scope_id", moduleId!)
        .order("last_activity_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="w-80 border-l border-border/50 bg-card flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold text-foreground">Discussion</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {threads.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground">No discussions for this module yet.</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Start a conversation below!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map((thread: any) => (
              <div key={thread.id} className="p-3 rounded-lg bg-muted/50 border border-border/30">
                <p className="text-xs font-medium text-foreground">{thread.title}</p>
                {thread.body && (
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{thread.body}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[9px] text-muted-foreground">
                    {thread.reply_count} replies
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {format(new Date(thread.last_activity_at), "MMM dd")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-border/50 space-y-2">
        <Textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Start a discussion..."
          className="text-xs min-h-[50px] resize-none"
        />
        <Button size="sm" className="w-full text-xs gap-1" disabled={!newPost.trim()}>
          <Send className="w-3.5 h-3.5" />
          Post
        </Button>
      </div>
    </div>
  );
}
