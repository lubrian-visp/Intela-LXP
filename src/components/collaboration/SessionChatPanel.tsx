import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSessionChat, useSendChatMessage } from "@/hooks/useCollaboration";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SessionChatPanelProps {
  sessionId: string;
  isLive: boolean;
}

export default function SessionChatPanel({ sessionId, isLive }: SessionChatPanelProps) {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useSessionChat(sessionId);
  const sendMessage = useSendChatMessage();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || !user?.id) return;
    sendMessage.mutate(
      { session_id: sessionId, user_id: user.id, message: text.trim() },
      { onSuccess: () => setText("") }
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-1.5">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Session Chat</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{messages.length} msgs</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 max-h-[300px]">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-6">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg: any) => {
            const isMe = msg.user_id === user?.id;
            return (
              <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                <div className={cn(
                  "px-3 py-1.5 rounded-xl text-xs max-w-[85%]",
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                )}>
                  {!isMe && (
                    <span className="block text-[9px] font-medium text-muted-foreground mb-0.5">
                      {msg.user_id.slice(0, 8)}…
                    </span>
                  )}
                  {msg.message}
                </div>
                <span className="text-[9px] text-muted-foreground mt-0.5 px-1">
                  {format(new Date(msg.created_at), "HH:mm")}
                </span>
              </div>
            );
          })
        )}
      </div>

      {isLive && (
        <div className="p-2 border-t border-border flex gap-1.5">
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Type a message…"
            className="h-8 text-xs"
          />
          <Button size="sm" className="h-8 w-8 p-0 shrink-0" onClick={handleSend} disabled={!text.trim() || sendMessage.isPending}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
