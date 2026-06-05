import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, MessageSquare, Send, Reply, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface CourseDiscussionPanelProps {
  moduleId: string | null;
  onClose: () => void;
}

const db = supabase as any;

function useDiscussionThreads(moduleId: string | null) {
  return useQuery({
    queryKey: ["discussion_threads", "module", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await db
        .from("discussion_threads")
        .select(`
          *,
          discussion_posts(
            id, body, author_id, parent_post_id, is_solution, created_at
          )
        `)
        .eq("scope_type", "module")
        .eq("scope_id", moduleId!)
        .order("last_activity_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

function useCreateThread(moduleId: string | null) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!moduleId || !user?.id) throw new Error("Missing context");
      // Create thread
      const { data: thread, error: tErr } = await db
        .from("discussion_threads")
        .insert({
          title: body.slice(0, 80),
          scope_type: "module",
          scope_id: moduleId,
          author_id: user.id,
          last_activity_at: new Date().toISOString(),
        })
        .select().single();
      if (tErr) throw tErr;
      // Create first post
      const { error: pErr } = await db
        .from("discussion_posts")
        .insert({ thread_id: thread.id, author_id: user.id, body });
      if (pErr) throw pErr;
      return thread;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discussion_threads", "module", moduleId] }),
  });
}

function useCreateReply(threadId: string, moduleId: string | null) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ body, parentPostId }: { body: string; parentPostId?: string }) => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await db.from("discussion_posts").insert({
        thread_id: threadId, author_id: user.id, body,
        parent_post_id: parentPostId ?? null,
      });
      if (error) throw error;
      // update last_activity_at
      await db.from("discussion_threads")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("id", threadId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discussion_threads", "module", moduleId] }),
  });
}

// Fetch author profiles
function useProfiles(userIds: string[]) {
  return useQuery({
    queryKey: ["discussion-profiles", userIds.join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
      return Object.fromEntries((data ?? []).map((p: any) => [p.user_id, p]));
    },
    staleTime: 120_000,
  });
}

function Avatar({ name, size = "sm" }: { name?: string | null; size?: "sm" | "xs" }) {
  const initials = name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) ?? "?";
  return (
    <div className={cn("rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0",
      size === "xs" ? "w-5 h-5 text-[8px]" : "w-7 h-7 text-[10px]"
    )}>
      {initials}
    </div>
  );
}

