import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Users } from "lucide-react";
import { RoleDefinition } from "@/hooks/useRoleDefinitions";
import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ParsedRow {
  email: string;
  full_name: string;
  valid: boolean;
  error?: string;
  user_id?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: RoleDefinition[];
}

export default function BulkImportDialog({ open, onOpenChange, roles }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [scopeType, setScopeType] = useState("global");
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState({ success: 0, failed: 0 });

  const reset = () => {
    setStep("upload");
    setParsed([]);
    setSelectedRoleId("");
    setScopeType("global");
    setResult({ success: 0, failed: 0 });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      // Skip header if it contains 'email'
      const startIdx = lines[0]?.toLowerCase().includes("email") ? 1 : 0;
      const rows: ParsedRow[] = lines.slice(startIdx).map((line) => {
        const parts = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
        const email = parts[0] || "";
        const full_name = parts[1] || parts[0]?.split("@")[0] || "";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return { email, full_name, valid: false, error: "Invalid email" };
        }
        return { email, full_name, valid: true };
      });
      setParsed(rows);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!selectedRoleId) {
      toast({ title: "Select a role first", variant: "destructive" });
      return;
    }
    setImporting(true);
    const validRows = parsed.filter((r) => r.valid);
    let success = 0;
    let failed = 0;

    // Look up user IDs by email from profiles
    for (const row of validRows) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .ilike("full_name", `%${row.full_name}%`)
          .limit(1)
          .single();

        if (!profile) {
          row.valid = false;
          row.error = "User not found in system";
          failed++;
          continue;
        }

        // Assign the role scope
        const { error } = await db.from("user_role_scopes").insert({
          user_id: profile.user_id,
          role_definition_id: selectedRoleId,
          scope_type: scopeType,
          assigned_by: user?.id,
        });

        if (error) {
          if (error.code === "23505") {
            row.error = "Already assigned";
          } else {
            row.error = error.message;
          }
          failed++;
        } else {
          success++;
        }

        // Audit log
        await db.from("role_audit_log").insert({
          action: "user_assigned",
          entity_type: "user_role_scope",
          entity_id: profile.user_id,
          performed_by: user?.id,
          details: { role_definition_id: selectedRoleId, bulk: true, email: row.email },
        });
      } catch {
        failed++;
        row.error = "Unexpected error";
      }
    }

    setResult({ success, failed });
    setStep("done");
    setImporting(false);
    qc.invalidateQueries({ queryKey: ["user-role-scopes"] });
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-accent" />
            Bulk Role Assignment
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-5 mt-2">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Target Role *</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger><SelectValue placeholder="Select role to assign..." /></SelectTrigger>
                <SelectContent>
                  {roles.filter((r) => r.is_active).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Access Scope</Label>
              <Select value={scopeType} onValueChange={setScopeType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (all programmes)</SelectItem>
                  <SelectItem value="programme">Programme-specific</SelectItem>
                  <SelectItem value="cohort">Cohort-specific</SelectItem>
                  <SelectItem value="region">Region-specific</SelectItem>
                  <SelectItem value="department">Department-specific</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-accent/50 transition-colors"
            >
              <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">Upload CSV File</p>
              <p className="text-xs text-muted-foreground mt-1">Format: email, full_name (one per row)</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </div>

            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-foreground mb-1">CSV Template</p>
              <code className="text-[10px] text-muted-foreground block font-mono">
                email,full_name{"\n"}
                john@company.com,John Smith{"\n"}
                jane@company.com,Jane Doe
              </code>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">{parsed.length} users found</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="default" className="text-[10px]">{parsed.filter((r) => r.valid).length} valid</Badge>
                {parsed.some((r) => !r.valid) && (
                  <Badge variant="destructive" className="text-[10px]">{parsed.filter((r) => !r.valid).length} invalid</Badge>
                )}
              </div>
            </div>

            {selectedRole && (
              <div className="text-xs text-muted-foreground">
                Assigning to: <span className="font-semibold text-foreground">{selectedRole.display_name}</span> ({scopeType} scope)
              </div>
            )}

            <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-secondary/30">
                    <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Email</th>
                    <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Name</th>
                    <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((r, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="px-3 py-1.5 text-foreground">{r.email}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.full_name}</td>
                      <td className="px-3 py-1.5">
                        {r.valid ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <div className="flex items-center gap-1 text-destructive">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span className="text-[10px]">{r.error}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setStep("upload"); setParsed([]); }}>Back</Button>
              <Button onClick={handleImport} disabled={importing || !parsed.some((r) => r.valid)}>
                {importing ? "Importing..." : `Import ${parsed.filter((r) => r.valid).length} Users`}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-success" />
            <div>
              <p className="text-lg font-semibold text-foreground">Import Complete</p>
              <p className="text-sm text-muted-foreground mt-1">
                {result.success} assigned successfully{result.failed > 0 ? `, ${result.failed} failed` : ""}
              </p>
            </div>
            <Button onClick={() => { reset(); onOpenChange(false); }}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
