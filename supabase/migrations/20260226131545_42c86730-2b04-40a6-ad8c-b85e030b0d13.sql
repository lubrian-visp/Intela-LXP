
-- Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'systems_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'talent_manager';
