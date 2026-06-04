CREATE OR REPLACE FUNCTION public.auto_generate_portal_for_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _template record;
  _default_menu jsonb;
  _default_widgets jsonb;
  _domain_label text;
BEGIN
  IF NEW.is_predefined IS TRUE THEN
    RETURN NEW;
  END IF;

  IF NEW.template_source_id IS NOT NULL THEN
    SELECT menu_config, widget_config, portal_title, portal_subtitle, dashboard_path
    INTO _template
    FROM public.role_definitions
    WHERE id = NEW.template_source_id;

    IF FOUND THEN
      IF NEW.menu_config IS NULL OR NEW.menu_config = '[]'::jsonb THEN
        NEW.menu_config := COALESCE(_template.menu_config, '[]'::jsonb);
      END IF;
      IF NEW.widget_config IS NULL OR NEW.widget_config = '[]'::jsonb THEN
        NEW.widget_config := COALESCE(_template.widget_config, '[]'::jsonb);
      END IF;
    END IF;
  END IF;

  _domain_label := CASE NEW.domain
    WHEN 'technical' THEN 'Technical Operations'
    WHEN 'business' THEN 'Business Operations'
    WHEN 'learning_development' THEN 'Learning & Development'
    ELSE 'Custom'
  END;

  IF NEW.dashboard_path IS NULL OR NEW.dashboard_path = '' THEN
    NEW.dashboard_path := '/portal/' || NEW.role_key;
  END IF;

  IF NEW.portal_title IS NULL OR NEW.portal_title = '' THEN
    NEW.portal_title := NEW.display_name || ' Portal';
  END IF;
  IF NEW.portal_subtitle IS NULL OR NEW.portal_subtitle = '' THEN
    NEW.portal_subtitle := _domain_label;
  END IF;

  _default_menu := jsonb_build_array(
    jsonb_build_object(
      'title', 'Overview',
      'items', jsonb_build_array(
        jsonb_build_object('label', 'My Dashboard',  'icon', 'LayoutDashboard', 'path', '/portal/' || NEW.role_key),
        jsonb_build_object('label', 'My Tasks',      'icon', 'CheckSquare',     'path', '/portal/' || NEW.role_key || '/tasks'),
        jsonb_build_object('label', 'Calendar',      'icon', 'Calendar',        'path', '/calendar'),
        jsonb_build_object('label', 'Notifications', 'icon', 'Bell',            'path', '/portal/' || NEW.role_key || '/notifications')
      )
    ),
    jsonb_build_object(
      'title', 'Account',
      'items', jsonb_build_array(
        jsonb_build_object('label', 'My Profile',  'icon', 'User',     'path', '/my-profile'),
        jsonb_build_object('label', 'My Settings', 'icon', 'Settings', 'path', '/my-settings')
      )
    )
  );

  _default_widgets := jsonb_build_array(
    jsonb_build_object('id', 'welcome',         'type', 'welcome_card',    'title', 'Welcome', 'col_span', 3),
    jsonb_build_object('id', 'pending_tasks',   'type', 'stat_card',       'title', 'Pending Tasks',        'metric', 'pending_tasks_count',  'icon', 'CheckSquare', 'col_span', 1),
    jsonb_build_object('id', 'notifications',   'type', 'stat_card',       'title', 'Unread Notifications', 'metric', 'unread_notifications', 'icon', 'Bell',         'col_span', 1),
    jsonb_build_object('id', 'calendar_today',  'type', 'stat_card',       'title', 'Events Today',         'metric', 'events_today',         'icon', 'Calendar',     'col_span', 1),
    jsonb_build_object('id', 'recent_activity', 'type', 'recent_activity', 'title', 'Recent Activity', 'col_span', 2),
    jsonb_build_object('id', 'quick_actions',   'type', 'quick_actions',   'title', 'Quick Actions',   'col_span', 1)
  );

  IF NEW.menu_config IS NULL OR NEW.menu_config = '[]'::jsonb THEN
    NEW.menu_config := _default_menu;
  END IF;
  IF NEW.widget_config IS NULL OR NEW.widget_config = '[]'::jsonb THEN
    NEW.widget_config := _default_widgets;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_generate_portal_for_role ON public.role_definitions;
CREATE TRIGGER trg_auto_generate_portal_for_role
BEFORE INSERT ON public.role_definitions
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_portal_for_role();

UPDATE public.role_definitions
SET dashboard_path = COALESCE(NULLIF(dashboard_path, ''), '/portal/' || role_key),
    portal_title   = COALESCE(NULLIF(portal_title, ''),   display_name || ' Portal'),
    portal_subtitle = COALESCE(NULLIF(portal_subtitle, ''),
        CASE domain
          WHEN 'technical' THEN 'Technical Operations'
          WHEN 'business' THEN 'Business Operations'
          WHEN 'learning_development' THEN 'Learning & Development'
          ELSE 'Custom' END),
    menu_config = CASE
      WHEN menu_config IS NULL OR menu_config = '[]'::jsonb THEN
        jsonb_build_array(
          jsonb_build_object('title', 'Overview', 'items', jsonb_build_array(
            jsonb_build_object('label', 'My Dashboard',  'icon', 'LayoutDashboard', 'path', '/portal/' || role_key),
            jsonb_build_object('label', 'My Tasks',      'icon', 'CheckSquare',     'path', '/portal/' || role_key || '/tasks'),
            jsonb_build_object('label', 'Calendar',      'icon', 'Calendar',        'path', '/calendar'),
            jsonb_build_object('label', 'Notifications', 'icon', 'Bell',            'path', '/portal/' || role_key || '/notifications')
          )),
          jsonb_build_object('title', 'Account', 'items', jsonb_build_array(
            jsonb_build_object('label', 'My Profile',  'icon', 'User',     'path', '/my-profile'),
            jsonb_build_object('label', 'My Settings', 'icon', 'Settings', 'path', '/my-settings')
          ))
        )
      ELSE menu_config END,
    widget_config = CASE
      WHEN widget_config IS NULL OR widget_config = '[]'::jsonb THEN
        jsonb_build_array(
          jsonb_build_object('id', 'welcome',         'type', 'welcome_card',    'title', 'Welcome', 'col_span', 3),
          jsonb_build_object('id', 'pending_tasks',   'type', 'stat_card',       'title', 'Pending Tasks',        'metric', 'pending_tasks_count',  'icon', 'CheckSquare', 'col_span', 1),
          jsonb_build_object('id', 'notifications',   'type', 'stat_card',       'title', 'Unread Notifications', 'metric', 'unread_notifications', 'icon', 'Bell',         'col_span', 1),
          jsonb_build_object('id', 'calendar_today',  'type', 'stat_card',       'title', 'Events Today',         'metric', 'events_today',         'icon', 'Calendar',     'col_span', 1),
          jsonb_build_object('id', 'recent_activity', 'type', 'recent_activity', 'title', 'Recent Activity', 'col_span', 2),
          jsonb_build_object('id', 'quick_actions',   'type', 'quick_actions',   'title', 'Quick Actions',   'col_span', 1)
        )
      ELSE widget_config END
WHERE is_predefined = false;