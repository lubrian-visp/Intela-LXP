import { useState } from "react";
import { Plus, FileText, Edit2, Trash2, Copy, Eye, Globe, Search, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useCmsPages, useCmsPageMutations, CmsPage } from "@/hooks/useDesignManager";
import { DesignManagerPageEditor } from "./DesignManagerPageEditor";
import { format } from "date-fns";

export function DesignManagerPagesTab() {
  const { data: pages = [], isLoading } = useCmsPages();
  const { createPage, updatePage, deletePage, duplicatePage } = useCmsPageMutations();

  const [showCreate, setShowCreate] = useState(false);
  const [editingPage, setEditingPage] = useState<CmsPage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageForm, setPageForm] = useState({
    title: "", slug: "", description: "", meta_title: "", meta_description: "",
  });

  const handleCreate = () => {
    if (!pageForm.title) return;
    createPage.mutate({
      title: pageForm.title,
      slug: pageForm.slug || pageForm.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      description: pageForm.description || null,
      meta_title: pageForm.meta_title || null,
      meta_description: pageForm.meta_description || null,
    });
    setPageForm({ title: "", slug: "", description: "", meta_title: "", meta_description: "" });
    setShowCreate(false);
  };

  const filteredPages = searchQuery
    ? pages.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.slug.includes(searchQuery.toLowerCase()))
    : pages;

  // If editing a page, show the block editor
  if (editingPage) {
    return (
      <DesignManagerPageEditor
        page={editingPage}
        onBack={() => setEditingPage(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Create Page
        </Button>
      </div>

      {filteredPages.length === 0 && (
        <div className="bg-card rounded-xl border border-border/50 p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No pages found. Create your first custom page.</p>
        </div>
      )}

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredPages.map(page => (
          <StaggerItem key={page.id}>
            <div className="bg-card rounded-xl border border-border/50 shadow-card p-5 hover:shadow-md hover:border-accent/20 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {page.is_homepage && (
                    <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">Homepage</Badge>
                  )}
                  <Badge variant="outline" className={cn("text-[10px]", page.is_published ? "bg-success/10 text-success border-success/20" : "bg-muted")}>
                    {page.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{page.title}</h3>
              <p className="text-[11px] text-muted-foreground mb-1">/{page.slug}</p>
              {page.description && <p className="text-[11px] text-muted-foreground line-clamp-2">{page.description}</p>}
              <p className="text-[10px] text-muted-foreground mt-2">
                Created {format(new Date(page.created_at), "dd MMM yyyy")}
              </p>

              <div className="flex items-center gap-1 mt-4 pt-3 border-t border-border/30">
                <Button variant="ghost" size="sm" className="text-xs flex-1" onClick={() => setEditingPage(page)}>
                  <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => duplicatePage.mutate(page.id)}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => updatePage.mutate({ id: page.id, is_published: !page.is_published })}>
                  {page.is_published ? <Eye className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => deletePage.mutate(page.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Create Page Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={pageForm.title} onChange={e => setPageForm(f => ({ ...f, title: e.target.value }))} placeholder="Page title" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={pageForm.slug} onChange={e => setPageForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={pageForm.description} onChange={e => setPageForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" rows={2} />
            </div>
            <div>
              <Label>Meta Title (SEO)</Label>
              <Input value={pageForm.meta_title} onChange={e => setPageForm(f => ({ ...f, meta_title: e.target.value }))} placeholder="SEO title" />
            </div>
            <div>
              <Label>Meta Description (SEO)</Label>
              <Textarea value={pageForm.meta_description} onChange={e => setPageForm(f => ({ ...f, meta_description: e.target.value }))} placeholder="SEO description" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!pageForm.title}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
