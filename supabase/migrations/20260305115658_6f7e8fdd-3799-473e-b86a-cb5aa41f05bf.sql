
-- Font library: stores all available fonts (google, custom, system)
CREATE TABLE public.font_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  font_source TEXT NOT NULL DEFAULT 'google' CHECK (font_source IN ('google', 'custom', 'system')),
  family_name TEXT NOT NULL,
  category TEXT DEFAULT 'sans-serif',
  variants JSONB NOT NULL DEFAULT '["400"]',
  subsets JSONB DEFAULT '["latin"]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  file_urls JSONB DEFAULT '{}',
  license_type TEXT DEFAULT NULL,
  license_expiry DATE DEFAULT NULL,
  popularity_rank INTEGER DEFAULT 0,
  preview_text TEXT DEFAULT 'The quick brown fox jumps over the lazy dog',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID DEFAULT NULL,
  UNIQUE(font_source, family_name)
);

-- Typography assignments: maps fonts to element groups with responsive settings
CREATE TABLE public.typography_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_draft BOOLEAN NOT NULL DEFAULT true,
  element_group TEXT NOT NULL,
  font_family TEXT NOT NULL,
  font_source TEXT NOT NULL DEFAULT 'google',
  loaded_variants JSONB NOT NULL DEFAULT '["400","700"]',
  desktop_settings JSONB NOT NULL DEFAULT '{"fontSize":"16px","lineHeight":"1.5","letterSpacing":"0","wordSpacing":"0","textTransform":"none"}',
  tablet_settings JSONB NOT NULL DEFAULT '{"fontSize":"15px","lineHeight":"1.5","letterSpacing":"0","wordSpacing":"0","textTransform":"none"}',
  mobile_settings JSONB NOT NULL DEFAULT '{"fontSize":"14px","lineHeight":"1.4","letterSpacing":"0","wordSpacing":"0","textTransform":"none"}',
  font_weight TEXT DEFAULT '400',
  font_style TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID DEFAULT NULL,
  UNIQUE(is_draft, element_group)
);

-- Typography presets
CREATE TABLE public.typography_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preset_name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  assignments JSONB NOT NULL DEFAULT '[]',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID DEFAULT NULL
);

-- Font audit log
CREATE TABLE public.font_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID DEFAULT NULL,
  before_value JSONB DEFAULT NULL,
  after_value JSONB DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  performed_by UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.font_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typography_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typography_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.font_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: font_library - public read, admin write
CREATE POLICY "Public read font library" ON public.font_library FOR SELECT USING (true);
CREATE POLICY "Admins manage font library" ON public.font_library FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'systems_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'systems_admin'));

-- RLS: typography_assignments - public read published, admin write
CREATE POLICY "Public read published typography" ON public.typography_assignments FOR SELECT USING (true);
CREATE POLICY "Admins manage typography" ON public.typography_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'systems_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'systems_admin'));

-- RLS: typography_presets
CREATE POLICY "Public read presets" ON public.typography_presets FOR SELECT USING (true);
CREATE POLICY "Admins manage presets" ON public.typography_presets FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'systems_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'systems_admin'));

-- RLS: font_audit_log
CREATE POLICY "Admins read font audit log" ON public.font_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'systems_admin'));
CREATE POLICY "Admins insert font audit log" ON public.font_audit_log FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'systems_admin'));

-- Seed system fonts
INSERT INTO public.font_library (font_source, family_name, category, variants, subsets) VALUES
  ('system', 'system-ui', 'sans-serif', '["400","500","600","700"]', '["latin"]'),
  ('system', 'Arial', 'sans-serif', '["400","700"]', '["latin"]'),
  ('system', 'Helvetica', 'sans-serif', '["400","700"]', '["latin"]'),
  ('system', 'Georgia', 'serif', '["400","700"]', '["latin"]'),
  ('system', 'Times New Roman', 'serif', '["400","700"]', '["latin"]'),
  ('system', 'Courier New', 'monospace', '["400","700"]', '["latin"]'),
  ('system', 'Verdana', 'sans-serif', '["400","700"]', '["latin"]');

