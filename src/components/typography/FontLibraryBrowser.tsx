import { useState, useEffect } from "react";
import { Search, Star, StarOff, Trash2, Eye, Grid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useFontLibrary,
  useToggleFavoriteFont,
  useDeleteFont,
  loadGoogleFont,
  FONT_CATEGORIES,
  type FontEntry,
} from "@/hooks/useTypographyManager";

interface FontLibraryBrowserProps {
  source: "google" | "custom" | "system";
}

export default function FontLibraryBrowser({ source }: FontLibraryBrowserProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewText, setPreviewText] = useState("The quick brown fox jumps over the lazy dog");
  const [previewSize, setPreviewSize] = useState(24);

  const { data: fonts = [], isLoading } = useFontLibrary(source, category || undefined, search || undefined);
  const toggleFav = useToggleFavoriteFont();
  const deleteFont = useDeleteFont();

  // Load Google fonts for preview
  useEffect(() => {
    if (source === "google") {
      fonts.slice(0, 30).forEach((f) => loadGoogleFont(f.family_name, ["400"]));
    }
  }, [fonts, source]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fonts by name…"
            className="h-9 pl-8 text-xs"
          />
        </div>
        <div className="flex gap-1">
          <Badge
            variant={category === "" ? "default" : "outline"}
            className="cursor-pointer text-[10px] px-2 py-0.5"
            onClick={() => setCategory("")}
          >
            All
          </Badge>
          {FONT_CATEGORIES.map((c) => (
            <Badge
              key={c}
              variant={category === c ? "default" : "outline"}
              className="cursor-pointer text-[10px] px-2 py-0.5 capitalize"
              onClick={() => setCategory(c)}
            >
              {c}
            </Badge>
          ))}
        </div>
        <div className="flex gap-1">
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => setViewMode("grid")}>
            <Grid className="w-3.5 h-3.5" />
          </Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => setViewMode("list")}>
            <List className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Preview text controls */}
      <div className="flex gap-3 items-center">
        <Input
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          placeholder="Preview text"
          className="h-8 text-xs flex-1"
        />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Size:</span>
          <input
            type="range"
            min="12"
            max="48"
            value={previewSize}
            onChange={(e) => setPreviewSize(Number(e.target.value))}
            className="w-20"
          />
          <span className="w-8">{previewSize}px</span>
        </div>
      </div>

      {/* Font count */}
      <p className="text-[11px] text-muted-foreground">{fonts.length} fonts available</p>

      {/* Font Grid/List */}
      <ScrollArea className="h-[calc(100vh-28rem)]">
        <div className={viewMode === "grid" ? "grid grid-cols-2 xl:grid-cols-3 gap-3" : "space-y-2"}>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-24" />
              </Card>
            ))
          ) : fonts.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full text-center py-12">
              {source === "custom" ? "No custom fonts uploaded yet" : "No fonts found"}
            </p>
          ) : (
            fonts.map((font) => (
              <Card key={font.id} className="group hover:shadow-md transition-shadow border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-semibold">{font.family_name}</h4>
                      <div className="flex gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize">{font.category}</Badge>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">{font.variants.length} weights</Badge>
                        {font.font_source === "custom" && font.license_type && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">{font.license_type}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleFav.mutate({ id: font.id, is_favorite: !font.is_favorite })}
                        className="p-1 hover:bg-secondary rounded"
                      >
                        {font.is_favorite ? (
                          <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                        ) : (
                          <StarOff className="w-3.5 h-3.5 text-muted-foreground/50" />
                        )}
                      </button>
                      {font.font_source === "custom" && (
                        <button
                          onClick={() => deleteFont.mutate(font.id)}
                          className="p-1 hover:bg-destructive/10 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive/60" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p
                    className="text-foreground mt-2 truncate"
                    style={{
                      fontFamily: `'${font.family_name}', ${font.category}`,
                      fontSize: `${previewSize}px`,
                      lineHeight: 1.3,
                    }}
                  >
                    {previewText}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
