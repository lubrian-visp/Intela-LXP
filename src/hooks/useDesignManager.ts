import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────

export interface CmsMenu {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmsMenuItem {
  id: string;
  menu_id: string;
  parent_item_id: string | null;
  label: string;
  item_type: "built_in" | "custom_page" | "external_link" | "separator";
  target_path: string | null;
  external_url: string | null;
  page_id: string | null;
  icon_name: string | null;
  is_active: boolean;
  sort_order: number;
  open_in_new_tab: boolean;
  css_class: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmsRoleMenuPermission {
  id: string;
  menu_id: string | null;
  menu_item_id: string | null;
  role: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  is_published: boolean;
  is_homepage: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmsPageBlock {
  id: string;
  page_id: string;
  block_type: string;
  title: string | null;
  content: any;
  config: any;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Menus ───────────────────────────────────────────────────────────

export function useCmsMenus() {
  return useQuery({
    queryKey: ["cms-menus"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_menus")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CmsMenu[];
    },
  });
}

export function useCmsMenuItems(menuId: string | null) {
  return useQuery({
    queryKey: ["cms-menu-items", menuId],
    queryFn: async () => {
      if (!menuId) return [];
      const { data, error } = await supabase
        .from("cms_menu_items")
        .select("*")
        .eq("menu_id", menuId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CmsMenuItem[];
    },
    enabled: !!menuId,
  });
}

export function useAllCmsMenuItems() {
  return useQuery({
    queryKey: ["cms-menu-items-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_menu_items")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CmsMenuItem[];
    },
  });
}

export function useCmsRolePermissions() {
  return useQuery({
    queryKey: ["cms-role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_role_menu_permissions")
        .select("*");
      if (error) throw error;
      return (data ?? []) as CmsRoleMenuPermission[];
    },
  });
}

// ─── Pages ───────────────────────────────────────────────────────────

export function useCmsPages() {
  return useQuery({
    queryKey: ["cms-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_pages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CmsPage[];
    },
  });
}

export function useCmsPageBlocks(pageId: string | null) {
  return useQuery({
    queryKey: ["cms-page-blocks", pageId],
    queryFn: async () => {
      if (!pageId) return [];
      const { data, error } = await supabase
        .from("cms_page_blocks")
        .select("*")
        .eq("page_id", pageId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CmsPageBlock[];
    },
    enabled: !!pageId,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────

export function useCmsMenuMutations() {
  const qc = useQueryClient();

  const createMenu = useMutation({
    mutationFn: async (menu: Partial<CmsMenu>) => {
      const { data, error } = await supabase
        .from("cms_menus")
        .insert(menu as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-menus"] });
      qc.invalidateQueries({ queryKey: ["cms-menu-items-visibility"] });
      toast({ title: "Menu created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMenu = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CmsMenu> & { id: string }) => {
      const { error } = await supabase.from("cms_menus").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-menus"] });
      qc.invalidateQueries({ queryKey: ["cms-menu-items-visibility"] });
      toast({ title: "Menu updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMenu = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cms_menus").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-menus"] });
      qc.invalidateQueries({ queryKey: ["cms-menu-items-visibility"] });
      toast({ title: "Menu deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { createMenu, updateMenu, deleteMenu };
}

export function useCmsMenuItemMutations() {
  const qc = useQueryClient();

  const createItem = useMutation({
    mutationFn: async (item: Partial<CmsMenuItem>) => {
      const { data, error } = await supabase
        .from("cms_menu_items")
        .insert(item as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-menu-items"] });
      qc.invalidateQueries({ queryKey: ["cms-menu-items-all"] });
      qc.invalidateQueries({ queryKey: ["cms-menu-items-visibility"] });
      toast({ title: "Menu item added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CmsMenuItem> & { id: string }) => {
      const { error } = await supabase.from("cms_menu_items").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-menu-items"] });
      qc.invalidateQueries({ queryKey: ["cms-menu-items-all"] });
      qc.invalidateQueries({ queryKey: ["cms-menu-items-visibility"] });
      toast({ title: "Menu item updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cms_menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-menu-items"] });
      qc.invalidateQueries({ queryKey: ["cms-menu-items-all"] });
      qc.invalidateQueries({ queryKey: ["cms-menu-items-visibility"] });
      toast({ title: "Menu item deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { createItem, updateItem, deleteItem };
}

export function useCmsRolePermissionMutations() {
  const qc = useQueryClient();

  const upsertPermission = useMutation({
    mutationFn: async (perm: Partial<CmsRoleMenuPermission>) => {
      // Check if exists
      let query = supabase.from("cms_role_menu_permissions").select("id").eq("role", perm.role!);
      if (perm.menu_id) query = query.eq("menu_id", perm.menu_id);
      if (perm.menu_item_id) query = query.eq("menu_item_id", perm.menu_item_id);
      
      const { data: existing } = await query.maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from("cms_role_menu_permissions")
          .update({ is_visible: perm.is_visible } as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cms_role_menu_permissions")
          .insert(perm as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-role-permissions"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { upsertPermission };
}

export function useCmsPageMutations() {
  const qc = useQueryClient();

  const createPage = useMutation({
    mutationFn: async (page: Partial<CmsPage>) => {
      const { data, error } = await supabase
        .from("cms_pages")
        .insert(page as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-pages"] });
      toast({ title: "Page created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updatePage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CmsPage> & { id: string }) => {
      const { error } = await supabase.from("cms_pages").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-pages"] });
      toast({ title: "Page updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cms_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-pages"] });
      toast({ title: "Page deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const duplicatePage = useMutation({
    mutationFn: async (pageId: string) => {
      // Get original page
      const { data: page, error: pageErr } = await supabase
        .from("cms_pages")
        .select("*")
        .eq("id", pageId)
        .single();
      if (pageErr) throw pageErr;

      // Create copy
      const { data: newPage, error: copyErr } = await supabase
        .from("cms_pages")
        .insert({
          title: page.title + " (Copy)",
          slug: page.slug + "-copy-" + Date.now(),
          description: page.description,
          is_published: false,
          meta_title: page.meta_title,
          meta_description: page.meta_description,
        } as any)
        .select()
        .single();
      if (copyErr) throw copyErr;

      // Copy blocks
      const { data: blocks } = await supabase
        .from("cms_page_blocks")
        .select("*")
        .eq("page_id", pageId)
        .order("sort_order");

      if (blocks && blocks.length > 0) {
        const newBlocks = blocks.map((b: any) => ({
          page_id: newPage.id,
          block_type: b.block_type,
          title: b.title,
          content: b.content,
          config: b.config,
          sort_order: b.sort_order,
          is_visible: b.is_visible,
        }));
        await supabase.from("cms_page_blocks").insert(newBlocks as any);
      }

      return newPage;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-pages"] });
      toast({ title: "Page duplicated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { createPage, updatePage, deletePage, duplicatePage };
}

export function useCmsPageBlockMutations() {
  const qc = useQueryClient();

  const createBlock = useMutation({
    mutationFn: async (block: Partial<CmsPageBlock>) => {
      const { data, error } = await supabase
        .from("cms_page_blocks")
        .insert(block as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["cms-page-blocks"] });
      toast({ title: "Block added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateBlock = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CmsPageBlock> & { id: string }) => {
      const { error } = await supabase.from("cms_page_blocks").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-page-blocks"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cms_page_blocks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-page-blocks"] });
      toast({ title: "Block removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reorderBlocks = useMutation({
    mutationFn: async (blocks: { id: string; sort_order: number }[]) => {
      for (const b of blocks) {
        await supabase.from("cms_page_blocks").update({ sort_order: b.sort_order } as any).eq("id", b.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-page-blocks"] });
    },
  });

  return { createBlock, updateBlock, deleteBlock, reorderBlocks };
}