-- Seed popular Google Fonts
INSERT INTO public.font_library (font_source, family_name, category, variants, popularity_rank) VALUES
  ('google', 'Roboto', 'sans-serif', '["100","300","400","500","700","900"]', 1),
  ('google', 'Open Sans', 'sans-serif', '["300","400","500","600","700","800"]', 2),
  ('google', 'Lato', 'sans-serif', '["100","300","400","700","900"]', 3),
  ('google', 'Montserrat', 'sans-serif', '["100","200","300","400","500","600","700","800","900"]', 4),
  ('google', 'Poppins', 'sans-serif', '["100","200","300","400","500","600","700","800","900"]', 5),
  ('google', 'Inter', 'sans-serif', '["100","200","300","400","500","600","700","800","900"]', 6),
  ('google', 'Oswald', 'sans-serif', '["200","300","400","500","600","700"]', 7),
  ('google', 'Raleway', 'sans-serif', '["100","200","300","400","500","600","700","800","900"]', 8),
  ('google', 'Nunito', 'sans-serif', '["200","300","400","500","600","700","800","900"]', 9),
  ('google', 'Playfair Display', 'serif', '["400","500","600","700","800","900"]', 10),
  ('google', 'Merriweather', 'serif', '["300","400","700","900"]', 11),
  ('google', 'Source Sans Pro', 'sans-serif', '["200","300","400","600","700","900"]', 12),
  ('google', 'PT Sans', 'sans-serif', '["400","700"]', 13),
  ('google', 'Ubuntu', 'sans-serif', '["300","400","500","700"]', 14),
  ('google', 'Mukta', 'sans-serif', '["200","300","400","500","600","700","800"]', 15),
  ('google', 'Work Sans', 'sans-serif', '["100","200","300","400","500","600","700","800","900"]', 16),
  ('google', 'Noto Sans', 'sans-serif', '["100","200","300","400","500","600","700","800","900"]', 17),
  ('google', 'Fira Sans', 'sans-serif', '["100","200","300","400","500","600","700","800","900"]', 18),
  ('google', 'Quicksand', 'sans-serif', '["300","400","500","600","700"]', 19),
  ('google', 'Barlow', 'sans-serif', '["100","200","300","400","500","600","700","800","900"]', 20),
  ('google', 'DM Sans', 'sans-serif', '["100","200","300","400","500","600","700","800","900"]', 21),
  ('google', 'Space Grotesk', 'sans-serif', '["300","400","500","600","700"]', 22),
  ('google', 'JetBrains Mono', 'monospace', '["100","200","300","400","500","600","700","800"]', 23),
  ('google', 'Roboto Slab', 'serif', '["100","200","300","400","500","600","700","800","900"]', 24),
  ('google', 'Libre Baskerville', 'serif', '["400","700"]', 25),
  ('google', 'Crimson Text', 'serif', '["400","600","700"]', 26),
  ('google', 'Lora', 'serif', '["400","500","600","700"]', 27),
  ('google', 'Josefin Sans', 'sans-serif', '["100","200","300","400","500","600","700"]', 28),
  ('google', 'Archivo', 'sans-serif', '["100","200","300","400","500","600","700","800","900"]', 29),
  ('google', 'Cabin', 'sans-serif', '["400","500","600","700"]', 30),
  ('google', 'Karla', 'sans-serif', '["200","300","400","500","600","700","800"]', 31),
  ('google', 'Manrope', 'sans-serif', '["200","300","400","500","600","700","800"]', 32),
  ('google', 'Bitter', 'serif', '["100","200","300","400","500","600","700","800","900"]', 33),
  ('google', 'EB Garamond', 'serif', '["400","500","600","700","800"]', 34),
  ('google', 'Spectral', 'serif', '["200","300","400","500","600","700","800"]', 35),
  ('google', 'IBM Plex Sans', 'sans-serif', '["100","200","300","400","500","600","700"]', 36),
  ('google', 'IBM Plex Serif', 'serif', '["100","200","300","400","500","600","700"]', 37),
  ('google', 'IBM Plex Mono', 'monospace', '["100","200","300","400","500","600","700"]', 38),
  ('google', 'Cormorant Garamond', 'serif', '["300","400","500","600","700"]', 39),
  ('google', 'Rubik', 'sans-serif', '["300","400","500","600","700","800","900"]', 40);

