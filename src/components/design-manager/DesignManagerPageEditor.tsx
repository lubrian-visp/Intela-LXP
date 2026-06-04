import { useState } from "react";
import { ArrowLeft, Plus, GripVertical, Trash2, Eye, EyeOff, Type, Code, Image, Video, Layout, Columns, Minus, MousePointer, BookOpen, Settings2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsPageBlocks, useCmsPageBlockMutations, useCmsPageMutations, CmsPage, CmsPageBlock } from "@/hooks/useDesignManager";
import { CourseDisplayBlockConfig } from "./CourseDisplayBlockConfig";

const BLOCK_TYPES = [
  { type: "text", label: "Text / HTML", icon: Type, description: "Rich text content block" },
  { type: "html", label: "Raw HTML", icon: Code, description: "Custom HTML code block" },
  { type: "course_display", label: "Course Display", icon: BookOpen, description: "Show courses/programmes in grid or list" },
  { type: "programme_display", label: "Programme Display", icon: BookOpen, description: "Show programmes with filters" },
  { type: "hero", label: "Hero Section", icon: Layout, description: "Large banner with CTA" },
  { type: "cta", label: "Call to Action", icon: MousePointer, description: "Button or link block" },
  { type: "image", label: "Image", icon: Image, description: "Image with caption" },
  { type: "video", label: "Video Embed", icon: Video, description: "YouTube or Vimeo embed" },
  { type: "spacer", label: "Spacer", icon: Minus, description: "Vertical spacing" },
  { type: "divider", label: "Divider", icon: Minus, description: "Horizontal line separator" },
];

interface Props {
  page: CmsPage;
  onBack: () => void;
}

