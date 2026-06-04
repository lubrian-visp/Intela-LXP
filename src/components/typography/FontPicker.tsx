import { useState, useMemo, useEffect } from "react";
import { Search, Star, StarOff, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFontLibrary, useToggleFavoriteFont, useFavoriteFonts, loadGoogleFont, FONT_CATEGORIES, type FontEntry } from "@/hooks/useTypographyManager";

interface FontPickerProps {
  value: string;
  onChange: (family: string, source: string) => void;
}

export default function FontPicker({ value, onChange }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const { data: allFonts = [] } = useFontLibrary(
    activeTab !== "all" && activeTab !== "favorites" ? activeTab : undefined,
    categoryFilter || undefined,
    search || undefined
  );
  const { data: favFonts = [] } = useFavoriteFonts();
  const toggleFav = useToggleFavoriteFont();

  const fonts = useMemo(() => {
    if (activeTab === "favorites") return favFonts;
    return allFonts;
  }, [activeTab, allFonts, favFonts]);

  // Load fonts for preview
  useEffect(() => {
    fonts.slice(0, 20).forEach((f) => {
      if (f.font_source === "google") {
        loadGoogleFont(f.family_name, ["400"]);
      }
    });
  }, [fonts]);

  const tabs = [
    { key: "all", label: "All" },
    { key: "google", label: "Google" },
    { key: "custom", label: "Custom" },
    { key: "system", label: "System" },
    { key: "favorites", label: "★ Favorites" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between h-10 text-sm font-normal"
          style={{ fontFamily: value }}
        >
          <span className="truncate">{value || "Select font…"}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start">
        {/* Tabs */}
        <div className="flex border-b border-border overflow-x-auto px-2 pt-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setCategoryFilter(""); }}
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search + Category */}
        <div className="p-2 space-y-2 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fonts by name…"
              className="h-8 pl-8 text-xs"
            />
          </div>
          {activeTab !== "favorites" && (
            <div className="flex gap-1 flex-wrap">
              <Badge
                variant={categoryFilter === "" ? "default" : "outline"}
                className="cursor-pointer text-[10px] px-2 py-0.5"
                onClick={() => setCategoryFilter("")}
              >
                All
              </Badge>
              {FONT_CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant={categoryFilter === cat ? "default" : "outline"}
                  className="cursor-pointer text-[10px] px-2 py-0.5 capitalize"
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Font List */}
        <ScrollArea className="h-[280px]">
          <div className="p-1">
            {fonts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No fonts found</p>
            ) : (
              fonts.map((font) => (
                <button
                  key={font.id}
                  onClick={() => {
                    onChange(font.family_name, font.font_source);
                    if (font.font_source === "google") loadGoogleFont(font.family_name, font.variants.slice(0, 4));
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left hover:bg-secondary/50 transition-colors ${
                    value === font.family_name ? "bg-accent/10 border border-accent/20" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ fontFamily: `'${font.family_name}', ${font.category}` }}
                    >
                      {font.family_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {font.font_source} · {font.category} · {font.variants.length} weights
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFav.mutate({ id: font.id, is_favorite: !font.is_favorite });
                    }}
                    className="p-1 hover:bg-secondary rounded"
                  >
                    {font.is_favorite ? (
                      <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                    ) : (
                      <StarOff className="w-3.5 h-3.5 text-muted-foreground/50" />
                    )}
                  </button>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Font count */}
        <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/50">
          {fonts.length} fonts available
        </div>
      </PopoverContent>
    </Popover>
  );
}
