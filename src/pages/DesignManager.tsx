import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Palette, Menu as MenuIcon, FileText, Layout, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { DesignManagerMenusTab } from "@/components/design-manager/DesignManagerMenusTab";
import { DesignManagerPagesTab } from "@/components/design-manager/DesignManagerPagesTab";
import { DesignManagerFrontpageTab } from "@/components/design-manager/DesignManagerFrontpageTab";

type DesignTab = "menus" | "pages" | "frontpage";

export default function DesignManager() {
  usePageTitle("Design Manager", "Super Admin");
  const [activeTab, setActiveTab] = useState<DesignTab>("menus");

  const tabs: { key: DesignTab; label: string; icon: any }[] = [
    { key: "menus", label: "Menus", icon: MenuIcon },
    { key: "pages", label: "Pages", icon: FileText },
    { key: "frontpage", label: "Frontpage", icon: Layout },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <FadeIn>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Palette className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Design Manager</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage menus, pages, content blocks, and role visibility.
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-colors",
              activeTab === t.key
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "menus" && <DesignManagerMenusTab />}
      {activeTab === "pages" && <DesignManagerPagesTab />}
      {activeTab === "frontpage" && <DesignManagerFrontpageTab />}
    </div>
  );
}