export function DesignManagerPageEditor({ page, onBack }: Props) {
  const { data: blocks = [], isLoading } = useCmsPageBlocks(page.id);
  const { createBlock, updateBlock, deleteBlock, reorderBlocks } = useCmsPageBlockMutations();
  const { updatePage } = useCmsPageMutations();

  const [showAddBlock, setShowAddBlock] = useState(false);
  const [editingBlock, setEditingBlock] = useState<CmsPageBlock | null>(null);
  const [showPageSettings, setShowPageSettings] = useState(false);
  const [pageSettings, setPageSettings] = useState({
    title: page.title,
    slug: page.slug,
    description: page.description || "",
    meta_title: page.meta_title || "",
    meta_description: page.meta_description || "",
    is_homepage: page.is_homepage,
  });

  const handleAddBlock = (blockType: string) => {
    createBlock.mutate({
      page_id: page.id,
      block_type: blockType,
      title: BLOCK_TYPES.find(b => b.type === blockType)?.label || blockType,
      content: getDefaultContent(blockType),
      config: getDefaultConfig(blockType),
      sort_order: blocks.length,
    });
    setShowAddBlock(false);
  };

  const getDefaultContent = (type: string) => {
    switch (type) {
      case "text": return { html: "<p>Enter your content here...</p>" };
      case "html": return { raw_html: "" };
      case "hero": return { heading: "Welcome", subheading: "Description here", cta_text: "Get Started", cta_url: "/" };
      case "cta": return { text: "Click here", url: "/", variant: "primary" };
      case "image": return { url: "", alt: "", caption: "" };
      case "video": return { url: "", provider: "youtube" };
      case "spacer": return { height: 40 };
      case "divider": return {};
      case "course_display":
      case "programme_display":
        return { title: "Our Programmes" };
      default: return {};
    }
  };

  const getDefaultConfig = (type: string) => {
    if (type === "course_display" || type === "programme_display") {
      return {
        display_mode: "grid",
        columns: 3,
        source: "dynamic",
        max_items: 6,
        sort_by: "title",
        show_thumbnail: true,
        show_description: true,
        show_instructor: false,
        manual_ids: [],
        filter_category: "",
        filter_status: "published",
      };
    }
    return {};
  };

  const handleSaveBlock = (block: CmsPageBlock, content: any, config: any, title: string) => {
    updateBlock.mutate({ id: block.id, content, config, title });
    setEditingBlock(null);
  };

  const handleSavePageSettings = () => {
    updatePage.mutate({
      id: page.id,
      title: pageSettings.title,
      slug: pageSettings.slug,
      description: pageSettings.description || null,
      meta_title: pageSettings.meta_title || null,
      meta_description: pageSettings.meta_description || null,
      is_homepage: pageSettings.is_homepage,
    });
    setShowPageSettings(false);
  };

  const moveBlock = (blockId: string, direction: "up" | "down") => {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;

    const newOrder = blocks.map((b, i) => ({
      id: b.id,
      sort_order: i === idx ? targetIdx : i === targetIdx ? idx : i,
    }));
    reorderBlocks.mutate(newOrder);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">{page.title}</h2>
          <p className="text-[11px] text-muted-foreground">/{page.slug}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPageSettings(true)}>
          <Settings2 className="w-3.5 h-3.5 mr-1" /> Page Settings
        </Button>
        <Button size="sm" onClick={() => updatePage.mutate({ id: page.id, is_published: !page.is_published })}>
          {page.is_published ? "Unpublish" : "Publish"}
        </Button>
      </div>

      {/* Blocks */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.length === 0 && (
            <div className="bg-card rounded-xl border-2 border-dashed border-border p-12 text-center">
              <Layout className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">No blocks yet. Start building your page.</p>
              <Button size="sm" onClick={() => setShowAddBlock(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add First Block
              </Button>
            </div>
          )}

          {blocks.map((block, idx) => (
            <div key={block.id} className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden group hover:border-accent/20 transition-all">
              <div className="flex items-center gap-3 px-4 py-3">
                <GripVertical className="w-4 h-4 text-muted-foreground/30 cursor-grab" />
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  {(() => {
                    const bt = BLOCK_TYPES.find(b => b.type === block.block_type);
                    return bt ? <bt.icon className="w-4 h-4 text-muted-foreground" /> : <Type className="w-4 h-4 text-muted-foreground" />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{block.title || block.block_type}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{block.block_type.replace(/_/g, " ")}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {idx > 0 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveBlock(block.id, "up")}>↑</Button>
                  )}
                  {idx < blocks.length - 1 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveBlock(block.id, "down")}>↓</Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingBlock(block)}>
                    <Settings2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateBlock.mutate({ id: block.id, is_visible: !block.is_visible })}>
                    {block.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteBlock.mutate(block.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>

              {/* Block Preview */}
              <div className="px-4 pb-3">
                <BlockPreview block={block} />
              </div>
            </div>
          ))}

          {blocks.length > 0 && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setShowAddBlock(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Block
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add Block Dialog */}
      <Dialog open={showAddBlock} onOpenChange={setShowAddBlock}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Content Block</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto">
            {BLOCK_TYPES.map(bt => (
              <button
                key={bt.type}
                onClick={() => handleAddBlock(bt.type)}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-accent/30 hover:bg-secondary/20 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <bt.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{bt.label}</p>
                  <p className="text-[10px] text-muted-foreground">{bt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Block Dialog */}
      {editingBlock && (
        <BlockEditor
          block={editingBlock}
          onSave={handleSaveBlock}
          onCancel={() => setEditingBlock(null)}
        />
      )}

      {/* Page Settings Dialog */}
      <Dialog open={showPageSettings} onOpenChange={setShowPageSettings}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Page Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={pageSettings.title} onChange={e => setPageSettings(s => ({ ...s, title: e.target.value }))} /></div>
            <div><Label>Slug</Label><Input value={pageSettings.slug} onChange={e => setPageSettings(s => ({ ...s, slug: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={pageSettings.description} onChange={e => setPageSettings(s => ({ ...s, description: e.target.value }))} rows={2} /></div>
            <div><Label>Meta Title (SEO)</Label><Input value={pageSettings.meta_title} onChange={e => setPageSettings(s => ({ ...s, meta_title: e.target.value }))} /></div>
            <div><Label>Meta Description</Label><Textarea value={pageSettings.meta_description} onChange={e => setPageSettings(s => ({ ...s, meta_description: e.target.value }))} rows={2} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={pageSettings.is_homepage} onCheckedChange={v => setPageSettings(s => ({ ...s, is_homepage: v }))} />
              <Label>Set as Homepage</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPageSettings(false)}>Cancel</Button>
            <Button onClick={handleSavePageSettings}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Block Preview ──────────────────────────────────────────────────

function BlockPreview({ block }: { block: CmsPageBlock }) {
  const content = block.content || {};
  const config = block.config || {};

  switch (block.block_type) {
    case "text":
      return (
        <div className="bg-secondary/20 rounded-lg p-3 text-xs text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content.html || "<em>Empty text block</em>" }} />
      );
    case "html":
      return (
        <div className="bg-secondary/20 rounded-lg p-3">
          <code className="text-[10px] text-muted-foreground">{(content.raw_html || "").substring(0, 100) || "Empty HTML block"}</code>
        </div>
      );
    case "hero":
      return (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 text-center">
          <p className="text-sm font-bold text-foreground">{content.heading || "Hero Heading"}</p>
          <p className="text-[11px] text-muted-foreground">{content.subheading}</p>
          {content.cta_text && <Badge className="mt-2 text-[10px]">{content.cta_text}</Badge>}
        </div>
      );
    case "cta":
      return (
        <div className="bg-secondary/20 rounded-lg p-3 flex items-center gap-2">
          <Badge>{content.text || "CTA"}</Badge>
          <span className="text-[10px] text-muted-foreground">→ {content.url}</span>
        </div>
      );
    case "course_display":
    case "programme_display":
      return (
        <div className="bg-secondary/20 rounded-lg p-3">
          <p className="text-xs font-medium text-foreground mb-1">{content.title || "Course Display"}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px]">{config.display_mode || "grid"}</Badge>
            <Badge variant="outline" className="text-[10px]">{config.columns || 3} columns</Badge>
            <Badge variant="outline" className="text-[10px]">{config.source || "dynamic"}</Badge>
            <Badge variant="outline" className="text-[10px]">max {config.max_items || 6}</Badge>
          </div>
        </div>
      );
    case "spacer":
      return <div className="bg-secondary/20 rounded-lg p-2 text-center text-[10px] text-muted-foreground">Spacer ({content.height || 40}px)</div>;
    case "divider":
      return <hr className="border-border" />;
    case "image":
      return (
        <div className="bg-secondary/20 rounded-lg p-3 text-xs text-muted-foreground">
          {content.url ? <img src={content.url} alt={content.alt} className="max-h-20 rounded" /> : "No image set"}
        </div>
      );
    case "video":
      return (
        <div className="bg-secondary/20 rounded-lg p-3 text-xs text-muted-foreground">
          Video: {content.url || "No URL set"}
        </div>
      );
    default:
      return <div className="bg-secondary/20 rounded-lg p-3 text-xs text-muted-foreground">Unknown block type</div>;
  }
}

// ─── Block Editor ───────────────────────────────────────────────────

function BlockEditor({ block, onSave, onCancel }: {
  block: CmsPageBlock;
  onSave: (block: CmsPageBlock, content: any, config: any, title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(block.title || "");
  const [content, setContent] = useState(block.content || {});
  const [config, setConfig] = useState(block.config || {});

  const updateContent = (key: string, value: any) => setContent((c: any) => ({ ...c, [key]: value }));
  const updateConfig = (key: string, value: any) => setConfig((c: any) => ({ ...c, [key]: value }));

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Block: {block.block_type.replace(/_/g, " ")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Block Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {/* Type-specific editors */}
          {block.block_type === "text" && (
            <div>
              <Label>HTML Content</Label>
              <Textarea value={content.html || ""} onChange={e => updateContent("html", e.target.value)} rows={8} className="font-mono text-xs" />
            </div>
          )}

          {block.block_type === "html" && (
            <div>
              <Label>Raw HTML</Label>
              <Textarea value={content.raw_html || ""} onChange={e => updateContent("raw_html", e.target.value)} rows={10} className="font-mono text-xs" />
            </div>
          )}

          {block.block_type === "hero" && (
            <>
              <div><Label>Heading</Label><Input value={content.heading || ""} onChange={e => updateContent("heading", e.target.value)} /></div>
              <div><Label>Subheading</Label><Input value={content.subheading || ""} onChange={e => updateContent("subheading", e.target.value)} /></div>
              <div><Label>CTA Text</Label><Input value={content.cta_text || ""} onChange={e => updateContent("cta_text", e.target.value)} /></div>
              <div><Label>CTA URL</Label><Input value={content.cta_url || ""} onChange={e => updateContent("cta_url", e.target.value)} /></div>
              <div><Label>Background Image URL</Label><Input value={content.bg_image || ""} onChange={e => updateContent("bg_image", e.target.value)} /></div>
            </>
          )}

          {block.block_type === "cta" && (
            <>
              <div><Label>Button Text</Label><Input value={content.text || ""} onChange={e => updateContent("text", e.target.value)} /></div>
              <div><Label>URL</Label><Input value={content.url || ""} onChange={e => updateContent("url", e.target.value)} /></div>
              <div>
                <Label>Variant</Label>
                <Select value={content.variant || "primary"} onValueChange={v => updateContent("variant", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="outline">Outline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {block.block_type === "image" && (
            <>
              <div><Label>Image URL</Label><Input value={content.url || ""} onChange={e => updateContent("url", e.target.value)} /></div>
              <div><Label>Alt Text</Label><Input value={content.alt || ""} onChange={e => updateContent("alt", e.target.value)} /></div>
              <div><Label>Caption</Label><Input value={content.caption || ""} onChange={e => updateContent("caption", e.target.value)} /></div>
            </>
          )}

          {block.block_type === "video" && (
            <>
              <div><Label>Video URL</Label><Input value={content.url || ""} onChange={e => updateContent("url", e.target.value)} placeholder="YouTube or Vimeo URL" /></div>
            </>
          )}

          {block.block_type === "spacer" && (
            <div><Label>Height (px)</Label><Input type="number" value={content.height || 40} onChange={e => updateContent("height", parseInt(e.target.value))} /></div>
          )}

          {(block.block_type === "course_display" || block.block_type === "programme_display") && (
            <CourseDisplayBlockConfig
              content={content}
              config={config}
              onContentChange={updateContent}
              onConfigChange={updateConfig}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(block, content, config, title)}>
            <Save className="w-3.5 h-3.5 mr-1" /> Save Block
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