-- Seed default typography presets
INSERT INTO public.typography_presets (preset_name, description, category, is_system, assignments) VALUES
(
  'Professional',
  'Clean, business-appropriate typography with excellent readability',
  'professional',
  true,
  '[
    {"element_group":"headings","font_family":"Inter","font_source":"google","font_weight":"700","loaded_variants":["400","500","600","700"],"desktop_settings":{"fontSize":"32px","lineHeight":"1.2","letterSpacing":"-0.02em","textTransform":"none"},"tablet_settings":{"fontSize":"28px","lineHeight":"1.25","letterSpacing":"-0.01em","textTransform":"none"},"mobile_settings":{"fontSize":"24px","lineHeight":"1.3","letterSpacing":"0","textTransform":"none"}},
    {"element_group":"body","font_family":"Inter","font_source":"google","font_weight":"400","loaded_variants":["400","500","600"],"desktop_settings":{"fontSize":"16px","lineHeight":"1.6","letterSpacing":"0","textTransform":"none"},"tablet_settings":{"fontSize":"15px","lineHeight":"1.55","letterSpacing":"0","textTransform":"none"},"mobile_settings":{"fontSize":"14px","lineHeight":"1.5","letterSpacing":"0","textTransform":"none"}},
    {"element_group":"navigation","font_family":"Inter","font_source":"google","font_weight":"500","loaded_variants":["400","500","600"],"desktop_settings":{"fontSize":"14px","lineHeight":"1.4","letterSpacing":"0.01em","textTransform":"none"},"tablet_settings":{"fontSize":"14px","lineHeight":"1.4","letterSpacing":"0","textTransform":"none"},"mobile_settings":{"fontSize":"13px","lineHeight":"1.4","letterSpacing":"0","textTransform":"none"}},
    {"element_group":"buttons","font_family":"Inter","font_source":"google","font_weight":"500","loaded_variants":["500","600"],"desktop_settings":{"fontSize":"14px","lineHeight":"1","letterSpacing":"0.01em","textTransform":"none"},"tablet_settings":{"fontSize":"14px","lineHeight":"1","letterSpacing":"0","textTransform":"none"},"mobile_settings":{"fontSize":"13px","lineHeight":"1","letterSpacing":"0","textTransform":"none"}}
  ]'::jsonb
),
(
  'Modern',
  'Trendy, contemporary feel with geometric sans-serif fonts',
  'modern',
  true,
  '[
    {"element_group":"headings","font_family":"Space Grotesk","font_source":"google","font_weight":"700","loaded_variants":["400","500","600","700"],"desktop_settings":{"fontSize":"36px","lineHeight":"1.15","letterSpacing":"-0.03em","textTransform":"none"},"tablet_settings":{"fontSize":"30px","lineHeight":"1.2","letterSpacing":"-0.02em","textTransform":"none"},"mobile_settings":{"fontSize":"26px","lineHeight":"1.25","letterSpacing":"-0.01em","textTransform":"none"}},
    {"element_group":"body","font_family":"DM Sans","font_source":"google","font_weight":"400","loaded_variants":["400","500","700"],"desktop_settings":{"fontSize":"16px","lineHeight":"1.6","letterSpacing":"0","textTransform":"none"},"tablet_settings":{"fontSize":"15px","lineHeight":"1.55","letterSpacing":"0","textTransform":"none"},"mobile_settings":{"fontSize":"14px","lineHeight":"1.5","letterSpacing":"0","textTransform":"none"}},
    {"element_group":"navigation","font_family":"DM Sans","font_source":"google","font_weight":"500","loaded_variants":["400","500","600"],"desktop_settings":{"fontSize":"13px","lineHeight":"1.4","letterSpacing":"0.02em","textTransform":"uppercase"},"tablet_settings":{"fontSize":"13px","lineHeight":"1.4","letterSpacing":"0.01em","textTransform":"uppercase"},"mobile_settings":{"fontSize":"12px","lineHeight":"1.4","letterSpacing":"0.01em","textTransform":"none"}},
    {"element_group":"buttons","font_family":"Space Grotesk","font_source":"google","font_weight":"600","loaded_variants":["500","600"],"desktop_settings":{"fontSize":"14px","lineHeight":"1","letterSpacing":"0.01em","textTransform":"none"},"tablet_settings":{"fontSize":"14px","lineHeight":"1","letterSpacing":"0","textTransform":"none"},"mobile_settings":{"fontSize":"13px","lineHeight":"1","letterSpacing":"0","textTransform":"none"}}
  ]'::jsonb
),
(
  'Traditional',
  'Classic serif-based typography for a timeless, authoritative feel',
  'traditional',
  true,
  '[
    {"element_group":"headings","font_family":"Playfair Display","font_source":"google","font_weight":"700","loaded_variants":["400","500","600","700"],"desktop_settings":{"fontSize":"34px","lineHeight":"1.2","letterSpacing":"-0.01em","textTransform":"none"},"tablet_settings":{"fontSize":"28px","lineHeight":"1.25","letterSpacing":"0","textTransform":"none"},"mobile_settings":{"fontSize":"24px","lineHeight":"1.3","letterSpacing":"0","textTransform":"none"}},
    {"element_group":"body","font_family":"Merriweather","font_source":"google","font_weight":"400","loaded_variants":["300","400","700"],"desktop_settings":{"fontSize":"16px","lineHeight":"1.7","letterSpacing":"0","textTransform":"none"},"tablet_settings":{"fontSize":"15px","lineHeight":"1.65","letterSpacing":"0","textTransform":"none"},"mobile_settings":{"fontSize":"14px","lineHeight":"1.6","letterSpacing":"0","textTransform":"none"}},
    {"element_group":"navigation","font_family":"Merriweather","font_source":"google","font_weight":"400","loaded_variants":["400","700"],"desktop_settings":{"fontSize":"14px","lineHeight":"1.4","letterSpacing":"0.01em","textTransform":"none"},"tablet_settings":{"fontSize":"14px","lineHeight":"1.4","letterSpacing":"0","textTransform":"none"},"mobile_settings":{"fontSize":"13px","lineHeight":"1.4","letterSpacing":"0","textTransform":"none"}},
    {"element_group":"buttons","font_family":"Merriweather","font_source":"google","font_weight":"700","loaded_variants":["400","700"],"desktop_settings":{"fontSize":"14px","lineHeight":"1","letterSpacing":"0.02em","textTransform":"uppercase"},"tablet_settings":{"fontSize":"14px","lineHeight":"1","letterSpacing":"0.01em","textTransform":"uppercase"},"mobile_settings":{"fontSize":"13px","lineHeight":"1","letterSpacing":"0.01em","textTransform":"uppercase"}}
  ]'::jsonb
),
(
  'Accessible',
  'High readability focus with generous sizing and spacing',
  'accessible',
  true,
  '[
    {"element_group":"headings","font_family":"Noto Sans","font_source":"google","font_weight":"700","loaded_variants":["400","500","600","700"],"desktop_settings":{"fontSize":"34px","lineHeight":"1.3","letterSpacing":"0","textTransform":"none"},"tablet_settings":{"fontSize":"28px","lineHeight":"1.35","letterSpacing":"0","textTransform":"none"},"mobile_settings":{"fontSize":"24px","lineHeight":"1.4","letterSpacing":"0","textTransform":"none"}},
    {"element_group":"body","font_family":"Noto Sans","font_source":"google","font_weight":"400","loaded_variants":["400","500","700"],"desktop_settings":{"fontSize":"18px","lineHeight":"1.75","letterSpacing":"0.01em","textTransform":"none"},"tablet_settings":{"fontSize":"17px","lineHeight":"1.7","letterSpacing":"0.01em","textTransform":"none"},"mobile_settings":{"fontSize":"16px","lineHeight":"1.65","letterSpacing":"0","textTransform":"none"}},
    {"element_group":"navigation","font_family":"Noto Sans","font_source":"google","font_weight":"600","loaded_variants":["400","500","600"],"desktop_settings":{"fontSize":"16px","lineHeight":"1.4","letterSpacing":"0.02em","textTransform":"none"},"tablet_settings":{"fontSize":"15px","lineHeight":"1.4","letterSpacing":"0.01em","textTransform":"none"},"mobile_settings":{"fontSize":"15px","lineHeight":"1.4","letterSpacing":"0.01em","textTransform":"none"}},
    {"element_group":"buttons","font_family":"Noto Sans","font_source":"google","font_weight":"600","loaded_variants":["500","600","700"],"desktop_settings":{"fontSize":"16px","lineHeight":"1","letterSpacing":"0.02em","textTransform":"none"},"tablet_settings":{"fontSize":"15px","lineHeight":"1","letterSpacing":"0.01em","textTransform":"none"},"mobile_settings":{"fontSize":"15px","lineHeight":"1","letterSpacing":"0.01em","textTransform":"none"}}
  ]'::jsonb
);

