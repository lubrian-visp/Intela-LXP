import { useMemo } from "react";
import { useTenantEffectiveFlags, useToggleTenantFlag, EffectiveFlag } from "@/hooks/useFeatureFlags";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ToggleRight } from "lucide-react";

interface Props { tenantId: string; tenantTier?: string }

const tierRank: Record<string, number> = { free: 0, standard: 1, professional: 2, enterprise: 3 };

const categoryLabels: Record<string, string> = {
  core: "Core Modules",
  advanced: "Advanced Modules",
  integrations: "Integrations",
  compliance: "Compliance",
  branding: "Branding & Customisation",
};

export default function TenantFeatureFlagsPanel({ tenantId, tenantTier = "standard" }: Props) {
  const { data: flags = [], isLoading } = useTenantEffectiveFlags(tenantId);
  const toggleFlag = useToggleTenantFlag();

  const grouped = useMemo(() => {
    const out: Record<string, EffectiveFlag[]> = {};
    flags.forEach((f) => {
      if (!out[f.category]) out[f.category] = [];
      out[f.category].push(f);
    });
    return out;
  }, [flags]);

  const tierLevel = tierRank[tenantTier] ?? 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ToggleRight className="w-4 h-4" />
          Feature Flags
        </CardTitle>
        <CardDescription>
          Enable or disable platform features for this tenant. Some features require a higher subscription tier.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading flags…</p>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground border-b pb-2">
                {categoryLabels[category] ?? category}
              </h4>
              <div className="space-y-3">
                {items.map((flag) => {
                  const requiredRank = tierRank[flag.min_tier] ?? 0;
                  const tierBlocked = tierLevel < requiredRank;
                  return (
                    <div
                      key={flag.flag_key}
                      className="flex items-start justify-between gap-4 p-3 rounded border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{flag.display_name}</span>
                          {flag.has_override && (
                            <Badge variant="outline" className="text-xs">Custom</Badge>
                          )}
                          {tierBlocked && (
                            <Badge variant="secondary" className="text-xs capitalize">
                              Requires {flag.min_tier}
                            </Badge>
                          )}
                        </div>
                        {flag.description && (
                          <p className="text-xs text-muted-foreground mt-1">{flag.description}</p>
                        )}
                      </div>
                      <Switch
                        checked={flag.is_enabled}
                        disabled={tierBlocked || toggleFlag.isPending}
                        onCheckedChange={(checked) =>
                          toggleFlag.mutate({ tenant_id: tenantId, flag_key: flag.flag_key, is_enabled: checked })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
