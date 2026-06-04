import { useState, useEffect, useRef } from "react";
import { Menu as MenuIcon, RefreshCw } from "lucide-react";
import { Plus, ChevronDown, ChevronRight, Edit2, Trash2, GripVertical, ExternalLink, Link, FileText, ToggleLeft, Eye, EyeOff, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  useCmsMenus,
  useCmsMenuItems,
  useAllCmsMenuItems,
  useCmsRolePermissions,
  useCmsMenuMutations,
  useCmsMenuItemMutations,
  useCmsRolePermissionMutations,
  CmsMenu,
  CmsMenuItem,
} from "@/hooks/useDesignManager";

const ALL_ROLES = [
  "super_admin", "systems_admin", "programme_manager", "operations",
  "talent_manager", "sponsor", "facilitator", "assessor", "moderator",
  "mentor", "learner", "ld_support_officer",
];

const BUILT_IN_PATHS = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Programmes", path: "/programmes" },
  { label: "Cohorts", path: "/cohorts" },
  { label: "Cohort Management", path: "/cohort-management" },
  { label: "Learning Tracks", path: "/pathways" },
  { label: "Learning Hub", path: "/modules" },
  { label: "Assessments", path: "/assessments" },
  { label: "Credentials", path: "/credentials" },
  { label: "Analytics", path: "/analytics" },
  { label: "Calendar", path: "/calendar" },
  { label: "User Directory", path: "/admin/users" },
  { label: "Roles & Permissions", path: "/admin/roles" },
  { label: "Platform Settings", path: "/admin/settings" },
  { label: "Programme Types", path: "/admin/programme-types" },
  { label: "Multi-Tenancy", path: "/admin/tenants" },
  { label: "Integrations", path: "/admin/integrations" },
  { label: "Audit Logs", path: "/admin/audit-logs" },
  { label: "Workflow Engine", path: "/admin/workflows" },
  { label: "System Health", path: "/admin/system-health" },
  { label: "Discussions", path: "/discussions" },
  { label: "Announcements", path: "/announcements" },
  { label: "Approval Queue", path: "/approvals" },
  { label: "Learner Dashboard", path: "/learner" },
  { label: "Facilitator", path: "/facilitator" },
  { label: "Assessor Portal", path: "/assessor" },
  { label: "Moderator Portal", path: "/moderator" },
  { label: "Mentor Portal", path: "/mentor" },
  { label: "Sponsor Portal", path: "/sponsor-portal" },
  { label: "Operations", path: "/operations" },
  { label: "Programme Manager", path: "/programme-manager" },
  { label: "Systems Admin", path: "/systems-admin" },
  { label: "Talent Manager", path: "/talent-manager" },
  { label: "Talent Management", path: "/talent" },
  { label: "My Profile", path: "/my-profile" },
  { label: "My Settings", path: "/my-settings" },
  { label: "Help Centre", path: "/help" },
  { label: "Portfolio of Evidence", path: "/portfolio" },
  { label: "Transcript", path: "/transcript" },
  { label: "Training Sessions", path: "/sessions" },
  { label: "Content Library", path: "/content-library" },
  { label: "Skills Manager", path: "/skills" },
  { label: "Staff Onboarding", path: "/staff/onboarding" },
  { label: "Learner Onboarding", path: "/learner/onboarding" },
  { label: "Sponsor Onboarding", path: "/sponsor/onboarding" },
  { label: "Sponsor Linking", path: "/sponsor/linking" },
  { label: "POPIA Compliance", path: "/admin/popia" },
  { label: "Typography", path: "/admin/typography" },
  { label: "Unified Audit Trail", path: "/admin/unified-audit" },
  { label: "LXP Analytics", path: "/lxp-analytics" },
  { label: "Achievements", path: "/achievements" },
  { label: "Sponsor Learners", path: "/sponsor/learners" },
  { label: "Sponsor Reports", path: "/sponsor/reports" },
  { label: "Sponsor Compliance", path: "/sponsor/compliance" },
  { label: "Sponsor Invoices", path: "/sponsor/invoices" },
  { label: "Sponsor Quotes", path: "/sponsor/quotes" },
  { label: "Sponsor Messages", path: "/sponsor/messages" },
  { label: "Sponsor Notifications", path: "/sponsor/notifications" },
  { label: "Quote Management", path: "/provider/quotes" },
];