-- Seed default published typography (current brand: Space Grotesk headings, DM Sans body)
INSERT INTO public.typography_assignments (is_draft, element_group, font_family, font_source, loaded_variants, font_weight, desktop_settings, tablet_settings, mobile_settings) VALUES
  (false, 'headings', 'Space Grotesk', 'google', '["400","500","600","700"]', '700', '{"fontSize":"32px","lineHeight":"1.2","letterSpacing":"-0.02em","textTransform":"none"}', '{"fontSize":"28px","lineHeight":"1.25","letterSpacing":"-0.01em","textTransform":"none"}', '{"fontSize":"24px","lineHeight":"1.3","letterSpacing":"0","textTransform":"none"}'),
  (false, 'body', 'DM Sans', 'google', '["400","500","700"]', '400', '{"fontSize":"16px","lineHeight":"1.6","letterSpacing":"0","textTransform":"none"}', '{"fontSize":"15px","lineHeight":"1.55","letterSpacing":"0","textTransform":"none"}', '{"fontSize":"14px","lineHeight":"1.5","letterSpacing":"0","textTransform":"none"}'),
  (false, 'navigation', 'DM Sans', 'google', '["400","500","600"]', '500', '{"fontSize":"14px","lineHeight":"1.4","letterSpacing":"0.01em","textTransform":"none"}', '{"fontSize":"14px","lineHeight":"1.4","letterSpacing":"0","textTransform":"none"}', '{"fontSize":"13px","lineHeight":"1.4","letterSpacing":"0","textTransform":"none"}'),
  (false, 'buttons', 'DM Sans', 'google', '["500","600","700"]', '500', '{"fontSize":"14px","lineHeight":"1","letterSpacing":"0.01em","textTransform":"none"}', '{"fontSize":"14px","lineHeight":"1","letterSpacing":"0","textTransform":"none"}', '{"fontSize":"13px","lineHeight":"1","letterSpacing":"0","textTransform":"none"}'),
  (false, 'forms', 'DM Sans', 'google', '["400","500"]', '400', '{"fontSize":"14px","lineHeight":"1.4","letterSpacing":"0","textTransform":"none"}', '{"fontSize":"14px","lineHeight":"1.4","letterSpacing":"0","textTransform":"none"}', '{"fontSize":"14px","lineHeight":"1.4","letterSpacing":"0","textTransform":"none"}'),
  (false, 'special', 'JetBrains Mono', 'google', '["400","500"]', '400', '{"fontSize":"14px","lineHeight":"1.5","letterSpacing":"0","textTransform":"none"}', '{"fontSize":"13px","lineHeight":"1.5","letterSpacing":"0","textTransform":"none"}', '{"fontSize":"13px","lineHeight":"1.5","letterSpacing":"0","textTransform":"none"}'),
  (false, 'brand', 'Space Grotesk', 'google', '["400","500","600","700"]', '700', '{"fontSize":"28px","lineHeight":"1.1","letterSpacing":"-0.02em","textTransform":"none"}', '{"fontSize":"24px","lineHeight":"1.15","letterSpacing":"-0.01em","textTransform":"none"}', '{"fontSize":"20px","lineHeight":"1.2","letterSpacing":"0","textTransform":"none"}');

