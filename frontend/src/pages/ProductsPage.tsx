import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUserRole } from '../hooks/useUserRole';
import { useGetAllInventoryItems, useDeleteInventoryItem } from '../hooks/useQueries';
import { useAddInventoryItem, useUpdateInventoryItem } from '../hooks/useInventory';
import { exportInventoryToCSV, importInventoryFromCSV } from '../utils/excelUtils';
import { InventoryItem, InventoryType, UserRole } from '../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, Upload, Download, Loader2 } from 'lucide-react';

type ProductFormData = {
  itemCode: string;
  itemName: string;
  type_: InventoryType;
  sellPrice: string;
  buyPrice: string;
  stock: string;
  minStock: string;
  maxStock: string;
  quantity: string;
};

const emptyForm: ProductFormData = {
  itemCode: '',
  itemName: '',
  type_: InventoryType.barang,
  sellPrice: '',
  buyPrice: '',
  stock: '',
  minStock: '',
  maxStock: '',
  quantity: '',
};

export default function ProductsPage() {
  const { currentUser } = useAuth();
  const { data: backendRole, isLoading: roleLoading } = useUserRole();
  const { data: items = [], isLoading } = useGetAllInventoryItems();
  const addMutation = useAddInventoryItem();
  const updateMutation = useUpdateInventoryItem();
  const deleteMutation = useDeleteInventoryItem();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  // Use backend role as the source of truth for what the backend will actually allow.
  // Fall back to local auth role if backend role is still loading.
  const localIsAdmin = currentUser?.userRole === 'Admin';
  const backendIsAdmin = backendRole === UserRole.admin;
  const isAdmin = backendIsAdmin || (roleLoading && localIsAdmin);
  const canAdd = isAdmin;
  const canEdit = isAdmin || backendRole === UserRole.user || currentUser?.userRole === 'User';
  const canDelete = isAdmin;

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.itemName.toLowerCase().includes(q) ||
        i.itemCode.toLowerCase().includes(q)
    );
  }, [items, search]);

  function openAdd() {
    setEditItem(null);
    setForm(emptyForm);
    setFormError('');
    setDialogOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditItem(item);
    setForm({
      itemCode: item.itemCode,
      itemName: item.itemName,
      type_: item.type,
      sellPrice: String(item.sellPrice),
      buyPrice: String(item.buyPrice),
      stock: item.stock !== undefined ? String(item.stock) : '',
      minStock: String(item.minStock),
      maxStock: String(item.maxStock),
      quantity: item.quantity !== undefined ? String(item.quantity) : '',
    });
    setFormError('');
    setDialogOpen(true);
  }

  async function handleSubmit() {
    setFormError('');
    if (!form.itemCode || !form.itemName || !form.sellPrice || !form.buyPrice) {
      setFormError('Kode, nama, harga jual, dan harga beli wajib diisi.');
      return;
    }
    const payload: InventoryItem = {
      itemCode: form.itemCode,
      itemName: form.itemName,
      type: form.type_,
      sellPrice: BigInt(form.sellPrice || '0'),
      buyPrice: BigInt(form.buyPrice || '0'),
      stock: form.stock !== '' ? BigInt(form.stock) : undefined,
      minStock: BigInt(form.minStock || '0'),
      maxStock: BigInt(form.maxStock || '0'),
      quantity: form.quantity !== '' ? BigInt(form.quantity) : undefined,
    };
    try {
      if (editItem) {
        await updateMutation.mutateAsync(payload);
      } else {
        await addMutation.mutateAsync(payload);
      }
      setDialogOpen(false);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('Only admins') || msg.includes('Unauthorized')) {
        setFormError(
          'Akses ditolak: Peran admin backend diperlukan. Pastikan Anda sudah login dengan benar dan coba lagi.'
        );
      } else if (msg.includes('already exists')) {
        setFormError('Kode produk sudah ada. Gunakan kode yang berbeda.');
      } else {
        setFormError('Gagal menyimpan produk: ' + msg);
      }
    }
  }

  async function handleDelete(itemCode: string) {
    try {
      await deleteMutation.mutateAsync(itemCode);
    } catch (err: any) {
      console.error('Delete error:', err);
    }
    setDeleteTarget(null);
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importInventoryFromCSV(file);
      // importInventoryFromCSV returns an ImportResult { items, errors }
      const importedItems = Array.isArray(result) ? result : result.items;
      for (const item of importedItems) {
        try {
          await addMutation.mutateAsync(item);
        } catch {
          try {
            await updateMutation.mutateAsync(item);
          } catch (err2) {
            console.error('Failed to upsert item:', item.itemCode, err2);
          }
        }
      }
    } catch (err) {
      console.error('Excel import error:', err);
    }
    e.target.value = '';
  }

  function handleExcelDownload() {
    exportInventoryToCSV(items);
  }

  const isMutating = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Produk</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola inventaris produk dan jasa toko Anda
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canAdd && (
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Unggah Excel
                </span>
              </Button>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleExcelUpload}
              />
            </label>
          )}
          {canAdd && (
            <Button variant="outline" size="sm" onClick={handleExcelDownload}>
              <Download className="w-4 h-4 mr-2" />
              Unduh Excel
            </Button>
          )}
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Produk
          </Button>
        </div>
      </div>

      {/* Backend role mismatch warning */}
      {localIsAdmin && !roleLoading && !backendIsAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-lg px-4 py-3 text-sm">
          <strong>Perhatian:</strong> Akun lokal Anda adalah Admin, tetapi peran backend saat ini adalah{' '}
          <strong>{backendRole ?? 'tidak diketahui'}</strong>. Operasi tambah/hapus produk mungkin gagal.
          Coba logout dan login kembali.
        </div>
      )}

      {/* Error banner */}
      {formError && !dialogOpen && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
          {formError}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Kode</TableHead>
                <TableHead>Nama Produk</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Harga Jual</TableHead>
                <TableHead className="text-right">Harga Beli</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-right">Min/Max</TableHead>
                {(canEdit || canDelete) && <TableHead className="text-center">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Tidak ada produk ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const isLowStock =
                    item.type === InventoryType.barang &&
                    item.stock !== undefined &&
                    item.stock <= item.minStock;
                  return (
                    <TableRow
                      key={item.itemCode}
                      className={isLowStock ? 'bg-destructive/5' : ''}
                    >
                      <TableCell className="font-mono text-sm">{item.itemCode}</TableCell>
                      <TableCell>
                        <div className="font-medium">{item.itemName}</div>
                        {isLowStock && (
                          <div className="text-xs text-destructive mt-0.5">Stok rendah!</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.type === InventoryType.barang ? 'default' : 'secondary'}>
                          {item.type === InventoryType.barang ? 'Barang' : 'Jasa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        Rp {Number(item.sellPrice).toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        Rp {Number(item.buyPrice).toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.type === InventoryType.barang
                          ? item.stock !== undefined
                            ? Number(item.stock)
                            : '-'
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {Number(item.minStock)}/{Number(item.maxStock)}
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(item)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(item.itemCode)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-3 py-2 text-sm">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Kode Produk *</Label>
                <Input
                  value={form.itemCode}
                  onChange={(e) => setForm((f) => ({ ...f, itemCode: e.target.value }))}
                  disabled={!!editItem}
                  placeholder="P001"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipe</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={form.type_}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type_: e.target.value as InventoryType }))
                  }
                >
                  <option value={InventoryType.barang}>Barang</option>
                  <option value={InventoryType.jasa}>Jasa</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nama Produk *</Label>
              <Input
                value={form.itemName}
                onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
                placeholder="Nama produk atau jasa"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Harga Jual (Rp) *</Label>
                <Input
                  type="number"
                  value={form.sellPrice}
                  onChange={(e) => setForm((f) => ({ ...f, sellPrice: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Harga Beli (Rp) *</Label>
                <Input
                  type="number"
                  value={form.buyPrice}
                  onChange={(e) => setForm((f) => ({ ...f, buyPrice: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            {form.type_ === InventoryType.barang && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Stok</Label>
                  <Input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Min Stok</Label>
                  <Input
                    type="number"
                    value={form.minStock}
                    onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Stok</Label>
                  <Input
                    type="number"
                    value={form.maxStock}
                    onChange={(e) => setForm((f) => ({ ...f, maxStock: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={isMutating}>
              {isMutating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editItem ? 'Simpan Perubahan' : 'Tambah Produk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Hapus'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
