import { usePlatformSettings } from "@/hooks/usePlatformSettings";

export function useBrandingLogos() {
  const { data: settings } = usePlatformSettings("branding");

  const headerLogo = settings?.find((s) => s.setting_key === "logo_header")?.setting_value || "";
  const footerLogo = settings?.find((s) => s.setting_key === "logo_footer")?.setting_value || "";
  const favicon = settings?.find((s) => s.setting_key === "logo_favicon")?.setting_value || "";
  const headerLogoWidth = parseInt(settings?.find((s) => s.setting_key === "logo_header_width")?.setting_value || "140", 10);
  const footerLogoWidth = parseInt(settings?.find((s) => s.setting_key === "logo_footer_width")?.setting_value || "140", 10);

  return { headerLogo, footerLogo, favicon, headerLogoWidth, footerLogoWidth };
}
