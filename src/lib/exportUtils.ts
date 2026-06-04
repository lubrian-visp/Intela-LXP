/**
 * Utility functions for exporting data as CSV and triggering PDF print.
 */

/** Convert an array of objects to a CSV string */
export function toCSV(data: Record<string, unknown>[], columns?: { key: string; label: string }[]): string {
  if (!data.length) return "";

  const cols = columns ?? Object.keys(data[0]).map(k => ({ key: k, label: k }));
  const header = cols.map(c => `"${c.label}"`).join(",");
  const rows = data.map(row =>
    cols.map(c => {
      const val = row[c.key];
      if (val === null || val === undefined) return "";
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(",")
  );
  return [header, ...rows].join("\n");
}

/** Download a CSV string as a file */
export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Trigger browser print dialog (PDF) for current page */
export function printPage() {
  window.print();
}

/** Export helper: converts data to CSV and downloads */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns?: { key: string; label: string }[]
) {
  const csv = toCSV(data, columns);
  downloadCSV(csv, filename);
}
