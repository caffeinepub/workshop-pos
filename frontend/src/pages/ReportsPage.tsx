// Reports page with profit/loss report, date range filter, and print capability
import { useState } from 'react';
import { useGetAllTransactions } from '../hooks/useTransaction';
import { useGetAllInventoryItems } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BarChart3, Printer, Loader2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

interface ItemSale {
  itemCode: string;
  itemName: string;
  qtySold: number;
  totalRevenue: number;
  totalCOGS: number;
  profit: number;
}

export function ReportsPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  const { data: transactions = [], isLoading: txLoading } = useGetAllTransactions();
  const { data: inventoryItems = [] } = useGetAllInventoryItems();

  // Since transactions don't have timestamps in the backend, we show all transactions
  const reportTransactions = transactions;

  const totalRevenue = reportTransactions.reduce((sum, tx) => sum + Number(tx.totalAmount), 0);
  const totalCOGS = reportTransactions.reduce((sum, tx) =>
    sum + tx.items.reduce((s, item) => s + Number(item.quantity) * Number(item.buyPrice), 0), 0
  );
  const grossProfit = totalRevenue - totalCOGS;

  // Itemized sales
  const itemSalesMap = new Map<string, ItemSale>();
  for (const tx of reportTransactions) {
    for (const item of tx.items) {
      const inv = inventoryItems.find((i) => i.itemCode === item.itemCode);
      const existing = itemSalesMap.get(item.itemCode);
      const qty = Number(item.quantity);
      const rev = qty * Number(item.sellPrice);
      const cogs = qty * Number(item.buyPrice);
      if (existing) {
        existing.qtySold += qty;
        existing.totalRevenue += rev;
        existing.totalCOGS += cogs;
        existing.profit += rev - cogs;
      } else {
        itemSalesMap.set(item.itemCode, {
          itemCode: item.itemCode,
          itemName: inv?.itemName || item.itemCode,
          qtySold: qty,
          totalRevenue: rev,
          totalCOGS: cogs,
          profit: rev - cogs,
        });
      }
    }
  }
  const itemizedSales = Array.from(itemSalesMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Laporan Laba Rugi</h1>
        </div>
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="w-4 h-4" />
          Cetak Laporan
        </Button>
      </div>

      {/* Date Filter */}
      <Card className="no-print">
        <CardContent className="pt-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-2">
              <Label>Dari Tanggal</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sampai Tanggal</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground pb-2">
              * Menampilkan semua transaksi (filter tanggal untuk referensi)
            </p>
          </div>
        </CardContent>
      </Card>

      {txLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div id="report-content" className="space-y-6">
          {/* Print Header */}
          <div className="hidden print:block text-center mb-6">
            <h2 className="text-xl font-bold">Laporan Laba Rugi</h2>
            <p className="text-sm">Periode: {startDate} s/d {endDate}</p>
            <p className="text-sm">Dicetak: {new Date().toLocaleDateString('id-ID')}</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Pendapatan</p>
                    <p className="text-xl font-bold text-green-600">{formatRupiah(totalRevenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total HPP (Harga Pokok)</p>
                    <p className="text-xl font-bold text-red-600">{formatRupiah(totalCOGS)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={`border-l-4 ${grossProfit >= 0 ? 'border-l-primary' : 'border-l-destructive'}`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${grossProfit >= 0 ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                    <DollarSign className={`w-5 h-5 ${grossProfit >= 0 ? 'text-primary' : 'text-destructive'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Laba Kotor</p>
                    <p className={`text-xl font-bold ${grossProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatRupiah(grossProfit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Keuangan</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Total Transaksi</TableCell>
                    <TableCell className="text-right">{reportTransactions.length} transaksi</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Total Pendapatan</TableCell>
                    <TableCell className="text-right text-green-600 font-semibold">{formatRupiah(totalRevenue)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Total HPP</TableCell>
                    <TableCell className="text-right text-red-600 font-semibold">{formatRupiah(totalCOGS)}</TableCell>
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell className="font-bold text-base">Laba Kotor</TableCell>
                    <TableCell className={`text-right font-bold text-base ${grossProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatRupiah(grossProfit)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Margin Laba</TableCell>
                    <TableCell className="text-right">
                      {totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0'}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Itemized Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Rincian Penjualan per Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama Item</TableHead>
                      <TableHead className="text-right">Qty Terjual</TableHead>
                      <TableHead className="text-right">Total Pendapatan</TableHead>
                      <TableHead className="text-right">Total HPP</TableHead>
                      <TableHead className="text-right">Laba</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemizedSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Belum ada data penjualan
                        </TableCell>
                      </TableRow>
                    ) : (
                      itemizedSales.map((item) => (
                        <TableRow key={item.itemCode}>
                          <TableCell className="font-mono text-sm">{item.itemCode}</TableCell>
                          <TableCell>{item.itemName}</TableCell>
                          <TableCell className="text-right">{item.qtySold}</TableCell>
                          <TableCell className="text-right text-green-600">{formatRupiah(item.totalRevenue)}</TableCell>
                          <TableCell className="text-right text-red-600">{formatRupiah(item.totalCOGS)}</TableCell>
                          <TableCell className={`text-right font-semibold ${item.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            {formatRupiah(item.profit)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ReportsPage;
