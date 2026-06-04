import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { loadGoogleFont, type TypographyAssignment, type TypographySettings } from "@/hooks/useTypographyManager";

const db = supabase as any;

/**
 * TypographyProvider - Applies published typography settings site-wide via CSS custom properties.
 * Mount once at the app root level.
 */
export default function TypographyProvider() {
  const { data: assignments } = useQuery({
    queryKey: ["typography-assignments", false],
    queryFn: async () => {
      const { data, error } = await db
        .from("typography_assignments")
        .select("*")
        .eq("is_draft", false)
        .order("element_group");
      if (error) throw error;
      return data as TypographyAssignment[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 min
  });

  useEffect(() => {
    if (!assignments || assignments.length === 0) return;

    // Load required Google Fonts
    const googleFonts = new Map<string, string[]>();
    assignments.forEach((a) => {
      if (a.font_source === "google") {
        const existing = googleFonts.get(a.font_family) || [];
        const merged = [...new Set([...existing, ...a.loaded_variants])];
        googleFonts.set(a.font_family, merged);
      }
    });
    googleFonts.forEach((weights, family) => loadGoogleFont(family, weights));

    // Generate CSS custom properties
    const root = document.documentElement;
    const getSettings = (a: TypographyAssignment, device: string): TypographySettings => {
      const key = `${device}_settings` as keyof TypographyAssignment;
      return (a[key] as TypographySettings) || { fontSize: "16px", lineHeight: "1.5", letterSpacing: "0", textTransform: "none" };
    };

    assignments.forEach((a) => {
      const prefix = `--typo-${a.element_group}`;
      const fallback = a.element_group === "special" ? "monospace" : "sans-serif";
      root.style.setProperty(`${prefix}-family`, `'${a.font_family}', ${fallback}`);
      root.style.setProperty(`${prefix}-weight`, a.font_weight);

      // Desktop settings (default)
      const desktop = getSettings(a, "desktop");
      root.style.setProperty(`${prefix}-size`, desktop.fontSize || "16px");
      root.style.setProperty(`${prefix}-line-height`, desktop.lineHeight || "1.5");
      root.style.setProperty(`${prefix}-letter-spacing`, desktop.letterSpacing || "0");
      root.style.setProperty(`${prefix}-transform`, desktop.textTransform || "none");
    });

    // Generate responsive styles
    const tabletStyles: string[] = [];
    const mobileStyles: string[] = [];

    assignments.forEach((a) => {
      const prefix = `--typo-${a.element_group}`;
      const tablet = getSettings(a, "tablet");
      const mobile = getSettings(a, "mobile");

      if (tablet.fontSize) tabletStyles.push(`${prefix}-size: ${tablet.fontSize};`);
      if (tablet.lineHeight) tabletStyles.push(`${prefix}-line-height: ${tablet.lineHeight};`);
      if (tablet.letterSpacing) tabletStyles.push(`${prefix}-letter-spacing: ${tablet.letterSpacing};`);

      if (mobile.fontSize) mobileStyles.push(`${prefix}-size: ${mobile.fontSize};`);
      if (mobile.lineHeight) mobileStyles.push(`${prefix}-line-height: ${mobile.lineHeight};`);
      if (mobile.letterSpacing) mobileStyles.push(`${prefix}-letter-spacing: ${mobile.letterSpacing};`);
    });

    // Inject responsive stylesheet
    let styleEl = document.getElementById("typography-responsive");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "typography-responsive";
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      @media (max-width: 1023px) and (min-width: 768px) {
        :root { ${tabletStyles.join(" ")} }
      }
      @media (max-width: 767px) {
        :root { ${mobileStyles.join(" ")} }
      }

      /* Apply typography to elements */
      h1, h2, h3, h4, h5, h6 {
        font-family: var(--typo-headings-family, inherit);
        font-weight: var(--typo-headings-weight, 700);
        letter-spacing: var(--typo-headings-letter-spacing, -0.02em);
        text-transform: var(--typo-headings-transform, none);
      }

      body {
        font-family: var(--typo-body-family, system-ui, sans-serif);
        font-weight: var(--typo-body-weight, 400);
        line-height: var(--typo-body-line-height, 1.6);
        letter-spacing: var(--typo-body-letter-spacing, 0);
      }

      nav, [data-nav], .sidebar-nav {
        font-family: var(--typo-navigation-family, inherit);
        font-weight: var(--typo-navigation-weight, 500);
        letter-spacing: var(--typo-navigation-letter-spacing, 0);
        text-transform: var(--typo-navigation-transform, none);
      }

      button, [role="button"], .btn {
        font-family: var(--typo-buttons-family, inherit);
        font-weight: var(--typo-buttons-weight, 500);
        letter-spacing: var(--typo-buttons-letter-spacing, 0);
        text-transform: var(--typo-buttons-transform, none);
      }

      input, textarea, select, label, .form-label {
        font-family: var(--typo-forms-family, inherit);
        font-weight: var(--typo-forms-weight, 400);
      }

      code, pre, .code-block, blockquote {
        font-family: var(--typo-special-family, monospace);
        font-weight: var(--typo-special-weight, 400);
      }
    `;

    return () => {
      // Cleanup on unmount
      styleEl?.remove();
    };
  }, [assignments]);

  return null; // Render nothing, side-effect only
}
