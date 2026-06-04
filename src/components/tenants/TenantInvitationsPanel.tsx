import { useState } from "react";
import {
  useTenantInvitations,
  useCreateInvitation,
  useRevokeInvitation,
  getInvitationLink,
} from "@/hooks/useTenantInvitations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Copy, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props { tenantId: string }

export default function TenantInvitationsPanel({ tenantId }: Props) {
  const { data: invitations = [], isLoading } = useTenantInvitations(tenantId);
  const createInvitation = useCreateInvitation();
  const revokeInvitation = useRevokeInvitation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  const handleInvite = async () => {
    if (!email.trim()) return;
    await createInvitation.mutateAsync({ tenant_id: tenantId, email: email.trim(), role });
    setEmail("");
  };

  const copyLink = (token: string) => {
    const link = getInvitationLink(token);
    navigator.clipboard.writeText(link);
    toast.success("Invitation link copied to clipboard");
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "accepted": return "default";
      case "pending": return "secondary";
      case "revoked": case "expired": return "destructive";
      default: return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Invitations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3 items-end">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="person@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="invite-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleInvite} disabled={!email || createInvitation.isPending}>
            Send invite
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading invitations…</p>
        ) : invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invitations yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.email}</TableCell>
                  <TableCell className="capitalize">{inv.role}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(inv.status) as any}>{inv.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(inv.expires_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    {inv.status === "pending" && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => copyLink(inv.token)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => revokeInvitation.mutate({ id: inv.id, tenant_id: tenantId })}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
