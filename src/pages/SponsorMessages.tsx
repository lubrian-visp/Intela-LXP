import { useState } from "react";
import { MessagesSquare, Send, Mail, MailOpen, Reply, Plus } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { useSponsorMessages, useSendMessage, useMarkMessageRead } from "@/hooks/useSponsorData";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SponsorMessages() {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useSponsorMessages();
  const sendMessage = useSendMessage();
  const markRead = useMarkMessageRead();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [newMsg, setNewMsg] = useState({ recipient_id: "", subject: "", body: "" });

  const selected = messages.find(m => m.id === selectedId);
  const inbox = messages.filter(m => m.recipient_id === user?.id);
  const sent = messages.filter(m => m.sender_id === user?.id);
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const displayList = tab === "inbox" ? inbox : sent;
  const unreadCount = inbox.filter(m => !m.is_read).length;

  const openMessage = (m: any) => {
    setSelectedId(m.id);
    if (!m.is_read && m.recipient_id === user?.id) {
      markRead.mutate(m.id);
    }
  };

  const handleSend = () => {
    if (!newMsg.recipient_id || !newMsg.subject || !newMsg.body) {
      toast.error("Please fill all fields");
      return;
    }
    sendMessage.mutate(
      { sender_id: user?.id, ...newMsg },
      {
        onSuccess: () => {
          toast.success("Message sent");
          setComposeOpen(false);
          setNewMsg({ recipient_id: "", subject: "", body: "" });
        },
        onError: () => toast.error("Failed to send message"),
      }
    );
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <MessagesSquare className="w-5 h-5 text-primary" /> Messages
              {unreadCount > 0 && (
                <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Communicate with programme managers and administrators.</p>
          </div>
          <Button size="sm" onClick={() => setComposeOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Message
          </Button>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Message list */}
        <div className="lg:col-span-1 bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="flex border-b border-border">
            {(["inbox", "sent"] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelectedId(null); }}
                className={cn(
                  "flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors",
                  tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t} {t === "inbox" && unreadCount > 0 && `(${unreadCount})`}
              </button>
            ))}
          </div>
          <div className="divide-y divide-border/50 max-h-[60vh] overflow-y-auto">
            {displayList.length === 0 ? (
              <div className="p-8 text-center">
                <Mail className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No messages</p>
              </div>
            ) : (
              displayList.map(m => (
                <div
                  key={m.id}
                  onClick={() => openMessage(m)}
                  className={cn(
                    "px-4 py-3 cursor-pointer hover:bg-secondary/20 transition-colors",
                    selectedId === m.id && "bg-secondary/30",
                    !m.is_read && tab === "inbox" && "bg-primary/[0.03]"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {tab === "inbox" ? (
                      m.is_read ? <MailOpen className="w-3.5 h-3.5 text-muted-foreground" /> : <Mail className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Send className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium text-foreground truncate">{m.subject}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 pl-5">{m.body}</p>
                  <p className="text-[10px] text-muted-foreground/60 pl-5 mt-1">
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message detail */}
        <div className="lg:col-span-2 bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          {selected ? (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground">{selected.subject}</h3>
              <div className="flex items-center gap-3 mt-2 mb-4">
                <span className="text-[11px] text-muted-foreground">
                  {selected.sender_id === user?.id ? "You" : `From: ${selected.sender_id.slice(0, 8)}…`}
                </span>
                <span className="text-[10px] text-muted-foreground/60">
                  {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className="prose prose-sm max-w-none text-foreground/90 whitespace-pre-wrap">{selected.body}</div>
              <div className="mt-6 pt-4 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    setNewMsg({
                      recipient_id: selected.sender_id === user?.id ? selected.recipient_id : selected.sender_id,
                      subject: `Re: ${selected.subject}`,
                      body: "",
                    });
                    setComposeOpen(true);
                  }}
                >
                  <Reply className="w-3.5 h-3.5" /> Reply
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <MessagesSquare className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">Select a message to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Recipient User ID"
              value={newMsg.recipient_id}
              onChange={e => setNewMsg(p => ({ ...p, recipient_id: e.target.value }))}
            />
            <Input
              placeholder="Subject"
              value={newMsg.subject}
              onChange={e => setNewMsg(p => ({ ...p, subject: e.target.value }))}
            />
            <Textarea
              placeholder="Type your message..."
              rows={5}
              value={newMsg.body}
              onChange={e => setNewMsg(p => ({ ...p, body: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sendMessage.isPending} className="gap-1.5">
              <Send className="w-3.5 h-3.5" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
