import { getDb } from "@/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatUsd(n: number) {
  return `$${n.toFixed(4)}`;
}

export default async function CostsPage() {
  const db = getDb();
  const [ledgerRows, channels] = await Promise.all([
    db.query.costLedger.findMany({ orderBy: (c, { desc }) => [desc(c.occurredAt)], limit: 500 }),
    db.query.channels.findMany(),
  ]);

  const total = ledgerRows.reduce((sum, r) => sum + Number(r.totalCostUsd), 0);

  const byProvider = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const row of ledgerRows) {
    byProvider.set(row.provider, (byProvider.get(row.provider) ?? 0) + Number(row.totalCostUsd));
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + Number(row.totalCostUsd));
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const channelSpend = new Map<string, number>();
  for (const row of ledgerRows) {
    if (!row.channelId || row.occurredAt < monthStart) continue;
    channelSpend.set(row.channelId, (channelSpend.get(row.channelId) ?? 0) + Number(row.totalCostUsd));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Costs</h1>
        <p className="text-muted-foreground text-sm">Spend recorded in the cost ledger across all providers.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total recorded spend</CardDescription>
            <CardTitle className="text-2xl">{formatUsd(total)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>By provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {[...byProvider.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([provider, amount]) => (
                <div key={provider} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">{provider.replace(/_/g, " ")}</span>
                  <span>{formatUsd(amount)}</span>
                </div>
              ))}
            {byProvider.size === 0 && <p className="text-muted-foreground">No spend recorded yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>By category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {[...byCategory.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => (
                <div key={category} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">{category.replace(/_/g, " ")}</span>
                  <span>{formatUsd(amount)}</span>
                </div>
              ))}
            {byCategory.size === 0 && <p className="text-muted-foreground">No spend recorded yet.</p>}
          </CardContent>
        </Card>
      </div>

      {channels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly budget usage</CardTitle>
            <CardDescription>Spend this calendar month vs. each channel&rsquo;s monthly cap.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {channels.map((channel) => {
              const spent = channelSpend.get(channel.id) ?? 0;
              const cap = Number(channel.monthlyBudgetCapUsd);
              const pct = cap > 0 ? Math.min(100, (spent / cap) * 100) : 0;
              return (
                <div key={channel.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{channel.displayName}</span>
                    <span className="text-muted-foreground">
                      {formatUsd(spent)} / ${cap.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className={pct >= 90 ? "bg-destructive h-full" : "bg-primary h-full"}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent ledger entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerRows.slice(0, 50).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground">{row.occurredAt.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {row.provider.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground capitalize">
                    {row.category.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{Number(row.quantity).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{formatUsd(Number(row.totalCostUsd))}</TableCell>
                </TableRow>
              ))}
              {ledgerRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                    No cost ledger entries yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
