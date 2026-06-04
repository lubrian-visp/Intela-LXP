import { useCmsPages } from "@/hooks/useDesignManager";
import { DesignManagerPageEditor } from "./DesignManagerPageEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layout, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsPageMutations } from "@/hooks/useDesignManager";

export function DesignManagerFrontpageTab() {
  const { data: pages = [], isLoading } = useCmsPages();
  const { updatePage, createPage } = useCmsPageMutations();

  const homepage = pages.find(p => p.is_homepage);

  if (isLoading) {
    return <Skeleton className="h-40 rounded-xl" />;
  }

  if (!homepage) {
    return (
      <div className="bg-card rounded-xl border-2 border-dashed border-border p-12 text-center">
        <Layout className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-sm font-semibold text-foreground mb-2">No Homepage Set</h3>
        <p className="text-[11px] text-muted-foreground mb-4 max-w-md mx-auto">
          Create a page and mark it as the homepage, or designate an existing page.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button size="sm" onClick={() => {
            createPage.mutate({
              title: "Homepage",
              slug: "home",
              description: "Platform homepage",
              is_homepage: true,
              is_published: true,
            });
          }}>
            Create Homepage
          </Button>
          {pages.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => {
              updatePage.mutate({ id: pages[0].id, is_homepage: true });
            }}>
              Set "{pages[0].title}" as Homepage
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border/50 shadow-card p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Layout className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Frontpage: {homepage.title}</h3>
          <p className="text-[11px] text-muted-foreground">/{homepage.slug}</p>
        </div>
        <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
          {homepage.is_published ? "Published" : "Draft"}
        </Badge>
      </div>

      <DesignManagerPageEditor page={homepage} onBack={() => {}} />
    </div>
  );
}
