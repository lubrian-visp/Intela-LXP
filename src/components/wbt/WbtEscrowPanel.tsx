import { useWbtEscrowTransactions, useCreateEscrowTransaction, useReleaseEscrow } from "@/hooks/useWbtSprintReviews";
import { useWbtProject } from "@/hooks/useWbtProjects";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle2 } from "lucide-react";

interface Props {
  projectId: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600",
  held: "bg-blue-500/10 text-blue-600",
  released: "bg-green-500/10 text-green-600",
  refunded: "bg-red-500/10 text-red-600",
  disputed: "bg-red-500/10 text-red-600",
};

export default function WbtEscrowPanel({ projectId }: Props) {
  const { data: project } = useWbtProject(projectId);
  const { data: transactions } = useWbtEscrowTransactions(projectId);
  const releaseEscrow = useReleaseEscrow();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("super_admin") || hasRole("operations");

  const totalHeld = transactions?.filter(t => t.status === "held").reduce((s, t) => s + t.amount, 0) ?? 0;
  const totalReleased = transactions?.filter(t => t.status === "released").reduce((s, t) => s + t.net_amount, 0) ?? 0;
  const totalFees = transactions?.filter(t => t.status === "released").reduce((s, t) => s + t.platform_fee_amount, 0) ?? 0;

  if (project?.payment_model !== "paid") {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" />
        This is an unpaid project. No financial transactions.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Payment Escrow</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><ArrowDownCircle className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Held in Escrow</p>
              <p className="text-lg font-bold text-foreground">{project?.currency} {totalHeld.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><ArrowUpCircle className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Released to Learner</p>
              <p className="text-lg font-bold text-foreground">{project?.currency} {totalReleased.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10"><DollarSign className="h-5 w-5 text-accent-foreground" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Platform Fees</p>
              <p className="text-lg font-bold text-foreground">{project?.currency} {totalFees.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction List */}
      {transactions?.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">No escrow transactions yet.</Card>
      ) : (
        <div className="space-y-2">
          {transactions?.map(tx => (
            <Card key={tx.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {tx.transaction_type === "hold" ? (
                      <ArrowDownCircle className="h-4 w-4 text-blue-600" />
                    ) : (
                      <ArrowUpCircle className="h-4 w-4 text-green-600" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">{tx.currency} {tx.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        Fee: {tx.currency} {tx.platform_fee_amount.toFixed(2)} ({tx.platform_fee_percent}%) · Net: {tx.currency} {tx.net_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[tx.status] ?? ""}>{tx.status}</Badge>
                    {tx.status === "held" && isAdmin && (
                      <Button size="sm" variant="outline" onClick={() => releaseEscrow.mutate({ transactionId: tx.id })} disabled={releaseEscrow.isPending}>
                        Release
                      </Button>
                    )}
                  </div>
                </div>
                {tx.gateway_reference && (
                  <p className="text-xs text-muted-foreground mt-1">Ref: {tx.gateway_reference}</p>
                )}
                {tx.released_at && (
                  <p className="text-xs text-muted-foreground mt-1">Released: {new Date(tx.released_at).toLocaleString()}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
