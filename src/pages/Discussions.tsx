import { useState } from "react";
import { MessageSquare, Plus, Pin, Lock, Clock, User } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDiscussionThreads, useCreateThread, useDiscussionPosts, useCreatePost, useUpdateThread } from "@/hooks/useCollaboration";
import { useProgrammes, useCohorts } from "@/hooks/useCoreData";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Discussions() {
  const { user, hasRole } = useAuth();
  const [scopeType, setScopeType] = useState("programme");
  const [scopeId, setScopeId] = useState<string>("");
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [threadTitle, setThreadTitle] = useState("");
  const [threadBody, setThreadBody] = useState("");
  const [replyText, setReplyText] = useState("");

  const { data: programmes = [] } = useProgrammes();
  const { data: cohorts = [] } = useCohorts();
  const { data: threads = [], isLoading } = useDiscussionThreads(scopeType, scopeId || undefined);
  const { data: posts = [] } = useDiscussionPosts(selectedThread || undefined);
  const createThread = useCreateThread();
  const createPost = useCreatePost();
  const updateThread = useUpdateThread();

  const isStaff = hasRole("super_admin") || hasRole("programme_manager") || hasRole("facilitator");

  const scopeOptions = scopeType === "programme"
    ? programmes.map((p: any) => ({ value: p.id, label: p.title }))
    : cohorts.map((c: any) => ({ value: c.id, label: c.name }));

  const handleCreateThread = () => {
    if (!threadTitle.trim() || !scopeId || !user?.id) return;
    createThread.mutate(
      { title: threadTitle, body: threadBody, scope_type: scopeType, scope_id: scopeId, author_id: user.id },
      {
        onSuccess: () => {
          setNewThreadOpen(false);
          setThreadTitle("");
          setThreadBody("");
          toast.success("Thread created");
        },
      }
    );
  };

  const handleReply = () => {
    if (!replyText.trim() || !selectedThread || !user?.id) return;
    createPost.mutate(
      { thread_id: selectedThread, author_id: user.id, body: replyText },
      { onSuccess: () => { setReplyText(""); toast.success("Reply posted"); } }
    );
  };

  const activeThread = threads.find((t: any) => t.id === selectedThread);

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Discussion Forums</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Collaborate with peers and facilitators</p>
          </div>
          <Dialog open={newThreadOpen} onOpenChange={setNewThreadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> New Thread</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Discussion Thread</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <Input value={threadTitle} onChange={e => setThreadTitle(e.target.value)} placeholder="Thread title…" />
                <Textarea value={threadBody} onChange={e => setThreadBody(e.target.value)} placeholder="Describe your topic…" rows={4} />
                <Button onClick={handleCreateThread} disabled={!threadTitle.trim() || !scopeId || createThread.isPending} className="w-full">
                  Create Thread
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </FadeIn>

      {/* Scope filters */}
      <div className="flex gap-3">
        <Select value={scopeType} onValueChange={v => { setScopeType(v); setScopeId(""); setSelectedThread(null); }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="programme">Programme</SelectItem>
            <SelectItem value="cohort">Cohort</SelectItem>
          </SelectContent>
        </Select>
        <Select value={scopeId} onValueChange={v => { setScopeId(v); setSelectedThread(null); }}>
          <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            {scopeOptions.map((o: any) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
        {/* Thread list */}
        <div className="lg:col-span-1 bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Threads</h3>
          </div>
          <div className="divide-y divide-border/50 max-h-[500px] overflow-y-auto">
            {!scopeId ? (
              <p className="p-6 text-center text-xs text-muted-foreground">Select a programme or cohort above</p>
            ) : isLoading ? (
              <p className="p-6 text-center text-xs text-muted-foreground">Loading…</p>
            ) : threads.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">No threads yet. Start a discussion!</p>
            ) : (
              threads.map((thread: any) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors",
                    selectedThread === thread.id && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {thread.is_pinned && <Pin className="w-3 h-3 text-warning shrink-0" />}
                        {thread.is_locked && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
                        <p className="text-xs font-semibold text-foreground truncate">{thread.title}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{thread.body}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-medium text-primary">{thread.reply_count} replies</span>
                      <p className="text-[9px] text-muted-foreground">{format(new Date(thread.last_activity_at), "MMM dd")}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread detail */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border/50 overflow-hidden flex flex-col">
          {!selectedThread ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Select a thread to view the discussion</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{activeThread?.title}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Started {activeThread && format(new Date(activeThread.created_at), "MMM dd, yyyy")} · {activeThread?.reply_count} replies
                    </p>
                  </div>
                  {isStaff && activeThread && (
                    <div className="flex gap-1">
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => updateThread.mutate({ id: activeThread.id, is_pinned: !activeThread.is_pinned })}
                      >
                        <Pin className={cn("w-3.5 h-3.5", activeThread.is_pinned && "text-warning")} />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => updateThread.mutate({ id: activeThread.id, is_locked: !activeThread.is_locked })}
                      >
                        <Lock className={cn("w-3.5 h-3.5", activeThread.is_locked && "text-destructive")} />
                      </Button>
                    </div>
                  )}
                </div>
                {activeThread?.body && (
                  <p className="text-xs text-muted-foreground mt-2 bg-muted/30 p-3 rounded-lg">{activeThread.body}</p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[360px]">
                {posts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No replies yet. Be the first!</p>
                ) : (
                  posts.map((post: any) => (
                    <div key={post.id} className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-foreground">{post.author_id.slice(0, 8)}…</span>
                          <span className="text-[9px] text-muted-foreground">{format(new Date(post.created_at), "MMM dd, HH:mm")}</span>
                        </div>
                        <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap">{post.body}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {!activeThread?.is_locked && (
                <div className="p-3 border-t border-border flex gap-2">
                  <Textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Write a reply…"
                    className="min-h-[40px] text-xs resize-none"
                    rows={2}
                  />
                  <Button size="sm" onClick={handleReply} disabled={!replyText.trim() || createPost.isPending} className="shrink-0 self-end">
                    Reply
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
