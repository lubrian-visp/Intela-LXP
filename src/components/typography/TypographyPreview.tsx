import { useState, useEffect } from "react";
import { Monitor, Tablet, Smartphone, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadGoogleFont, type TypographyAssignment } from "@/hooks/useTypographyManager";

interface TypographyPreviewProps {
  assignments: TypographyAssignment[];
}

type Device = "desktop" | "tablet" | "mobile";

export default function TypographyPreview({ assignments }: TypographyPreviewProps) {
  const [device, setDevice] = useState<Device>("desktop");
  const [darkMode, setDarkMode] = useState(false);

  // Load all fonts
  useEffect(() => {
    assignments.forEach((a) => {
      if (a.font_source === "google") {
        loadGoogleFont(a.font_family, a.loaded_variants);
      }
    });
  }, [assignments]);

  const getAssignment = (group: string) => assignments.find((a) => a.element_group === group);
  const getSettings = (a: TypographyAssignment | undefined) => {
    if (!a) return {};
    const key = `${device}_settings` as "desktop_settings" | "tablet_settings" | "mobile_settings";
    const s = a[key] as any;
    return {
      fontFamily: `'${a.font_family}', sans-serif`,
      fontWeight: a.font_weight,
      fontSize: s?.fontSize,
      lineHeight: s?.lineHeight,
      letterSpacing: s?.letterSpacing,
      textTransform: s?.textTransform,
    };
  };

  const headingStyle = getSettings(getAssignment("headings"));
  const bodyStyle = getSettings(getAssignment("body"));
  const navStyle = getSettings(getAssignment("navigation"));
  const buttonStyle = getSettings(getAssignment("buttons"));
  const formStyle = getSettings(getAssignment("forms"));
  const specialStyle = getSettings(getAssignment("special"));

  const widthMap = { desktop: "100%", tablet: "768px", mobile: "375px" };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {(["desktop", "tablet", "mobile"] as Device[]).map((d) => {
          const icons = { desktop: Monitor, tablet: Tablet, mobile: Smartphone };
          const Icon = icons[d];
          return (
            <Button key={d} variant={device === d ? "default" : "outline"} size="sm" onClick={() => setDevice(d)} className="gap-1.5 capitalize">
              <Icon className="w-3.5 h-3.5" />
              {d}
            </Button>
          );
        })}
        <Button variant="outline" size="sm" onClick={() => setDarkMode(!darkMode)} className="ml-auto gap-1.5">
          {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          {darkMode ? "Light" : "Dark"} Mode
        </Button>
      </div>

      {/* Preview Container */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div
          className="mx-auto transition-all duration-300 overflow-hidden"
          style={{
            maxWidth: widthMap[device],
            backgroundColor: darkMode ? "hsl(209, 50%, 6%)" : "hsl(0, 0%, 98%)",
            color: darkMode ? "hsl(0, 0%, 98%)" : "hsl(209, 69%, 18%)",
          }}
        >
          {/* Fake Nav */}
          <div className="border-b px-6 py-3 flex items-center gap-4" style={{ borderColor: darkMode ? "hsl(209,30%,18%)" : "hsl(210,13%,91%)" }}>
            <span style={navStyle as any} className="font-semibold">Brand Logo</span>
            <div className="flex gap-3 ml-auto">
              {["Home", "Programmes", "About", "Contact"].map((item) => (
                <span key={item} style={navStyle as any} className="opacity-80 hover:opacity-100 cursor-pointer">{item}</span>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div>
              <h1 style={{ ...headingStyle, fontSize: headingStyle.fontSize } as any}>Welcome to the Platform</h1>
              <h2 style={{ ...headingStyle, fontSize: `calc(${headingStyle.fontSize || "32px"} * 0.75)` } as any} className="mt-3 opacity-80">Empowering learners across Africa</h2>
            </div>

            <p style={bodyStyle as any}>
              Our comprehensive learning management system delivers accredited programmes with full compliance tracking, 
              assessment management, and credential issuance. Built for the modern educational landscape.
            </p>

            <div style={bodyStyle as any}>
              <ul className="list-disc pl-5 space-y-1">
                <li>Accredited programme delivery</li>
                <li>Skills development compliance</li>
                <li>Digital credential verification</li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                style={buttonStyle as any}
                className="px-5 py-2.5 rounded-md text-white"
                {...{ style: { ...buttonStyle, backgroundColor: "hsl(27, 90%, 52%)", color: "#fff", border: "none", cursor: "pointer" } as any }}
              >
                Get Started
              </button>
              <button
                style={{ ...buttonStyle, border: "1px solid currentColor", background: "transparent", cursor: "pointer", padding: "0.625rem 1.25rem", borderRadius: "0.375rem" } as any}
              >
                Learn More
              </button>
            </div>

            {/* Form */}
            <div className="space-y-2 max-w-sm">
              <label style={formStyle as any} className="block font-medium">Email Address</label>
              <input
                placeholder="you@example.com"
                style={{ ...formStyle, padding: "0.5rem 0.75rem", border: "1px solid", borderColor: darkMode ? "hsl(209,30%,25%)" : "hsl(210,13%,91%)", borderRadius: "0.375rem", width: "100%", background: "transparent" } as any}
              />
            </div>

            {/* Special */}
            <blockquote
              style={{ ...specialStyle, borderLeft: "3px solid hsl(27,90%,52%)", paddingLeft: "1rem" } as any}
              className="opacity-80 italic"
            >
              "Education is the most powerful weapon which you can use to change the world." — Nelson Mandela
            </blockquote>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-2">
        {assignments.map((a) => (
          <Badge key={a.id} variant="outline" className="text-[10px]">
            {a.element_group}: {a.font_family} ({a.font_weight})
          </Badge>
        ))}
      </div>
    </div>
  );
}