export function DesignManagerMenusTab() {
  const { data: menus = [], isLoading } = useCmsMenus();
  const { data: allItems = [] } = useAllCmsMenuItems();
  const { data: permissions = [] } = useCmsRolePermissions();
  const { createMenu, updateMenu, deleteMenu } = useCmsMenuMutations();
  const { createItem, updateItem, deleteItem } = useCmsMenuItemMutations();
  const { upsertPermission } = useCmsRolePermissionMutations();
  const queryClient = useQueryClient();

  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showCreateItem, setShowCreateItem] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<CmsMenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);
  const hasAttemptedSeed = useRef(false);

  // Auto-seed platform menus on first load if database is empty
  const seedPlatformMenus = async () => {
    setIsSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-cms-menus");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["cms-menus"] });
      queryClient.invalidateQueries({ queryKey: ["cms-menu-items-all"] });
      queryClient.invalidateQueries({ queryKey: ["cms-role-permissions"] });
      toast({ title: "Platform menus seeded", description: `${data?.results?.length || 0} menus processed.` });
    } catch (e: any) {
      toast({ title: "Seeding failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    if (!isLoading && menus.length === 0 && !hasAttemptedSeed.current && !isSeeding) {
      hasAttemptedSeed.current = true;
      seedPlatformMenus();
    }
  }, [isLoading, menus.length]);

  // Form state
  const [menuForm, setMenuForm] = useState({ name: "", slug: "", description: "" });
  const [itemForm, setItemForm] = useState({
    label: "", item_type: "built_in" as CmsMenuItem["item_type"],
    target_path: "", external_url: "", icon_name: "", open_in_new_tab: false,
  });

  const toggleExpand = (id: string) => {
    setExpandedMenus(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getMenuItems = (menuId: string) =>
    allItems.filter(i => i.menu_id === menuId).sort((a, b) => a.sort_order - b.sort_order);

  const getMenuPermission = (menuId: string, role: string) => {
    const perm = permissions.find(p => p.menu_id === menuId && !p.menu_item_id && p.role === role);
    return perm ? perm.is_visible : true; // Default visible
  };

  const getItemPermission = (itemId: string, role: string) => {
    const perm = permissions.find(p => p.menu_item_id === itemId && p.role === role);
    return perm ? perm.is_visible : true;
  };

  const handleCreateMenu = () => {
    if (!menuForm.name) return;
    createMenu.mutate({
      name: menuForm.name,
      slug: menuForm.slug || menuForm.name.toLowerCase().replace(/\s+/g, "-"),
      description: menuForm.description || null,
    });
    setMenuForm({ name: "", slug: "", description: "" });
    setShowCreateMenu(false);
  };

  const handleCreateItem = (menuId: string) => {
    createItem.mutate({
      menu_id: menuId,
      label: itemForm.label,
      item_type: itemForm.item_type,
      target_path: itemForm.item_type === "built_in" ? itemForm.target_path : null,
      external_url: itemForm.item_type === "external_link" ? itemForm.external_url : null,
      icon_name: itemForm.icon_name || null,
      open_in_new_tab: itemForm.open_in_new_tab,
      sort_order: getMenuItems(menuId).length,
    });
    setItemForm({ label: "", item_type: "built_in", target_path: "", external_url: "", icon_name: "", open_in_new_tab: false });
    setShowCreateItem(null);
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;
    updateItem.mutate({
      id: editingItem.id,
      label: itemForm.label,
      item_type: itemForm.item_type,
      target_path: itemForm.item_type === "built_in" ? itemForm.target_path : editingItem.target_path,
      external_url: itemForm.item_type === "external_link" ? itemForm.external_url : editingItem.external_url,
      icon_name: itemForm.icon_name || null,
      open_in_new_tab: itemForm.open_in_new_tab,
    });
    setEditingItem(null);
  };

  const toggleRoleVisibility = (menuId: string | null, itemId: string | null, role: string, currentlyVisible: boolean) => {
    upsertPermission.mutate({
      menu_id: menuId,
      menu_item_id: itemId,
      role,
      is_visible: !currentlyVisible,
    });
  };

  const filteredMenus = searchQuery
    ? menus.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getMenuItems(m.id).some(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : menus;

  if (isLoading || isSeeding) {
    return (
      <div className="space-y-4">
        {isSeeding && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-primary animate-spin" />
            <div>
              <p className="text-sm font-medium text-foreground">Seeding platform menus...</p>
              <p className="text-xs text-muted-foreground">Loading all navigation structures from the platform configuration.</p>
            </div>
          </div>
        )}
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search menus and items..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={seedPlatformMenus} disabled={isSeeding}>
            <RefreshCw className={cn("w-4 h-4 mr-1", isSeeding && "animate-spin")} /> Reseed Menus
          </Button>
          <Button size="sm" onClick={() => setShowCreateMenu(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create Menu
          </Button>
        </div>
      </div>

      {/* Menu List */}
      {filteredMenus.length === 0 && (
        <div className="bg-card rounded-xl border border-border/50 p-12 text-center">
          <MenuIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No menus found. Seed the platform menus to get started.</p>
          <Button onClick={seedPlatformMenus} disabled={isSeeding}>
            <RefreshCw className={cn("w-4 h-4 mr-1", isSeeding && "animate-spin")} />
            {isSeeding ? "Seeding..." : "Seed Platform Menus"}
          </Button>
        </div>
      )}

      <StaggerContainer className="space-y-3">
        {filteredMenus.map(menu => {
          const items = getMenuItems(menu.id);
          const isExpanded = expandedMenus.has(menu.id);

          return (
            <StaggerItem key={menu.id}>
              <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
                {/* Menu Header */}
                <div className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-secondary/20 transition-colors" onClick={() => toggleExpand(menu.id)}>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{menu.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{menu.slug}</Badge>
                      {!menu.is_active && <Badge variant="secondary" className="text-[10px]">Disabled</Badge>}
                    </div>
                    {menu.description && <p className="text-[11px] text-muted-foreground mt-0.5">{menu.description}</p>}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{items.length} items</span>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <Switch
                      checked={menu.is_active}
                      onCheckedChange={checked => updateMenu.mutate({ id: menu.id, is_active: checked })}
                      className="scale-75"
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMenu.mutate(menu.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Role Visibility Row */}
                {isExpanded && (
                  <div className="px-5 py-2 border-t border-border/30 bg-secondary/10">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Menu Visibility by Role</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_ROLES.map(role => {
                        const visible = getMenuPermission(menu.id, role);
                        return (
                          <button
                            key={role}
                            onClick={() => toggleRoleVisibility(menu.id, null, role, visible)}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-colors",
                              visible
                                ? "bg-success/10 text-success border-success/20"
                                : "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {role.replace(/_/g, " ")}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Menu Items */}
                {isExpanded && (
                  <div className="border-t border-border/30">
                    {items.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-3 px-5 py-3 border-b border-border/20 last:border-0 hover:bg-secondary/10 transition-colors group">
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 cursor-grab" />
                        <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center">
                          {item.item_type === "external_link" ? <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" /> :
                           item.item_type === "custom_page" ? <FileText className="w-3.5 h-3.5 text-muted-foreground" /> :
                           <Link className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {item.target_path || item.external_url || "No target"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Switch
                            checked={item.is_active}
                            onCheckedChange={checked => updateItem.mutate({ id: item.id, is_active: checked })}
                            className="scale-75"
                          />
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setEditingItem(item);
                              setItemForm({
                                label: item.label,
                                item_type: item.item_type,
                                target_path: item.target_path || "",
                                external_url: item.external_url || "",
                                icon_name: item.icon_name || "",
                                open_in_new_tab: item.open_in_new_tab,
                              });
                            }}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteItem.mutate(item.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="px-5 py-3">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => {
                        setShowCreateItem(menu.id);
                        setItemForm({ label: "", item_type: "built_in", target_path: "", external_url: "", icon_name: "", open_in_new_tab: false });
                      }}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Create Menu Dialog */}
      <Dialog open={showCreateMenu} onOpenChange={setShowCreateMenu}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Menu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Menu Name</Label>
              <Input value={menuForm.name} onChange={e => setMenuForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Main Navigation" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={menuForm.slug} onChange={e => setMenuForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated from name" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={menuForm.description} onChange={e => setMenuForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateMenu(false)}>Cancel</Button>
            <Button onClick={handleCreateMenu} disabled={!menuForm.name}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Menu Item Dialog */}
      <Dialog open={!!showCreateItem} onOpenChange={() => setShowCreateItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Label</Label>
              <Input value={itemForm.label} onChange={e => setItemForm(f => ({ ...f, label: e.target.value }))} placeholder="Display label" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={itemForm.item_type} onValueChange={v => setItemForm(f => ({ ...f, item_type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="built_in">Built-in Page</SelectItem>
                  <SelectItem value="external_link">External Link</SelectItem>
                  <SelectItem value="custom_page">Custom Page</SelectItem>
                  <SelectItem value="separator">Separator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {itemForm.item_type === "built_in" && (
              <div>
                <Label>Target Path</Label>
                <Select value={itemForm.target_path} onValueChange={v => setItemForm(f => ({ ...f, target_path: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a page" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {BUILT_IN_PATHS.map(p => (
                      <SelectItem key={p.path} value={p.path}>{p.label} ({p.path})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {itemForm.item_type === "external_link" && (
              <div>
                <Label>URL</Label>
                <Input value={itemForm.external_url} onChange={e => setItemForm(f => ({ ...f, external_url: e.target.value }))} placeholder="https://..." />
              </div>
            )}
            <div>
              <Label>Icon Name (optional)</Label>
              <Input value={itemForm.icon_name} onChange={e => setItemForm(f => ({ ...f, icon_name: e.target.value }))} placeholder="e.g. LayoutDashboard" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={itemForm.open_in_new_tab} onCheckedChange={v => setItemForm(f => ({ ...f, open_in_new_tab: v }))} />
              <Label>Open in new tab</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateItem(null)}>Cancel</Button>
            <Button onClick={() => showCreateItem && handleCreateItem(showCreateItem)} disabled={!itemForm.label}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Menu Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Label</Label>
              <Input value={itemForm.label} onChange={e => setItemForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={itemForm.item_type} onValueChange={v => setItemForm(f => ({ ...f, item_type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="built_in">Built-in Page</SelectItem>
                  <SelectItem value="external_link">External Link</SelectItem>
                  <SelectItem value="custom_page">Custom Page</SelectItem>
                  <SelectItem value="separator">Separator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {itemForm.item_type === "built_in" && (
              <div>
                <Label>Target Path</Label>
                <Select value={itemForm.target_path} onValueChange={v => setItemForm(f => ({ ...f, target_path: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a page" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {BUILT_IN_PATHS.map(p => (
                      <SelectItem key={p.path} value={p.path}>{p.label} ({p.path})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {itemForm.item_type === "external_link" && (
              <div>
                <Label>URL</Label>
                <Input value={itemForm.external_url} onChange={e => setItemForm(f => ({ ...f, external_url: e.target.value }))} />
              </div>
            )}
            <div>
              <Label>Icon Name</Label>
              <Input value={itemForm.icon_name} onChange={e => setItemForm(f => ({ ...f, icon_name: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={itemForm.open_in_new_tab} onCheckedChange={v => setItemForm(f => ({ ...f, open_in_new_tab: v }))} />
              <Label>Open in new tab</Label>
            </div>
            {/* Item-level role visibility */}
            {editingItem && (
              <div>
                <Label className="mb-2 block">Item Role Visibility</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_ROLES.map(role => {
                    const visible = getItemPermission(editingItem.id, role);
                    return (
                      <button
                        key={role}
                        onClick={() => toggleRoleVisibility(null, editingItem.id, role, visible)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-colors",
                          visible ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {role.replace(/_/g, " ")}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
            <Button onClick={handleUpdateItem}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
