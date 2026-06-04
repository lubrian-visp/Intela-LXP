import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserGeneratedContent, useCreateUGC, useUpdateUGC } from "@/hooks/useLxpData";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Search, FileText, Video, BookOpen, Mic, Eye, Clock, CheckCircle2, AlertTriangle, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const CONTENT_TYPES = [
  { value: "document", label: "Document", icon: FileText },
  { value: "video", label: "Video", icon: Video },
  { value: "micro_lesson", label: "Micro-Lesson", icon: BookOpen },
  { value: "article", label: "Article", icon: FileText },
  { value: "podcast", label: "Podcast", icon: Mic },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-secondary text-muted-foreground", icon: Clock },
  review: { label: "Under Review", color: "bg-warning/10 text-warning", icon: Eye },
  approved: { label: "Approved", color: "bg-primary/10 text-primary", icon: CheckCircle2 },
  published: { label: "Published", color: "bg-success/10 text-success", icon: CheckCircle2 },
};

export default function ContentContributions() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("my");
  const [search, setSearch] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [formData, setFormData] = useState({
    title: "", description: "", content_type: "document", content_url: "", tags: "",
  });

  const { data: myContent = [], isLoading: myLoading } = useUserGeneratedContent({ authorId: user?.id });
  const { data: publishedContent = [], isLoading: pubLoading } = useUserGeneratedContent({ status: "published" });
  const { data: pendingContent = [], isLoading: pendLoading } = useUserGeneratedContent({ status: "pending" });
  const { data: reviewContent = [] } = useUserGeneratedContent({ status: "review" });
  const createUGC = useCreateUGC();
  const updateUGC = useUpdateUGC();

  const moderationQueue = [...pendingContent, ...reviewContent];

  const handleSubmit = async () => {
    if (!formData.title.trim() || !user?.id) return;
    try {
      await createUGC.mutateAsync({
        author_id: user.id,
        title: formData.title,
        description: formData.description || undefined,
        content_type: formData.content_type,
        content_url: formData.content_url || undefined,
        tags: formData.tags ? formData.tags.split(",").map(t => t.trim()) : [],
      });
      toast({ title: "Content submitted", description: "Your content will be reviewed by moderators." });
      setShowSubmit(false);
      setFormData({ title: "", description: "", content_type: "document", content_url: "", tags: "" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleModerate = async (id: string, status: string) => {
    try {
      await updateUGC.mutateAsync({
        id,
        status,
        moderated_by: user?.id,
        moderated_at: new Date().toISOString(),
        ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
      });
      toast({ title: `Content ${status}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const filterContent = (items: any[]) =>
    items.filter((c: any) => !search || c.title?.toLowerCase().includes(search.toLowerCase()));

  const renderContentCard = (item: any, showModActions = false) => {
    const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const TypeIcon = CONTENT_TYPES.find(t => t.value === item.content_type)?.icon || FileText;

    return (
      <Card key={item.id} className="hover:shadow-card-hover transition-all">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <TypeIcon className="w-4 h-4 text-primary shrink-0" />
              <h4 className="text-sm font-semibold text-foreground line-clamp-1">{item.title}</h4>
            </div>
            <Badge className={cn("text-[10px]", statusConf.color)}>{statusConf.label}</Badge>
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {(item.tags || []).slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
            ))}
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{format(new Date(item.created_at), "MMM dd, yyyy")}</span>
            {item.view_count > 0 && <span>{item.view_count} views</span>}
          </div>
          {showModActions && (item.status === "pending" || item.status === "review") && (
            <div className="flex gap-2 pt-2 border-t border-border">
              {item.status === "pending" && (
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleModerate(item.id, "review")}>
                  Start Review
                </Button>
              )}
              {item.status === "review" && (
                <>
                  <Button size="sm" variant="outline" className="flex-1 text-xs text-destructive" onClick={() => handleModerate(item.id, "pending")}>
                    Reject
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleModerate(item.id, "approved")}>
                    Approve
                  </Button>
                  <Button size="sm" className="flex-1 text-xs" onClick={() => handleModerate(item.id, "published")}>
                    Publish
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" /> Content Contributions
            </h1>
            <p className="text-sm text-muted-foreground">Submit, browse, and moderate user-generated learning content.</p>
          </div>
          <Button size="sm" onClick={() => setShowSubmit(true)}>
            <Plus className="w-4 h-4 mr-1" /> Submit Content
          </Button>
        </div>
      </FadeIn>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search content..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my">My Submissions ({myContent.length})</TabsTrigger>
          <TabsTrigger value="published">Published ({publishedContent.length})</TabsTrigger>
          <TabsTrigger value="moderate">Moderation ({moderationQueue.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-4">
          {myLoading ? <Skeleton className="h-48 rounded-xl" /> : filterContent(myContent).length === 0 ? (
            <Card><CardContent className="p-12 text-center">
              <Upload className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">No Submissions Yet</h3>
              <p className="text-xs text-muted-foreground">Submit your first piece of learning content.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterContent(myContent).map((item: any) => renderContentCard(item))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="published" className="mt-4">
          {pubLoading ? <Skeleton className="h-48 rounded-xl" /> : filterContent(publishedContent).length === 0 ? (
            <Card><CardContent className="p-12 text-center">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">No Published Content</h3>
              <p className="text-xs text-muted-foreground">Published user-generated content will appear here.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterContent(publishedContent).map((item: any) => renderContentCard(item))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="moderate" className="mt-4">
          {pendLoading ? <Skeleton className="h-48 rounded-xl" /> : moderationQueue.length === 0 ? (
            <Card><CardContent className="p-12 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">Queue Clear</h3>
              <p className="text-xs text-muted-foreground">No content awaiting moderation.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterContent(moderationQueue).map((item: any) => renderContentCard(item, true))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Submit Dialog */}
      <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Learning Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Title <span className="text-destructive">*</span></Label>
              <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Content title" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Content Type</Label>
              <Select value={formData.content_type} onValueChange={v => setFormData(p => ({ ...p, content_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Describe your content..." />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Content URL</Label>
              <Input value={formData.content_url} onChange={e => setFormData(p => ({ ...p, content_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tags (comma-separated)</Label>
              <Input value={formData.tags} onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))} placeholder="leadership, communication, ..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowSubmit(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={!formData.title.trim() || createUGC.isPending}>
              {createUGC.isPending ? "Submitting..." : "Submit for Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
