import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToCSV, printPage } from "@/lib/exportUtils";
import { toast } from "sonner";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns?: { key: string; label: string }[];
  className?: string;
}

export default function ExportButton({ data, filename, columns, className }: ExportButtonProps) {
  const handleCSV = () => {
    if (!data.length) {
      toast.error("No data to export");
      return;
    }
    exportToCSV(data, filename, columns);
    toast.success(`Exported ${data.length} rows to CSV`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={`gap-2 text-xs ${className ?? ""}`}>
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCSV} className="gap-2 text-xs">
          <Download className="w-3.5 h-3.5" /> Download CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={printPage} className="gap-2 text-xs">
          <Printer className="w-3.5 h-3.5" /> Print / Save PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
