// Customer data management page with WhatsApp links, edit/delete, and CSV import/export
import { useState, useRef } from 'react';
import { useGetAllCustomers, useDeleteCustomerRecord, useUpsertCustomerRecord } from '../hooks/useCustomer';
import { exportCustomersToExcel, importCustomersFromExcel } from '../utils/excelUtils';
import { CustomerEditModal } from '../components/customer/CustomerEditModal';
import { DiscountType } from '../backend';
import type { CustomerRecord } from '../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Edit2, Trash2, Download, Upload, UserPlus, Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

function formatRupiah(n: bigint | number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(n));
}

export function CustomerDataPage() {
  const { data: customers = [], isLoading } = useGetAllCustomers();
  const deleteCustomer = useDeleteCustomerRecord();
  const upsertCustomer = useUpsertCustomerRecord();
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const handleEdit = (customer: CustomerRecord) => {
    setEditingCustomer(customer);
    setShowEditModal(true);
  };

  const handleAddNew = () => {
    setEditingCustomer(null);
    setShowEditModal(true);
  };

  const handleDelete = async (phone: string, name: string) => {
    if (!confirm(`Hapus pelanggan "${name}"?`)) return;
    try {
      await deleteCustomer.mutateAsync(phone);
      toast.success('Pelanggan berhasil dihapus');
    } catch (err: unknown) {
      toast.error('Gagal menghapus: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleExport = () => {
    if (customers.length === 0) { toast.error('Tidak ada data untuk diekspor'); return; }
    exportCustomersToExcel(customers);
    toast.success('File berhasil diunduh');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importCustomersFromExcel(file);
      let count = 0;
      for (const c of imported) {
        if (c.name && c.phone) {
          const existing = customers.find((ex) => ex.phone === c.phone || ex.name === c.name);
          await upsertCustomer.mutateAsync({
            name: c.name!,
            phone: c.phone!,
            transactionCount: c.transactionCount ?? existing?.transactionCount ?? BigInt(0),
            discountAmount: c.discountAmount ?? existing?.discountAmount ?? BigInt(0),
            discountPercentage: c.discountPercentage ?? existing?.discountPercentage ?? BigInt(0),
            discountType: c.discountType ?? existing?.discountType ?? DiscountType.goods,
            vehicleHistory: c.vehicleHistory ?? existing?.vehicleHistory ?? [],
          });
          count++;
        }
      }
      toast.success(`${count} pelanggan berhasil diimpor/diperbarui`);
    } catch (err: unknown) {
      toast.error('Gagal mengimpor: ' + (err instanceof Error ? err.message : String(err)));
    }
    e.target.value = '';
  };

  const formatPhone = (phone: string) => {
    let normalized = phone.replace(/\D/g, '');
    if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1);
    return normalized;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Data Pelanggan</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Unduh CSV
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Upload className="w-4 h-4" />
            Unggah CSV
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
          <Button onClick={handleAddNew} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Tambah Pelanggan
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle>Daftar Pelanggan ({filtered.length})</CardTitle>
            <Input
              placeholder="Cari nama/HP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>No. HP</TableHead>
                    <TableHead className="text-center">Transaksi</TableHead>
                    <TableHead className="text-right">Diskon (Rp)</TableHead>
                    <TableHead className="text-right">Diskon (%)</TableHead>
                    <TableHead>Berlaku Untuk</TableHead>
                    <TableHead>Riwayat Kendaraan</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Belum ada data pelanggan
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((customer) => (
                      <TableRow key={customer.phone}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>
                          <a
                            href={`https://wa.me/${formatPhone(customer.phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:underline"
                          >
                            <MessageCircle className="w-3 h-3" />
                            {customer.phone}
                          </a>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{String(customer.transactionCount)}x</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(customer.discountAmount) > 0 ? formatRupiah(customer.discountAmount) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(customer.discountPercentage) > 0 ? `${customer.discountPercentage}%` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {customer.discountType === DiscountType.goods ? 'Barang' : 'Jasa'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {customer.vehicleHistory.length === 0 ? (
                              <span>-</span>
                            ) : (
                              customer.vehicleHistory.slice(0, 2).map((v, i) => (
                                <div key={i}>{v.brand} {v.model} {v.plate && `(${v.plate})`}</div>
                              ))
                            )}
                            {customer.vehicleHistory.length > 2 && (
                              <span className="text-muted-foreground">+{customer.vehicleHistory.length - 2} lagi</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(customer)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(customer.phone, customer.name)}
                              disabled={deleteCustomer.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerEditModal
        customer={editingCustomer}
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </div>
  );
}