function PostItem({ post, allPosts, profiles, onReply, depth = 0 }: {
  post: any; allPosts: any[]; profiles: Record<string, any>;
  onReply: (postId: string) => void; depth?: number;
}) {
  const replies = allPosts.filter(p => p.parent_post_id === post.id);
  const [collapsed, setCollapsed] = useState(false);
  const author = profiles[post.author_id];

  return (
    <div className={cn("space-y-2", depth > 0 && "ml-6 pl-3 border-l-2 border-border/30")}>
      <div className="flex items-start gap-2">
        <Avatar name={author?.full_name} size={depth > 0 ? "xs" : "sm"} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-foreground">{author?.full_name ?? "Learner"}</span>
            {post.is_solution && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">✓ Solution</span>
            )}
            <span className="text-[9px] text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-[12px] text-foreground mt-0.5 leading-relaxed">{post.body}</p>
          <button
            onClick={() => onReply(post.id)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary mt-1 transition-colors"
            aria-label={`Reply to ${author?.full_name ?? "this post"}`}
          >
            <Reply className="w-3 h-3" /> Reply
          </button>
        </div>
      </div>

      {replies.length > 0 && (
        <div>
          <button
            onClick={() => setCollapsed(p => !p)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground ml-9 mb-1"
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </button>
          {!collapsed && replies.map(r => (
            <PostItem key={r.id} post={r} allPosts={allPosts} profiles={profiles} onReply={onReply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CourseDiscussionPanel({ moduleId, onClose }: CourseDiscussionPanelProps) {
  const { data: threads = [] } = useDiscussionThreads(moduleId);
  const createThread = useCreateThread(moduleId);
  const [newPost, setNewPost]         = useState("");
  const [expandedThread, setExpanded] = useState<string | null>(null);
  const [replyingTo, setReplyingTo]   = useState<string | null>(null);
  const [replyText, setReplyText]     = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Collect all author IDs
  const allUserIds = [...new Set(
    threads.flatMap((t: any) => [
      t.author_id,
      ...(t.discussion_posts ?? []).map((p: any) => p.author_id),
    ])
  )];
  const { data: profiles = {} } = useProfiles(allUserIds);

  const replyMutation = useCreateReply(expandedThread ?? "", moduleId);

  const handlePostThread = async () => {
    if (!newPost.trim()) return;
    await createThread.mutateAsync(newPost.trim());
    setNewPost("");
  };

  const handleReply = async () => {
    if (!replyText.trim() || !expandedThread) return;
    await replyMutation.mutateAsync({ body: replyText.trim(), parentPostId: replyingTo ?? undefined });
    setReplyText(""); setReplyingTo(null);
  };

  const handleReplyClick = (postId: string) => {
    setReplyingTo(postId);
    setTimeout(() => textRef.current?.focus(), 100);
  };

  return (
    <div className="w-80 border-l border-border/50 bg-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold text-foreground">Discussion</h3>
          {threads.length > 0 && (
            <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {threads.length}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close discussion panel">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Thread list or thread view */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {expandedThread ? (
            // Thread detail view
            (() => {
              const thread = threads.find((t: any) => t.id === expandedThread);
              if (!thread) return null;
              const rootPosts = (thread.discussion_posts ?? []).filter((p: any) => !p.parent_post_id);
              return (
                <div className="space-y-3">
                  <button
                    onClick={() => { setExpanded(null); setReplyingTo(null); setReplyText(""); }}
                    className="text-[11px] text-primary hover:underline"
                  >
                    ← Back to threads
                  </button>
                  <h4 className="text-[12px] font-semibold text-foreground">{thread.title}</h4>
                  <div className="space-y-3">
                    {rootPosts.length === 0
                      ? <p className="text-[11px] text-muted-foreground text-center py-4">No posts yet. Start the conversation!</p>
                      : rootPosts.map((p: any) => (
                          <PostItem key={p.id} post={p} allPosts={thread.discussion_posts ?? []}
                            profiles={profiles} onReply={handleReplyClick} />
                        ))
                    }
                  </div>
                </div>
              );
            })()
          ) : threads.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-xs text-muted-foreground">No discussions yet.</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Start a conversation below!</p>
            </div>
          ) : (
            threads.map((t: any) => (
              <button
                key={t.id}
                onClick={() => setExpanded(t.id)}
                aria-label={`Open thread: ${t.title}`}
                className="w-full text-left p-3 rounded-lg bg-muted/40 border border-border/30 hover:bg-muted/70 transition-colors"
              >
                <p className="text-[12px] font-medium text-foreground line-clamp-2">{t.title}</p>
                <div className="flex items-center justify-between mt-1.5 text-[9px] text-muted-foreground">
                  <span>{(t.discussion_posts ?? []).length} posts</span>
                  <span>{formatDistanceToNow(new Date(t.last_activity_at), { addSuffix: true })}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Compose area */}
      <div className="p-3 border-t border-border/50 space-y-2 shrink-0">
        {expandedThread ? (
          <>
            {replyingTo && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary/40 px-2 py-1 rounded">
                <Reply className="w-3 h-3" /> Replying to a post
                <button onClick={() => setReplyingTo(null)} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="Cancel reply">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <Textarea
              ref={textRef}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder={replyingTo ? "Write a reply…" : "Add to the discussion…"}
              className="text-xs min-h-[50px] resize-none"
              aria-label="Write a reply or comment"
              onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleReply(); }}
            />
            <Button size="sm" className="w-full text-xs gap-1"
              disabled={!replyText.trim() || replyMutation.isPending} onClick={handleReply}
              aria-label="Post reply"
            >
              {replyMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {replyingTo ? "Reply" : "Post"}
            </Button>
          </>
        ) : (
          <>
            <Textarea
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
              placeholder="Start a new discussion…"
              className="text-xs min-h-[50px] resize-none"
              aria-label="Start a new discussion"
              onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handlePostThread(); }}
            />
            <Button size="sm" className="w-full text-xs gap-1"
              disabled={!newPost.trim() || createThread.isPending} onClick={handlePostThread}
              aria-label="Post new discussion"
            >
              {createThread.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              New Thread
            </Button>
          </>
        )}
        <p className="text-[9px] text-muted-foreground text-center">Ctrl+Enter to post</p>
      </div>
    </div>
  );
}
