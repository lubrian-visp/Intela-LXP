import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WbtSprintReportButtonProps {
  projectId: string;
  projectTitle?: string;
}

export default function WbtSprintReportButton({ projectId, projectTitle }: WbtSprintReportButtonProps) {
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("wbt-sprint-report", {
        body: { project_id: projectId },
      });
      if (error) throw error;

      const html = data?.html;
      if (!html) throw new Error("No report data returned");

      // Open in new window for printing/saving as PDF
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        // Auto-trigger print dialog after a short delay
        setTimeout(() => printWindow.print(), 500);
      } else {
        // Fallback: download as HTML
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sprint-report-${projectTitle || projectId.slice(0, 8)}.html`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({ title: "Sprint report generated" });
    } catch (err: any) {
      toast({ title: "Failed to generate report", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={generateReport} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      Sprint Report
    </Button>
  );
}
