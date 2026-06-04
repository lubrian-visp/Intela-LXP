import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

interface Props {
  pageSlug?: string;
  pageId?: string;
}

export function CmsPageRenderer({ pageSlug, pageId }: Props) {
  const { data: page, isLoading: pageLoading } = useQuery({
    queryKey: ["cms-page-render", pageSlug, pageId],
    queryFn: async () => {
      let query = supabase.from("cms_pages").select("*");
      if (pageId) query = query.eq("id", pageId);
      else if (pageSlug) query = query.eq("slug", pageSlug);
      else query = query.eq("is_homepage", true);
      
      const { data, error } = await query.single();
      if (error) return null;
      return data;
    },
  });

  const { data: blocks = [], isLoading: blocksLoading } = useQuery({
    queryKey: ["cms-page-render-blocks", page?.id],
    queryFn: async () => {
      if (!page?.id) return [];
      const { data } = await supabase
        .from("cms_page_blocks")
        .select("*")
        .eq("page_id", page.id)
        .eq("is_visible", true)
        .order("sort_order");
      return data ?? [];
    },
    enabled: !!page?.id,
  });

  if (pageLoading || blocksLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Page not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {blocks.map((block: any) => (
        <RenderBlock key={block.id} block={block} />
      ))}
    </div>
  );
}

function RenderBlock({ block }: { block: any }) {
  const content = block.content || {};
  const config = block.config || {};

  switch (block.block_type) {
    case "text":
      return (
        <div className="max-w-4xl mx-auto px-6 py-6 prose prose-sm dark:prose-invert">
          <div dangerouslySetInnerHTML={{ __html: content.html || "" }} />
        </div>
      );

    case "html":
      return (
        <div className="max-w-4xl mx-auto px-6 py-6" dangerouslySetInnerHTML={{ __html: content.raw_html || "" }} />
      );

    case "hero":
      return (
        <div
          className="relative px-6 py-20 text-center bg-gradient-to-br from-primary/10 via-accent/5 to-background"
          style={content.bg_image ? { backgroundImage: `url(${content.bg_image})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
        >
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">{content.heading}</h1>
          {content.subheading && <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">{content.subheading}</p>}
          {content.cta_text && (
            <Link to={content.cta_url || "/"}>
              <Button size="lg">{content.cta_text}</Button>
            </Link>
          )}
        </div>
      );

    case "cta":
      return (
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <Link to={content.url || "/"}>
            <Button variant={content.variant === "outline" ? "outline" : content.variant === "secondary" ? "secondary" : "default"} size="lg">
              {content.text || "Click Here"}
            </Button>
          </Link>
        </div>
      );

    case "image":
      return (
        <div className="max-w-4xl mx-auto px-6 py-6">
          {content.url && <img src={content.url} alt={content.alt || ""} className="w-full rounded-xl" />}
          {content.caption && <p className="text-sm text-muted-foreground text-center mt-2">{content.caption}</p>}
        </div>
      );

    case "video":
      return (
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="aspect-video rounded-xl overflow-hidden bg-secondary">
            <iframe src={content.url} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
          </div>
        </div>
      );

    case "spacer":
      return <div style={{ height: content.height || 40 }} />;

    case "divider":
      return <hr className="max-w-4xl mx-auto border-border my-6" />;

    case "course_display":
    case "programme_display":
      return <ProgrammeDisplayBlock content={content} config={config} />;

    default:
      return null;
  }
}

// ─── Programme Display Block ────────────────────────────────────────

function ProgrammeDisplayBlock({ content, config }: { content: any; config: any }) {
  const { data: programmes = [], isLoading } = useQuery({
    queryKey: ["cms-programme-display", config],
    queryFn: async () => {
      let query = supabase.from("programmes").select("id, title, description, status, created_at, updated_at");

      if (config.source === "manual" && config.manual_ids?.length > 0) {
        query = query.in("id", config.manual_ids);
      } else {
        // Dynamic
        if (config.filter_status && config.filter_status !== "all") {
          query = query.eq("status", config.filter_status);
        }
      }

      if (config.sort_by === "created_at") {
        query = query.order("created_at", { ascending: false });
      } else if (config.sort_by === "updated_at") {
        query = query.order("updated_at", { ascending: false });
      } else {
        query = query.order("title");
      }

      if (config.max_items) {
        query = query.limit(config.max_items);
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        {content.title && <h2 className="text-xl font-bold text-foreground mb-6">{content.title}</h2>}
        <div className={cn("grid gap-4", config.display_mode === "list" ? "grid-cols-1" : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${config.columns || 3}`)}>
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const gridCols = config.display_mode === "list"
    ? "grid-cols-1"
    : config.columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : config.columns === 4
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {content.title && <h2 className="text-xl font-bold text-foreground mb-6">{content.title}</h2>}
      {programmes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No programmes to display.</p>
      ) : (
        <div className={cn("grid gap-4", gridCols)}>
          {programmes.map((prog: any) => (
            <Link key={prog.id} to={`/programmes`} className="block">
              <div className={cn(
                "bg-card rounded-xl border border-border/50 shadow-card hover:shadow-md hover:border-accent/20 transition-all overflow-hidden",
                config.display_mode === "list" ? "flex items-center gap-4 p-4" : "p-5"
              )}>
                {config.show_thumbnail && (
                  <div className={cn(
                    "bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center",
                    config.display_mode === "list" ? "w-16 h-16 rounded-lg shrink-0" : "w-full h-32 rounded-lg mb-3"
                  )}>
                    <span className="text-2xl">📚</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{prog.title}</h3>
                  {config.show_description && prog.description && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{prog.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium",
                      prog.status === "published" ? "bg-success/10 text-success" :
                      prog.status === "approved" ? "bg-primary/10 text-primary" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {prog.status}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
