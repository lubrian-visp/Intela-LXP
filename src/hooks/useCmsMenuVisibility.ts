import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CmsMenuVisibilityRecord {
  id: string;
  slug: string;
  is_active: boolean;
}

interface CmsMenuItemVisibilityRecord {
  menu_id: string;
  target_path: string | null;
  label: string;
  is_active: boolean;
}

/**
 * Resolves sidebar visibility from CMS menu state for the current portal menu set.
 * Matching is scoped to the active role/menu slugs so duplicate paths across portals
 * do not leak visibility from another role's menu configuration.
 */
export function useCmsMenuVisibility(menuSlugs: string[]) {
  const { data, isLoading } = useQuery({
    queryKey: ["cms-menu-items-visibility", menuSlugs.slice().sort().join("|")],
    queryFn: async () => {
      const [{ data: menus, error: menusError }, { data: items, error: itemsError }] = await Promise.all([
        supabase.from("cms_menus").select("id, slug, is_active"),
        supabase.from("cms_menu_items").select("menu_id, target_path, label, is_active"),
      ]);

      if (menusError) throw menusError;
      if (itemsError) throw itemsError;

      return {
        menus: (menus ?? []) as CmsMenuVisibilityRecord[],
        items: (items ?? []) as CmsMenuItemVisibilityRecord[],
      };
    },
    staleTime: 30_000,
  });

  const isPathActive = (path: string): boolean => {
    if (isLoading || !data) return true;

    const relevantMenuIds = new Set(
      data.menus
        .filter((menu) => menuSlugs.includes(menu.slug) && menu.is_active)
        .map((menu) => menu.id)
    );

    if (relevantMenuIds.size === 0) return true;

    const cleanPath = path.split("?")[0];
    const relevantMatches = data.items.filter((item) => {
      if (!item.target_path || !relevantMenuIds.has(item.menu_id)) return false;
      return item.target_path.split("?")[0] === cleanPath;
    });

    if (relevantMatches.length === 0) return true;

    return relevantMatches.some((item) => item.is_active);
  };

  /**
   * Checks visibility using both path AND label for disambiguation.
   * When multiple CMS items share the same target_path (e.g. /operations),
   * this allows per-item toggling by also matching on the label.
   */
  const isItemActive = (path: string, label: string): boolean => {
    if (isLoading || !data) return true;

    const relevantMenuIds = new Set(
      data.menus
        .filter((menu) => menuSlugs.includes(menu.slug) && menu.is_active)
        .map((menu) => menu.id)
    );

    if (relevantMenuIds.size === 0) return true;

    const cleanPath = path.split("?")[0];
    const relevantMatches = data.items.filter((item) => {
      if (!item.target_path || !relevantMenuIds.has(item.menu_id)) return false;
      return item.target_path.split("?")[0] === cleanPath;
    });

    if (relevantMatches.length === 0) return true;

    // If there's an exact label match among items sharing this path, use that item's state
    const labelMatch = relevantMatches.find(
      (item) => (item as any).label?.toLowerCase() === label.toLowerCase()
    );
    if (labelMatch) return labelMatch.is_active;

    // Fallback: any match active means visible
    return relevantMatches.some((item) => item.is_active);
  };

  return { isPathActive, isItemActive, isLoading };
}
