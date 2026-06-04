import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMentorMessages, useSendMentorMessage } from "@/hooks/useMentorData";
import { useEnrolments } from "@/hooks/useCoreData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function MentorMessages() {
  const { user } = useAuth();
  const { data: enrolments = [] } = useEnrolments();
  const [selectedMentee, setSelectedMentee] = useState<string | null>(null);
  const { data: messages = [], isLoading } = useMentorMessages(selectedMentee ?? undefined);
  const sendMessage = useSendMentorMessage();
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const mentees = (enrolments as any[]).filter(e => e.mentor_id === user?.id);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel("mentor_messages_rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mentor_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["mentor_messages"] });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = () => {
    if (!body.trim() || !selectedMentee || !user) return;
    sendMessage.mutate({ sender_id: user.id, recipient_id: selectedMentee, body: body.trim() });
    setBody("");
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground">Direct communication with your mentees.</p>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        {/* Mentee list */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mentees</p>
          </div>
          <div className="divide-y divide-border/50">
            {mentees.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground text-center">No mentees assigned</p>
            ) : mentees.map(m => (
              <button key={m.learner_id} onClick={() => setSelectedMentee(m.learner_id)}
                className={cn("w-full px-4 py-3 text-left hover:bg-secondary/30 transition-colors", selectedMentee === m.learner_id && "bg-secondary/50")}>
                <p className="text-sm font-medium text-foreground">{(m as any).cohorts?.programmes?.title ?? "Mentee"}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{m.learner_id.slice(0, 8)}…</p>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 flex flex-col min-h-[400px]">
          {!selectedMentee ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Select a mentee to start messaging</p>
              </div>
            </div>
          ) : isLoading ? <Skeleton className="flex-1 m-4 rounded-lg" /> : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {(messages as any[]).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Start the conversation!</p>
                )}
                {(messages as any[]).map(msg => (
                  <div key={msg.id} className={cn("max-w-[75%] rounded-xl px-3 py-2", msg.sender_id === user?.id ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary text-foreground")}>
                    <p className="text-sm">{msg.body}</p>
                    <p className="text-[9px] mt-0.5 opacity-60">{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <Input placeholder="Type a message..." value={body} onChange={e => setBody(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} className="flex-1" />
                <Button size="sm" onClick={handleSend} disabled={!body.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
