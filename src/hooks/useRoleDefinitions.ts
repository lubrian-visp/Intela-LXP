import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

export interface RoleDefinition {
  id: string;
  role_key: string;
  display_name: string;
  description: string | null;
  domain: "technical" | "business" | "learning_development";
  base_role: string | null;
  is_predefined: boolean;
  is_active: boolean;
  template_source_id: string | null;
  dashboard_path: string | null;
  portal_title: string | null;
  portal_subtitle: string | null;
  menu_config: any;
  widget_config: any;
  permissions: Record<string, string>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role_definition_id: string;
  resource: string;
  action: string;
  is_granted: boolean;
  conditions: any;
}

export interface UserRoleScope {
  id: string;
  user_id: string;
  role_definition_id: string;
  scope_type: string;
  scope_value: string | null;
  scope_label: string | null;
  assigned_by: string | null;
  assigned_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export function useRoleDefinitions() {
  return useQuery({
    queryKey: ["role-definitions"],
    queryFn: async () => {
      const { data, error } = await db
        .from("role_definitions")
        .select("*")
        .order("domain")
        .order("is_predefined", { ascending: false })
        .order("display_name");
      if (error) throw error;
      return data as RoleDefinition[];
    },
  });
}

export function useRolePermissions(roleDefinitionId: string | null) {
  return useQuery({
    queryKey: ["role-permissions", roleDefinitionId],
    queryFn: async () => {
      if (!roleDefinitionId) return [];
      const { data, error } = await db
        .from("role_permissions")
        .select("*")
        .eq("role_definition_id", roleDefinitionId);
      if (error) throw error;
      return data as RolePermission[];
    },
    enabled: !!roleDefinitionId,
  });
}

export function useUserRoleScopes() {
  return useQuery({
    queryKey: ["user-role-scopes"],
    queryFn: async () => {
      const { data, error } = await db
        .from("user_role_scopes")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data as UserRoleScope[];
    },
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      role_key: string;
      display_name: string;
      description: string;
      domain: string;
      base_role?: string;
      template_source_id?: string;
      dashboard_path?: string;
      portal_title?: string;
      portal_subtitle?: string;
      permissions: Record<string, string>;
      permission_entries?: { resource: string; action: string }[];
    }) => {
      const { permission_entries, ...roleData } = input;

      const { data: role, error } = await db
        .from("role_definitions")
        .insert({
          ...roleData,
          is_predefined: false,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      if (permission_entries && permission_entries.length > 0) {
        const { error: permError } = await db
          .from("role_permissions")
          .insert(
            permission_entries.map((p) => ({
              role_definition_id: role.id,
              resource: p.resource,
              action: p.action,
              is_granted: true,
            }))
          );
        if (permError) throw permError;
      }

      await db.from("role_audit_log").insert({
        action: "role_created",
        entity_type: "role_definition",
        entity_id: role.id,
        performed_by: user?.id,
        details: { display_name: role.display_name, domain: role.domain, cloned_from: input.template_source_id },
      });

      return role;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["role-definitions"] });
      toast({ title: "Role created successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create role", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeactivateRole() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await db
        .from("role_definitions")
        .update({ is_active: false })
        .eq("id", roleId);
      if (error) throw error;

      await db.from("role_audit_log").insert({
        action: "role_deactivated",
        entity_type: "role_definition",
        entity_id: roleId,
        performed_by: user?.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["role-definitions"] });
      toast({ title: "Role deactivated" });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (roleId: string) => {
      // Capture role for audit before deletion
      const { data: role } = await db
        .from("role_definitions")
        .select("display_name, domain, is_predefined")
        .eq("id", roleId)
        .single();

      if (role?.is_predefined) {
        throw new Error("Predefined roles cannot be deleted");
      }

      // Remove dependent scopes (active or not) so FK doesn't block delete
      await db.from("user_role_scopes").delete().eq("role_definition_id", roleId);
      await db.from("role_permissions").delete().eq("role_definition_id", roleId);

      const { error } = await db
        .from("role_definitions")
        .delete()
        .eq("id", roleId);
      if (error) throw error;

      await db.from("role_audit_log").insert({
        action: "role_deleted",
        entity_type: "role_definition",
        entity_id: roleId,
        performed_by: user?.id,
        details: { display_name: role?.display_name, domain: role?.domain },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["role-definitions"] });
      qc.invalidateQueries({ queryKey: ["user-role-scopes"] });
      toast({ title: "Role deleted permanently" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete role", description: err.message, variant: "destructive" });
    },
  });
}

export function useAssignUserRole() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      role_definition_id: string;
      scope_type: string;
      scope_value?: string;
      scope_label?: string;
    }) => {
      const { error } = await db
        .from("user_role_scopes")
        .insert({
          ...input,
          assigned_by: user?.id,
        });
      if (error) throw error;

      await db.from("role_audit_log").insert({
        action: "user_assigned",
        entity_type: "user_role_scope",
        entity_id: input.user_id,
        performed_by: user?.id,
        details: { role_definition_id: input.role_definition_id, scope_type: input.scope_type },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-role-scopes"] });
      toast({ title: "User assigned to role" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to assign role", description: err.message, variant: "destructive" });
    },
  });
}

export function useBulkAssignRoles() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (entries: {
      user_id: string;
      role_definition_id: string;
      scope_type: string;
      scope_value?: string;
      scope_label?: string;
    }[]) => {
      const { error } = await db
        .from("user_role_scopes")
        .insert(
          entries.map((e) => ({
            ...e,
            assigned_by: user?.id,
          }))
        );
      if (error) throw error;

      await db.from("role_audit_log").insert(
        entries.map((e) => ({
          action: "user_assigned",
          entity_type: "user_role_scope",
          entity_id: e.user_id,
          performed_by: user?.id,
          details: { role_definition_id: e.role_definition_id, scope_type: e.scope_type, bulk: true },
        }))
      );
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["user-role-scopes"] });
      toast({ title: `${vars.length} users assigned successfully` });
    },
    onError: (err: any) => {
      toast({ title: "Bulk assignment failed", description: err.message, variant: "destructive" });
    },
  });
}
