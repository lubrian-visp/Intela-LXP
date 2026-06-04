import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { format } from "date-fns";

interface Props {
  invoice: any;
  sponsorName?: string;
}

export function InvoicePdfExport({ invoice, sponsorName }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 40px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; }
          .company { font-size: 22px; font-weight: 700; }
          .invoice-title { font-size: 28px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
          .meta-block label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; display: block; margin-bottom: 4px; }
          .meta-block span { font-size: 14px; font-weight: 500; }
          .line-items { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .line-items th { background: #f5f5f5; padding: 10px 14px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ddd; }
          .line-items td { padding: 12px 14px; border-bottom: 1px solid #eee; font-size: 13px; }
          .total-row td { font-weight: 700; font-size: 16px; border-top: 2px solid #1a1a1a; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
          .status-paid { background: #dcfce7; color: #166534; }
          .status-issued { background: #dbeafe; color: #1e40af; }
          .status-overdue { background: #fee2e2; color: #991b1b; }
          .status-draft { background: #f3f4f6; color: #374151; }
          .notes { background: #fafafa; padding: 16px; border-radius: 8px; margin-top: 24px; font-size: 12px; color: #666; }
          .footer { margin-top: 48px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 16px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company">${sponsorName ?? "Skills Provider"}</div>
            <div style="font-size:12px;color:#666;margin-top:4px">Training & Skills Development</div>
          </div>
          <div style="text-align:right">
            <div class="invoice-title">Invoice</div>
            <div style="font-size:14px;color:#666;margin-top:4px">${invoice.invoice_number}</div>
          </div>
        </div>

        <div class="meta">
          <div class="meta-block">
            <label>Issue Date</label>
            <span>${invoice.issued_date ? format(new Date(invoice.issued_date), "dd MMMM yyyy") : "—"}</span>
          </div>
          <div class="meta-block">
            <label>Due Date</label>
            <span>${invoice.due_date ? format(new Date(invoice.due_date), "dd MMMM yyyy") : "—"}</span>
          </div>
          <div class="meta-block">
            <label>Status</label>
            <span class="status status-${invoice.status}">${invoice.status}</span>
          </div>
          <div class="meta-block">
            <label>Currency</label>
            <span>${invoice.currency ?? "ZAR"}</span>
          </div>
        </div>

        <table class="line-items">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${invoice.description ?? "Training services"}</td>
              <td style="text-align:right">${invoice.currency ?? "ZAR"} ${Number(invoice.amount ?? 0).toLocaleString()}</td>
            </tr>
            ${invoice.claim_reference ? `<tr><td colspan="2" style="font-size:11px;color:#666">Claim Ref: ${invoice.claim_reference}</td></tr>` : ""}
            <tr class="total-row">
              <td>Total</td>
              <td style="text-align:right">${invoice.currency ?? "ZAR"} ${Number(invoice.amount ?? 0).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : ""}

        <div class="footer">
          Generated on ${format(new Date(), "dd MMMM yyyy")} • This is a computer-generated document
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handlePrint}
      className="h-7 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
    >
      <FileDown className="w-3 h-3" /> PDF
    </Button>
  );
}
