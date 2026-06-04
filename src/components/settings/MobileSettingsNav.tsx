import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface SettingsItem {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  group: string;
  adminOnly?: boolean;
}

interface GroupConfig {
  color: string;
  bgLight: string;
  border: string;
}

interface MobileSettingsNavProps {
  items: SettingsItem[];
  groupedItems: Record<string, SettingsItem[]>;
  groupOrder: string[];
  groupConfig: Record<string, GroupConfig>;
  activeSection: string;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeLabel?: string;
}

export default function MobileSettingsNav({
  items,
  groupedItems,
  groupOrder,
  groupConfig,
  activeSection,
  onSelect,
  searchQuery,
  onSearchChange,
  activeLabel,
}: MobileSettingsNavProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <div className="lg:hidden mb-4">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full justify-between text-sm h-10">
            <span className="truncate">{activeLabel || "Select section"}</span>
            <ChevronDown className="w-4 h-4 shrink-0 ml-2" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-2xl p-4">
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search settings…"
              className="h-9 pl-8 text-xs bg-secondary/30 border-border/30"
            />
          </div>

          {/* Groups */}
          <div className="space-y-1">
            {groupOrder.map((group) => {
              const groupItems = groupedItems[group];
              if (!groupItems || groupItems.length === 0) return null;
              const gc = groupConfig[group] || groupConfig["Account"];

              return (
                <div key={group}>
                  <p className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-1.5", gc.color)}>
                    {group}
                  </p>
                  {groupItems.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.id)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors mb-0.5",
                          isActive
                            ? cn(gc.bgLight, "border", gc.border)
                            : "hover:bg-secondary/50 border border-transparent"
                        )}
                      >
                        <item.icon className={cn("w-4 h-4 shrink-0", isActive ? gc.color : "text-muted-foreground")} />
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-sm font-medium truncate", isActive ? "text-foreground" : "text-muted-foreground")}>
                            {item.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 truncate">{item.description}</p>
                        </div>
                        {isActive && <ChevronRight className={cn("w-3.5 h-3.5 shrink-0", gc.color)} />}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {items.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No settings match your search</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
