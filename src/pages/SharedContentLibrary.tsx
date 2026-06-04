import { useState } from "react";
import { Library, Plus, Search, Tag, Link2, Unlink, History, Eye, Edit2, Trash2, Share2, Loader2, FileText, HelpCircle, Video, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  useSharedContentItems, useCreateSharedContent, useUpdateSharedContent,
  useDeleteSharedContent, useSharedContentVersions, useSharedContentUsage,
  type SharedContentItem,
} from "@/hooks/useSharedContentLibrary";

const CONTENT_TYPE_ICONS: Record<string, typeof FileText> = {
  lesson: BookOpen,
  quiz: HelpCircle,
  content_block: FileText,
  topic: Tag,
  resource: Video,
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  lesson: "Lesson",
  quiz: "Quiz",
  content_block: "Content Block",
  topic: "Topic",
  resource: "Resource",
};

export default function SharedContentLibrary() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SharedContentItem | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [showUsage, setShowUsage] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    title: "", description: "", content_type: "lesson", tags: "",
  });

  const { data: items = [], isLoading } = useSharedContentItems(statusFilter);
  const createMutation = useCreateSharedContent();
  const updateMutation = useUpdateSharedContent();
  const deleteMutation = useDeleteSharedContent();
  const { data: versions = [] } = useSharedContentVersions(showVersions ? selectedItem?.id ?? null : null);
  const { data: usage = [] } = useSharedContentUsage(showUsage ? selectedItem?.id ?? null : null);

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q) || item.tags?.some(t => t.toLowerCase().includes(q));
  });

  const handleCreate = () => {
    if (!createForm.title.trim()) return;
    createMutation.mutate({
      title: createForm.title,
      description: createForm.description || null,
      content_type: createForm.content_type,
      tags: createForm.tags.split(",").map(t => t.trim()).filter(Boolean),
      status: "draft",
      content: {},
    }, {
      onSuccess: () => {
        setShowCreate(false);
        setCreateForm({ title: "", description: "", content_type: "lesson", tags: "" });
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Library className="w-5 h-5 text-accent" />
            Shared Content Library
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Reusable lessons, quizzes, and content blocks across programmes</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Shared Content
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search content..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-10 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-card rounded-xl border border-border/50 p-12 text-center">
          <Library className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Shared Content</h3>
          <p className="text-sm text-muted-foreground mb-4">Create reusable content blocks that can be linked across multiple programmes.</p>
          <Button onClick={() => setShowCreate(true)} className="gap-1.5"><Plus className="w-4 h-4" /> Create First Item</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const Icon = CONTENT_TYPE_ICONS[item.content_type] || FileText;
            return (
              <div key={item.id} className="bg-card rounded-xl border border-border/50 hover:border-accent/30 transition-all overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">{item.title}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{item.description || "No description"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant={item.status === "published" ? "default" : "secondary"} className="text-[10px]">
                      {item.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{CONTENT_TYPE_LABELS[item.content_type]}</span>
                    <span className="text-[10px] text-muted-foreground">v{item.version}</span>
                    {item.tags?.slice(0, 2).map(t => (
                      <span key={t} className="text-[9px] bg-secondary/60 px-1.5 py-0.5 rounded text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="px-4 py-2 bg-secondary/20 border-t border-border/30 flex items-center gap-2">
                  <button onClick={() => { setSelectedItem(item); setShowUsage(true); }} className="text-[11px] text-accent hover:underline flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Usage
                  </button>
                  <span className="text-border">·</span>
                  <button onClick={() => { setSelectedItem(item); setShowVersions(true); }} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <History className="w-3 h-3" /> History
                  </button>
                  <span className="text-border">·</span>
                  <button
                    onClick={() => updateMutation.mutate({ id: item.id, status: item.status === "published" ? "draft" : "published" })}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {item.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <span className="text-border">·</span>
                  <button onClick={() => setDeletingId(item.id)} className="text-[11px] text-destructive hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Shared Content</DialogTitle>
            <DialogDescription>Create a reusable content item for your content library</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Title *</Label>
              <Input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} placeholder="Introduction to Safety" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Brief description..." rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Content Type</Label>
              <Select value={createForm.content_type} onValueChange={(v) => setCreateForm({ ...createForm, content_type: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lesson">Lesson</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="content_block">Content Block</SelectItem>
                  <SelectItem value="topic">Topic</SelectItem>
                  <SelectItem value="resource">Resource</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tags (comma-separated)</Label>
              <Input value={createForm.tags} onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })} placeholder="safety, compliance, onboarding" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending || !createForm.title.trim()}>
              {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage Dialog */}
      <Dialog open={showUsage} onOpenChange={(o) => { setShowUsage(o); if (!o) setSelectedItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Share2 className="w-4 h-4 text-accent" /> Content Usage</DialogTitle>
            <DialogDescription>Programmes using "{selectedItem?.title}"</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-64">
            {usage.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Not linked to any programmes yet.</p>
            ) : (
              <div className="space-y-2">
                {usage.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <span className="text-sm text-foreground">{u.programmes?.title || "Unknown Programme"}</span>
                    <Badge variant="outline" className="text-[10px]">Position {u.position}</Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showVersions} onOpenChange={(o) => { setShowVersions(o); if (!o) setSelectedItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="w-4 h-4 text-accent" /> Version History</DialogTitle>
            <DialogDescription>Change history for "{selectedItem?.title}"</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-64">
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No version history yet.</p>
            ) : (
              <div className="space-y-2">
                {versions.map((v) => (
                  <div key={v.id} className="p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Version {v.version_number}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                    </div>
                    {v.change_reason && <p className="text-[11px] text-muted-foreground mt-1">{v.change_reason}</p>}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shared Content?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the content and unlink it from all programmes. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deletingId) deleteMutation.mutate(deletingId); setDeletingId(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
