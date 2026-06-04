-- Super Admin: Executive Dashboard
INSERT INTO public.cms_menu_items (menu_id, label, item_type, target_path, icon_name, sort_order, is_active)
VALUES ('4e945420-16ec-4834-965c-1d03dafbd197', 'Executive Dashboard', 'built_in', '/executive-dashboard', 'TrendingUp', 51, true);

-- Operations: missing items
INSERT INTO public.cms_menu_items (menu_id, label, item_type, target_path, icon_name, sort_order, is_active)
VALUES
  ('7c018e90-f1b6-413c-85bb-03618275a0b4', 'Executive Dashboard', 'built_in', '/executive-dashboard', 'TrendingUp', 51, true),
  ('7c018e90-f1b6-413c-85bb-03618275a0b4', 'Reports & Analytics', 'built_in', '/analytics', 'BarChart3', 52, true),
  ('7c018e90-f1b6-413c-85bb-03618275a0b4', 'Escalations', 'built_in', '/operations', 'Flag', 53, true),
  ('7c018e90-f1b6-413c-85bb-03618275a0b4', 'Programme Hub', 'built_in', '/programmes', 'Layers', 54, true),
  ('7c018e90-f1b6-413c-85bb-03618275a0b4', 'Staff Allocation', 'built_in', '/staff/onboarding', 'Users', 55, true),
  ('7c018e90-f1b6-413c-85bb-03618275a0b4', 'Staff Compliance', 'built_in', '/sponsor/compliance', 'ShieldCheck', 56, true);

-- Programme Manager: missing items
INSERT INTO public.cms_menu_items (menu_id, label, item_type, target_path, icon_name, sort_order, is_active)
VALUES
  ('e9bfd7ac-a46f-4231-9706-bcffaa18dd31', 'Shared Content Library', 'built_in', '/shared-content', 'FolderKanban', 51, true),
  ('e9bfd7ac-a46f-4231-9706-bcffaa18dd31', 'Challenge Exams', 'built_in', '/challenge-exams', 'Trophy', 52, true);

-- Sponsor: missing item
INSERT INTO public.cms_menu_items (menu_id, label, item_type, target_path, icon_name, sort_order, is_active)
VALUES ('40f6f160-6982-4088-b5bb-ddba72334e0f', 'Progress Tracking', 'built_in', '/sponsor/learners', 'TrendingUp', 15, true);

-- Facilitator: missing items
INSERT INTO public.cms_menu_items (menu_id, label, item_type, target_path, icon_name, sort_order, is_active)
VALUES
  ('4573ee2e-9e7e-4e02-8539-526cbc06983e', 'Attendance Tracking', 'built_in', '/sessions', 'ListChecks', 13, true),
  ('4573ee2e-9e7e-4e02-8539-526cbc06983e', 'Grade Entry', 'built_in', '/assessments', 'FileCheck', 14, true);

-- Assessor: missing item
INSERT INTO public.cms_menu_items (menu_id, label, item_type, target_path, icon_name, sort_order, is_active)
VALUES ('aec16a89-e44f-4ec5-bfdb-57df80852911', 'Grade Entry', 'built_in', '/assessor/queue', 'ClipboardCheck', 17, true);