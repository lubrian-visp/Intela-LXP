import { useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";

/**
 * Converts a hex color (#RRGGBB) to HSL string "H S% L%"
 * suitable for CSS variables consumed by Tailwind hsl(var(--primary)).
 */
function hexToHsl(hex: string): string | null {
  if (!hex) return null;
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;

  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let sat = 0;
  const light = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hue = (b - r) / d + 2; break;
      case b: hue = (r - g) / d + 4; break;
    }
    hue /= 6;
  }

  return `${Math.round(hue * 360)} ${Math.round(sat * 100)}% ${Math.round(light * 100)}%`;
}

function setFavicon(url: string | null) {
  if (!url) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

/**
 * Applies the active tenant's branding (primary/secondary colors, favicon)
 * at runtime by overriding CSS variables on :root. Reverts to defaults
 * when no tenant is active.
 */
export function useTenantBranding() {
  const { currentTenant } = useTenant();

  useEffect(() => {
    const root = document.documentElement;
    if (!currentTenant) {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--accent");
      return;
    }

    const primary = hexToHsl(currentTenant.primary_color || "");
    const secondary = hexToHsl(currentTenant.secondary_color || "");

    if (primary) root.style.setProperty("--primary", primary);
    if (secondary) root.style.setProperty("--accent", secondary);
    if (currentTenant.favicon_url) setFavicon(currentTenant.favicon_url);

    // Set document title prefix
    if (currentTenant.name) {
      const baseTitle = document.title.split(" — ").pop() || document.title;
      document.title = `${currentTenant.name} — ${baseTitle}`;
    }
  }, [currentTenant?.id, currentTenant?.primary_color, currentTenant?.secondary_color, currentTenant?.favicon_url]);
}

/**
 * Wrapper component that activates tenant branding for its subtree.
 */
export function TenantBrandingProvider({ children }: { children: React.ReactNode }) {
  useTenantBranding();
  return <>{children}</>;
}
