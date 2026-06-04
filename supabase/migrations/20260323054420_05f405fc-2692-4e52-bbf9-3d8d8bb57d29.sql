
-- CMS Menus table
CREATE TABLE public.cms_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CMS Menu Items table
CREATE TABLE public.cms_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES public.cms_menus(id) ON DELETE CASCADE,
  parent_item_id uuid REFERENCES public.cms_menu_items(id) ON DELETE CASCADE,
  label text NOT NULL,
  item_type text NOT NULL DEFAULT 'built_in' CHECK (item_type IN ('built_in', 'custom_page', 'external_link', 'separator')),
  target_path text,
  external_url text,
  page_id uuid,
  icon_name text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  open_in_new_tab boolean NOT NULL DEFAULT false,
  css_class text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CMS Role Menu Permissions
CREATE TABLE public.cms_role_menu_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid REFERENCES public.cms_menus(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.cms_menu_items(id) ON DELETE CASCADE,
  role text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT at_least_one_target CHECK (menu_id IS NOT NULL OR menu_item_id IS NOT NULL)
);

-- CMS Pages table
CREATE TABLE public.cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  is_published boolean NOT NULL DEFAULT false,
  is_homepage boolean NOT NULL DEFAULT false,
  meta_title text,
  meta_description text,
  created_by uuid REFERENCES auth.users(id),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CMS Page Blocks table
CREATE TABLE public.cms_page_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  block_type text NOT NULL DEFAULT 'text' CHECK (block_type IN ('text', 'html', 'course_display', 'programme_display', 'image', 'video', 'hero', 'cta', 'spacer', 'divider')),
  title text,
  content jsonb DEFAULT '{}'::jsonb,
  config jsonb DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add foreign key from menu_items to pages
ALTER TABLE public.cms_menu_items
  ADD CONSTRAINT cms_menu_items_page_id_fkey
  FOREIGN KEY (page_id) REFERENCES public.cms_pages(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.cms_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_role_menu_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_page_blocks ENABLE ROW LEVEL SECURITY;

-- RLS: Read access for all authenticated users (menus/pages are public content)
CREATE POLICY "Anyone can read active menus" ON public.cms_menus
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can read menu items" ON public.cms_menu_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can read role permissions" ON public.cms_role_menu_permissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can read published pages" ON public.cms_pages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can read page blocks" ON public.cms_page_blocks
  FOR SELECT TO authenticated USING (true);

-- RLS: Write access only for platform admins
CREATE POLICY "Admins can manage menus" ON public.cms_menus
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins can manage menu items" ON public.cms_menu_items
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins can manage role permissions" ON public.cms_role_menu_permissions
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins can manage pages" ON public.cms_pages
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins can manage page blocks" ON public.cms_page_blocks
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Updated_at triggers
CREATE TRIGGER update_cms_menus_updated_at BEFORE UPDATE ON public.cms_menus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_menu_items_updated_at BEFORE UPDATE ON public.cms_menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_role_menu_permissions_updated_at BEFORE UPDATE ON public.cms_role_menu_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_pages_updated_at BEFORE UPDATE ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_page_blocks_updated_at BEFORE UPDATE ON public.cms_page_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_cms_menu_items_menu_id ON public.cms_menu_items(menu_id);
CREATE INDEX idx_cms_menu_items_parent ON public.cms_menu_items(parent_item_id);
CREATE INDEX idx_cms_page_blocks_page_id ON public.cms_page_blocks(page_id);
CREATE INDEX idx_cms_role_perms_menu ON public.cms_role_menu_permissions(menu_id);
CREATE INDEX idx_cms_role_perms_item ON public.cms_role_menu_permissions(menu_item_id);
CREATE INDEX idx_cms_role_perms_role ON public.cms_role_menu_permissions(role);
