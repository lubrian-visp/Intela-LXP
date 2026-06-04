import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationPreferences, useUpsertPreference, CATEGORIES } from "@/hooks/useNotificationPreferences";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function NotificationPreferencesSection() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const upsert = useUpsertPreference();

  const getPref = (category: string) => {
    const found = (prefs ?? []).find((p: any) => p.category === category);
    return { in_app_enabled: found?.in_app_enabled ?? true, email_enabled: found?.email_enabled ?? false };
  };

  const toggle = (category: string, field: "in_app_enabled" | "email_enabled") => {
    const current = getPref(category);
    const updated = { ...current, [field]: !current[field] };
    upsert.mutate(
      { category, ...updated },
      { onSuccess: () => toast.success("Preference updated") }
    );
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-accent" /> My Notification Preferences
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Choose which notifications you receive and how.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-6 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Category</th>
              <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">In-App</th>
              <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Email</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(cat => {
              const p = getPref(cat.key);
              return (
                <tr key={cat.key} className="border-b border-border/50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-foreground">{cat.label}</p>
                    <p className="text-[11px] text-muted-foreground">{cat.description}</p>
                  </td>
                  <td className="text-center px-4 py-4">
                    <button
                      onClick={() => toggle(cat.key, "in_app_enabled")}
                      className={cn("w-10 h-6 rounded-full p-0.5 transition-colors", p.in_app_enabled ? "bg-success" : "bg-border")}
                    >
                      <div className={cn("w-5 h-5 rounded-full bg-card shadow-sm transition-transform", p.in_app_enabled ? "translate-x-4" : "translate-x-0")} />
                    </button>
                  </td>
                  <td className="text-center px-4 py-4">
                    <button
                      onClick={() => toggle(cat.key, "email_enabled")}
                      className={cn("w-10 h-6 rounded-full p-0.5 transition-colors", p.email_enabled ? "bg-success" : "bg-border")}
                    >
                      <div className={cn("w-5 h-5 rounded-full bg-card shadow-sm transition-transform", p.email_enabled ? "translate-x-4" : "translate-x-0")} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
