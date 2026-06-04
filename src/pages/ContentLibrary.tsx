import { useState } from "react";
import { useExternalContentProviders, useExternalContentItems } from "@/hooks/useLxpData";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Search, Clock, BookOpen, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContentLibrary() {
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  const { data: providers = [], isLoading: provLoading } = useExternalContentProviders();
  const { data: items = [], isLoading: itemsLoading } = useExternalContentItems();
  const isLoading = provLoading || itemsLoading;

  const filtered = items.filter((item: any) => {
    if (providerFilter !== "all" && item.provider_id !== providerFilter) return false;
    if (difficultyFilter !== "all" && item.difficulty_level !== difficultyFilter) return false;
    if (search && !item.title?.toLowerCase().includes(search.toLowerCase()) && !item.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" /> Content Library
        </h1>
        <p className="text-sm text-muted-foreground">Browse curated learning content from external providers.</p>
      </FadeIn>

      {/* Provider Cards */}
      {!provLoading && providers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {providers.map((p: any) => (
            <Card key={p.id} className="hover:shadow-card-hover transition-all cursor-pointer" onClick={() => setProviderFilter(providerFilter === p.id ? "all" : p.id)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{p.provider_name}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {p.config?.description || "Learning provider"}
                  </p>
                </div>
                <Badge variant={p.api_key_configured ? "default" : "outline"} className="text-[10px] shrink-0">
                  {p.api_key_configured ? "Connected" : "Mock"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search content..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Provider" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {providers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.provider_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content Items */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Globe className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">No Content Found</h3>
            <p className="text-xs text-muted-foreground">Try adjusting your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item: any) => (
            <Card key={item.id} className="hover:shadow-card-hover transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground line-clamp-2">{item.title}</h4>
                  <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{item.difficulty_level}</Badge>
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{item.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {(item.tags || []).slice(0, 4).map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{item.external_content_providers?.provider_name}</Badge>
                    {item.duration_minutes && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.duration_minutes} min</span>
                    )}
                  </div>
                  {item.content_url && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(item.content_url, "_blank")}>
                      <ExternalLink className="w-3 h-3 mr-1" /> Open
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
