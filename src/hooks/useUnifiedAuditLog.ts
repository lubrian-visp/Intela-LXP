import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UnifiedAuditEntry {
  id: string;
  source: "onboarding" | "deletion" | "programme_lifecycle";
  entity_type: string;
  entity_id: string;
  action: string;
  user_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

interface UseUnifiedAuditLogOptions {
  entityType?: string;
  entityId?: string;
  source?: string;
  limit?: number;
}

export function useUnifiedAuditLog(options: UseUnifiedAuditLogOptions = {}) {
  const { entityType, entityId, source, limit = 200 } = options;

  return useQuery({
    queryKey: ["unified-audit-log", entityType, entityId, source, limit],
    queryFn: async () => {
      // Query the unified view via RPC or direct query
      // Since it's a VIEW, we query each source table and merge client-side
      const queries = [];

      // Onboarding audit log
      if (!source || source === "onboarding") {
        let q = supabase
          .from("onboarding_audit_log")
          .select("id, entity_type, entity_id, action, performed_by, details, created_at")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (entityType) q = q.eq("entity_type", entityType);
        if (entityId) q = q.eq("entity_id", entityId);
        queries.push(q.then(({ data }) =>
          (data ?? []).map((r: any) => ({ ...r, source: "onboarding" as const, user_id: r.performed_by }))
        ));
      }

      // Deletion audit log
      if (!source || source === "deletion") {
        let q = supabase
          .from("deletion_audit_log")
          .select("id, entity_type, entity_id, action_type, user_id, details, created_at")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (entityType) q = q.eq("entity_type", entityType);
        if (entityId) q = q.eq("entity_id", entityId);
        queries.push(q.then(({ data }) =>
          (data ?? []).map((r: any) => ({ ...r, source: "deletion" as const, action: r.action_type }))
        ));
      }

      // Programme lifecycle audit
      if (!source || source === "programme_lifecycle") {
        let q = supabase
          .from("programme_lifecycle_audit")
          .select("id, programme_id, action, performed_by, previous_status, new_status, reason, role_at_action, metadata, created_at")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (entityId) q = q.eq("programme_id", entityId);
        queries.push(q.then(({ data }) =>
          (data ?? []).map((r: any) => ({
            id: r.id,
            source: "programme_lifecycle" as const,
            entity_type: "programme",
            entity_id: r.programme_id,
            action: r.action,
            user_id: r.performed_by,
            details: {
              previous_status: r.previous_status,
              new_status: r.new_status,
              reason: r.reason,
              role_at_action: r.role_at_action,
              metadata: r.metadata,
            },
            created_at: r.created_at,
          }))
        ));
      }

      const results = await Promise.all(queries);
      const merged = results.flat() as UnifiedAuditEntry[];
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return merged.slice(0, limit);
    },
  });
}
