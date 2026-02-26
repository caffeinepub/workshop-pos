import React, { useState, useRef } from 'react';
import { useGetAllInventoryItems, useDeleteInventoryItem } from '../hooks/useQueries';
import { useAddInventoryItem, useUpdateInventoryItem } from '../hooks/useInventory';
import { useAuth } from '../hooks/useAuth';
import { InventoryItem, InventoryType } from '../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Pencil, Trash2, Upload, Download, Loader2, AlertCircle } from 'lucide-react';
import { exportInventoryToCSV, importInventoryFromCSV } from '../utils/excelUtils';
import { useQueryClient } from '@tanstack/react-query';

interface InventoryFormState {
  itemCode: string;
  itemName: string;
  type: 'barang' | 'jasa';
  quantity: string;
  sellPrice: string;
  buyPrice: string;
  stock: string;
  minStock: string;
  maxStock: string;
}

function emptyForm(): InventoryFormState {
  return {
    itemCode: '',
    itemName: '',
    type: 'barang',
    quantity: '',
    sellPrice: '',
    buyPrice: '',
    stock: '',
    minStock: '0',
    maxStock: '100',
  };
}

function itemToForm(item: InventoryItem): InventoryFormState {
  return {
    itemCode: item.itemCode,
    itemName: item.itemName,
    type: item.type === InventoryType.jasa ? 'jasa' : 'barang',
    quantity: item.quantity !== undefined ? String(item.quantity) : '',
    sellPrice: String(item.sellPrice),
    buyPrice: String(item.buyPrice),
    stock: item.stock !== undefined ? String(item.stock) : '',
    minStock: String(item.minStock),
    maxStock: String(item.maxStock),
  };
}

function formToItem(form: InventoryFormState): InventoryItem {
  const isBarang = form.type === 'barang';
  return {
    itemCode: form.itemCode.trim(),
    itemName: form.itemName.trim(),
    type: form.type === 'jasa' ? InventoryType.jasa : InventoryType.barang,
    quantity: isBarang && form.quantity !== '' ? BigInt(form.quantity) : undefined,
    sellPrice: BigInt(form.sellPrice || '0'),
    buyPrice: BigInt(form.buyPrice || '0'),
    stock: isBarang && form.stock !== '' ? BigInt(form.stock) : undefined,
    minStock: BigInt(form.minStock || '0'),
    maxStock: BigInt(form.maxStock || '0'),
  };
}