-- Also seed the draft copies
INSERT INTO public.typography_assignments (is_draft, element_group, font_family, font_source, loaded_variants, font_weight, desktop_settings, tablet_settings, mobile_settings) VALUES
  (true, 'headings', 'Space Grotesk', 'google', '["400","500","600","700"]', '700', '{"fontSize":"32px","lineHeight":"1.2","letterSpacing":"-0.02em","textTransform":"none"}', '{"fontSize":"28px","lineHeight":"1.25","letterSpacing":"-0.01em","textTransform":"none"}', '{"fontSize":"24px","lineHeight":"1.3","letterSpacing":"0","textTransform":"none"}'),
  (true, 'body', 'DM Sans', 'google', '["400","500","700"]', '400', '{"fontSize":"16px","lineHeight":"1.6","letterSpacing":"0","textTransform":"none"}', '{"fontSize":"15px","lineHeight":"1.55","letterSpacing":"0","textTransform":"none"}', '{"fontSize":"14px","lineHeight":"1.5","letterSpacing":"0","textTransform":"none"}'),
  (true, 'navigation', 'DM Sans', 'google', '["400","500","600"]', '500', '{"fontSize":"14px","lineHeight":"1.4","letterSpacing":"0.01em","textTransform":"none"}', '{"fontSize":"14px","lineHeight":"1.4","letterSpacing":"0","textTransform":"none"}', '{"fontSize":"13px","lineHeight":"1.4","letterSpacing":"0","textTransform":"none"}'),
  (true, 'buttons', 'DM Sans', 'google', '["500","600","700"]', '500', '{"fontSize":"14px","lineHeight":"1","letterSpacing":"0.01em","textTransform":"none"}', '{"fontSize":"14px","lineHeight":"1","letterSpacing":"0","textTransform":"none"}', '{"fontSize":"13px","lineHeight":"1","letterSpacing":"0","textTransform":"none"}'),
  (true, 'forms', 'DM Sans', 'google', '["400","500"]', '400', '{"fontSize":"14px","lineHeight":"1.4","letterSpacing":"0","textTransform":"none"}', '{"fontSize":"14px","lineHeight":"1.4","letterSpacing":"0","textTransform":"none"}', '{"fontSize":"14px","lineHeight":"1.4","letterSpacing":"0","textTransform":"none"}'),
  (true, 'special', 'JetBrains Mono', 'google', '["400","500"]', '400', '{"fontSize":"14px","lineHeight":"1.5","letterSpacing":"0","textTransform":"none"}', '{"fontSize":"13px","lineHeight":"1.5","letterSpacing":"0","textTransform":"none"}', '{"fontSize":"13px","lineHeight":"1.5","letterSpacing":"0","textTransform":"none"}'),
  (true, 'brand', 'Space Grotesk', 'google', '["400","500","600","700"]', '700', '{"fontSize":"28px","lineHeight":"1.1","letterSpacing":"-0.02em","textTransform":"none"}', '{"fontSize":"24px","lineHeight":"1.15","letterSpacing":"-0.01em","textTransform":"none"}', '{"fontSize":"20px","lineHeight":"1.2","letterSpacing":"0","textTransform":"none"}');
