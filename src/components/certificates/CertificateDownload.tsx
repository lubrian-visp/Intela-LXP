import { useState } from "react";
import { useCertificateTemplates, generateCertificateHTML, printCertificate } from "@/hooks/useCertificates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Download, FileText, Loader2, Award, Eye } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface CertificateDownloadProps {
  learnerName: string;
  programmeTitle: string;
  completionDate: string;
  credentialHash?: string;
  programmeId?: string;
}

export default function CertificateDownload({
  learnerName, programmeTitle, completionDate, credentialHash, programmeId,
}: CertificateDownloadProps) {
  const { data: templates = [] } = useCertificateTemplates(programmeId);
  const [previewing, setPreviewing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const template = templates.find((t) => t.programme_id === programmeId) || templates.find((t) => t.is_default) || undefined;

  const handlePreview = () => {
    const html = generateCertificateHTML({
      learnerName, programmeTitle, completionDate, credentialHash, template,
    });
    setPreviewHtml(html);
    setPreviewing(true);
  };

  const handleDownload = () => {
    const html = generateCertificateHTML({
      learnerName, programmeTitle, completionDate, credentialHash, template,
    });
    printCertificate(html);
  };

  return (
    <>
      <div className="bg-card rounded-xl p-5 border border-border/50 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Award className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Certificate Available</h3>
            <p className="text-[10px] text-muted-foreground">{programmeTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-4">
          <span>Completed: {completionDate}</span>
          {credentialHash && (
            <Badge variant="outline" className="text-[8px] font-mono">
              {credentialHash.substring(0, 12)}...
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={handlePreview}>
            <Eye className="w-3 h-3" /> Preview
          </Button>
          <Button size="sm" className="gap-1.5 text-xs h-8" onClick={handleDownload}>
            <Download className="w-3 h-3" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewing} onOpenChange={setPreviewing}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-base">Certificate Preview</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden bg-muted/20">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[500px] border-0"
              title="Certificate Preview"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewing(false)}>Close</Button>
            <Button size="sm" className="gap-1.5" onClick={handleDownload}>
              <Download className="w-3 h-3" /> Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