export default function ProductsPage() {
  const { currentUser } = useAuth();
  // Role-based access: Admin and User can edit, Kasir is read-only
  const canEdit = currentUser?.userRole === 'Admin' || currentUser?.userRole === 'User';

  const { data: items = [], isLoading } = useGetAllInventoryItems();
  const addMutation = useAddInventoryItem();
  const updateMutation = useUpdateInventoryItem();
  const deleteMutation = useDeleteInventoryItem();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<InventoryFormState>(emptyForm());
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = items.filter(
    (item) =>
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingItem(null);
    setForm(emptyForm());
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm(itemToForm(item));
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.itemCode.trim()) { setFormError('Kode item wajib diisi.'); return; }
    if (!form.itemName.trim()) { setFormError('Nama item wajib diisi.'); return; }

    const item = formToItem(form);
    try {
      if (editingItem) {
        await updateMutation.mutateAsync(item);
      } else {
        await addMutation.mutateAsync(item);
      }
      setDialogOpen(false);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes('Unauthorized') || msg.includes('authorized')) {
        setFormError('Anda tidak memiliki izin untuk melakukan tindakan ini.');
      } else if (msg.includes('already exists')) {
        setFormError('Kode item sudah ada. Gunakan kode yang berbeda.');
      } else {
        setFormError(`Error: ${msg}`);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.itemCode);
    } catch {
      // error handled silently
    }
    setDeleteTarget(null);
  };

  const handleExport = () => {
    exportInventoryToCSV(items);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importInventoryFromCSV(file);
      const parsedItems = result.items;
      for (const item of parsedItems) {
        try {
          const inventoryItem: InventoryItem = {
            itemCode: item.itemCode,
            itemName: item.itemName,
            type: item.type,
            quantity: item.quantity,
            sellPrice: item.sellPrice,
            buyPrice: item.buyPrice,
            stock: item.stock,
            minStock: item.minStock,
            maxStock: item.maxStock,
          };
          const existing = items.find((i) => i.itemCode === item.itemCode);
          if (existing) {
            await updateMutation.mutateAsync(inventoryItem);
          } else {
            await addMutation.mutateAsync(inventoryItem);
          }
        } catch {
          // skip failed items
        }
      }
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
    } catch {
      // import parse error
    }
    e.target.value = '';
  };

  const isSaving = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produk & Layanan</h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola inventaris barang dan jasa</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Upload className="w-4 h-4" />
                Import CSV
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
              <Button size="sm" onClick={openAdd} className="gap-2">
                <Plus className="w-4 h-4" />
                Tambah Produk
              </Button>
            </>
          )}
        </div>
      </div>

      {!canEdit && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Anda login sebagai Kasir. Hanya dapat melihat data produk.</AlertDescription>
        </Alert>
      )}

      <div className="relative mb-4">
        <Input
          placeholder="Cari berdasarkan nama atau kode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-4"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Harga Jual</TableHead>
                <TableHead className="text-right">Harga Beli</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead className="text-right">Max</TableHead>
                {canEdit && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 10 : 9} className="text-center py-12 text-muted-foreground">
                    {items.length === 0 ? 'Belum ada produk. Klik "Tambah Produk" untuk menambahkan.' : 'Tidak ada item yang cocok.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.itemCode}>
                    <TableCell className="font-mono text-xs">{item.itemCode}</TableCell>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell>
                      <Badge variant={item.type === InventoryType.jasa ? 'secondary' : 'outline'} className="text-xs">
                        {item.type === InventoryType.jasa ? 'Jasa' : 'Barang'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity !== undefined ? String(item.quantity) : '-'}</TableCell>
                    <TableCell className="text-right">Rp {Number(item.sellPrice).toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right">Rp {Number(item.buyPrice).toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right">{item.stock !== undefined ? String(item.stock) : '-'}</TableCell>
                    <TableCell className="text-right">{String(item.minStock)}</TableCell>
                    <TableCell className="text-right">{String(item.maxStock)}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Tambah Produk Baru'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Perbarui detail produk.' : 'Isi detail untuk menambahkan produk baru.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-itemCode">Kode Item</Label>
                <Input
                  id="p-itemCode"
                  value={form.itemCode}
                  onChange={(e) => setForm((p) => ({ ...p, itemCode: e.target.value }))}
                  placeholder="Contoh: BRG001"
                  disabled={!!editingItem}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-type">Tipe</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((p) => ({ ...p, type: v as 'barang' | 'jasa' }))}
                >
                  <SelectTrigger id="p-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="barang">Barang</SelectItem>
                    <SelectItem value="jasa">Jasa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-itemName">Nama Item</Label>
              <Input
                id="p-itemName"
                value={form.itemName}
                onChange={(e) => setForm((p) => ({ ...p, itemName: e.target.value }))}
                placeholder="Masukkan nama item"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-sellPrice">Harga Jual (Rp)</Label>
                <Input
                  id="p-sellPrice"
                  type="number"
                  value={form.sellPrice}
                  onChange={(e) => setForm((p) => ({ ...p, sellPrice: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-buyPrice">Harga Beli (Rp)</Label>
                <Input
                  id="p-buyPrice"
                  type="number"
                  value={form.buyPrice}
                  onChange={(e) => setForm((p) => ({ ...p, buyPrice: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            {form.type === 'barang' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="p-quantity">Jumlah per Unit</Label>
                    <Input
                      id="p-quantity"
                      type="number"
                      value={form.quantity}
                      onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-stock">Stok Saat Ini</Label>
                    <Input
                      id="p-stock"
                      type="number"
                      value={form.stock}
                      onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="p-minStock">Stok Minimum</Label>
                    <Input
                      id="p-minStock"
                      type="number"
                      value={form.minStock}
                      onChange={(e) => setForm((p) => ({ ...p, minStock: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-maxStock">Stok Maksimum</Label>
                    <Input
                      id="p-maxStock"
                      type="number"
                      value={form.maxStock}
                      onChange={(e) => setForm((p) => ({ ...p, maxStock: e.target.value }))}
                      placeholder="100"
                    />
                  </div>
                </div>
              </>
            )}

            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !form.itemCode.trim() || !form.itemName.trim()}
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingItem ? 'Simpan Perubahan' : 'Tambah Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Item</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{deleteTarget?.itemName}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
