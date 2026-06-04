import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CertificateTemplate {
  id: string;
  name: string;
  programme_type_id: string | null;
  programme_id: string | null;
  template_html: string;
  background_color: string;
  accent_color: string;
  logo_url: string | null;
  signatory_name: string | null;
  signatory_title: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch certificate templates */
export function useCertificateTemplates(programmeId?: string) {
  return useQuery({
    queryKey: ["certificate_templates", programmeId],
    queryFn: async () => {
      let query = supabase.from("certificate_templates").select("*").order("created_at", { ascending: false });
      if (programmeId) {
        query = query.or(`programme_id.eq.${programmeId},is_default.eq.true`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as CertificateTemplate[];
    },
  });
}

/** Create certificate template */
export function useCreateCertificateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CertificateTemplate>) => {
      const { data, error } = await supabase.from("certificate_templates").insert(input as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certificate_templates"] });
      toast.success("Certificate template created");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

/**
 * Generate a certificate PDF in the browser using HTML-to-canvas approach.
 * Returns a data URL of the generated certificate.
 */
export function generateCertificateHTML(params: {
  learnerName: string;
  programmeTitle: string;
  completionDate: string;
  credentialHash?: string;
  template?: CertificateTemplate;
}): string {
  const t = params.template;
  const bgColor = t?.background_color || "#ffffff";
  const accentColor = t?.accent_color || "#1a365d";
  const sigName = t?.signatory_name || "Programme Director";
  const sigTitle = t?.signatory_title || "Intela SkillChain";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: ${bgColor}; font-family: 'Inter', sans-serif; }
        .cert-container {
          width: 1056px; height: 816px;
          padding: 48px; position: relative;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          background: ${bgColor};
        }
        .cert-border {
          position: absolute; inset: 16px;
          border: 3px solid ${accentColor};
          border-radius: 4px;
        }
        .cert-border-inner {
          position: absolute; inset: 24px;
          border: 1px solid ${accentColor}40;
        }
        .cert-header {
          font-family: 'Playfair Display', serif;
          font-size: 14px; letter-spacing: 6px;
          text-transform: uppercase; color: ${accentColor};
          margin-bottom: 8px;
        }
        .cert-title {
          font-family: 'Playfair Display', serif;
          font-size: 42px; font-weight: 700;
          color: ${accentColor}; margin-bottom: 24px;
        }
        .cert-subtitle { font-size: 14px; color: #666; margin-bottom: 16px; }
        .cert-name {
          font-family: 'Playfair Display', serif;
          font-size: 36px; font-weight: 400;
          color: ${accentColor}; margin-bottom: 24px;
          border-bottom: 2px solid ${accentColor}30;
          padding-bottom: 8px; min-width: 400px;
          text-align: center;
        }
        .cert-programme {
          font-size: 20px; font-weight: 500;
          color: #333; margin-bottom: 32px;
        }
        .cert-date { font-size: 13px; color: #888; margin-bottom: 40px; }
        .cert-footer {
          display: flex; gap: 120px;
          align-items: flex-end; margin-top: auto;
        }
        .cert-signature {
          text-align: center; min-width: 200px;
        }
        .cert-sig-line {
          border-top: 1px solid #999; padding-top: 8px;
          font-size: 13px; font-weight: 500; color: #333;
        }
        .cert-sig-title { font-size: 11px; color: #888; margin-top: 2px; }
        .cert-hash {
          position: absolute; bottom: 24px; right: 32px;
          font-size: 8px; color: #bbb; font-family: monospace;
        }
        .cert-ornament {
          width: 60px; height: 2px;
          background: ${accentColor};
          margin: 0 auto 16px;
        }
      </style>
    </head>
    <body>
      <div class="cert-container">
        <div class="cert-border"></div>
        <div class="cert-border-inner"></div>
        <p class="cert-header">Certificate of Completion</p>
        <div class="cert-ornament"></div>
        <h1 class="cert-title">Intela SkillChain</h1>
        <p class="cert-subtitle">This is to certify that</p>
        <p class="cert-name">${params.learnerName}</p>
        <p class="cert-subtitle">has successfully completed the programme</p>
        <p class="cert-programme">${params.programmeTitle}</p>
        <p class="cert-date">Completed on ${params.completionDate}</p>
        <div class="cert-footer">
          <div class="cert-signature">
            <p class="cert-sig-line">${sigName}</p>
            <p class="cert-sig-title">${sigTitle}</p>
          </div>
        </div>
        ${params.credentialHash ? `<p class="cert-hash">Verification: ${params.credentialHash}</p>` : ""}
      </div>
    </body>
    </html>
  `;
}

/**
 * Print/download certificate by rendering HTML in a new window
 */
export function printCertificate(html: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Pop-up blocked. Please allow pop-ups to download your certificate.");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}
