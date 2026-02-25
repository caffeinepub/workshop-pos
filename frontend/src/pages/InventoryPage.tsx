// Inventory management page with CRUD operations, search, and CSV import/export
import { useState, useRef } from 'react';
import {
  useGetAllInventoryItems,
  useAddOrUpdateInventoryItem,
  useDeleteInventoryItem,
} from '../hooks/useInventory';
import { exportInventoryToExcel, importInventoryFromExcel } from '../utils/excelUtils';
import type { InventoryItem } from '../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Download, Upload, Package, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type ItemForm = {
  itemCode: string;
  itemName: string;
  quantity: string;
  sellPrice: string;
  buyPrice: string;
  stock: string;
  minStock: string;
  maxStock: string;
};

function itemToForm(item: InventoryItem): ItemForm {
  return {
    itemCode: item.itemCode,
    itemName: item.itemName,
    quantity: String(item.quantity),
    sellPrice: String(item.sellPrice),
    buyPrice: String(item.buyPrice),
    stock: String(item.stock),
    minStock: String(item.minStock),
    maxStock: String(item.maxStock),
  };
}

function formToItem(form: ItemForm): InventoryItem {
  return {
    itemCode: form.itemCode.trim(),
    itemName: form.itemName.trim(),
    quantity: BigInt(parseInt(form.quantity) || 0),
    sellPrice: BigInt(parseInt(form.sellPrice) || 0),
    buyPrice: BigInt(parseInt(form.buyPrice) || 0),
    stock: BigInt(parseInt(form.stock) || 0),
    minStock: BigInt(parseInt(form.minStock) || 0),
    maxStock: BigInt(parseInt(form.maxStock) || 0),
  };
}

const EMPTY_FORM: ItemForm = {
  itemCode: '', itemName: '', quantity: '0', sellPrice: '0',
  buyPrice: '0', stock: '0', minStock: '0', maxStock: '0',
};

function formatRupiah(n: bigint | number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(n));
}

export function InventoryPage() {
  const { data: items = [], isLoading } = useGetAllInventoryItems();
  const addOrUpdate = useAddOrUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = items.filter(
    (item) =>
      item.itemCode.toLowerCase().includes(search.toLowerCase()) ||
      item.itemName.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm(itemToForm(item));
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.itemCode.trim() || !form.itemName.trim()) {
      toast.error('Kode dan nama barang wajib diisi');
      return;
    }
    try {
      await addOrUpdate.mutateAsync(formToItem(form));
      toast.success(editingItem ? 'Barang berhasil diperbarui' : 'Barang berhasil ditambahkan');
      setShowDialog(false);
    } catch (err: unknown) {
      toast.error('Gagal menyimpan: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDelete = async (itemCode: string) => {
    if (!confirm(`Hapus barang "${itemCode}"?`)) return;
    try {
      await deleteItem.mutateAsync(itemCode);
      toast.success('Barang berhasil dihapus');
    } catch (err: unknown) {
      toast.error('Gagal menghapus: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleExport = () => {
    if (items.length === 0) { toast.error('Tidak ada data untuk diekspor'); return; }
    exportInventoryToExcel(items);
    toast.success('File berhasil diunduh');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importInventoryFromExcel(file);
      let count = 0;
      for (const item of imported) {
        if (item.itemCode && item.itemName) {
          await addOrUpdate.mutateAsync(item as InventoryItem);
          count++;
        }
      }
      toast.success(`${count} barang berhasil diimpor/diperbarui`);
    } catch (err: unknown) {
      toast.error('Gagal mengimpor: ' + (err instanceof Error ? err.message : String(err)));
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Inventori</h1>
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
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            Tambah Barang
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle>Daftar Barang & Jasa ({filtered.length})</CardTitle>
            <Input
              placeholder="Cari kode/nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Barang/Jasa</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Harga Jual</TableHead>
                    <TableHead className="text-right">Harga Beli</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Belum ada data inventori
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((item) => (
                      <TableRow key={item.itemCode}>
                        <TableCell className="font-mono text-sm">{item.itemCode}</TableCell>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell className="text-right">{String(item.quantity)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.sellPrice)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.buyPrice)}</TableCell>
                        <TableCell className="text-right">
                          <span className={Number(item.stock) <= Number(item.minStock) ? 'text-destructive font-semibold' : ''}>
                            {String(item.stock)}
                          </span>
                          {Number(item.stock) <= Number(item.minStock) && (
                            <AlertTriangle className="w-3 h-3 inline ml-1 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">{String(item.minStock)}</TableCell>
                        <TableCell className="text-right">{String(item.maxStock)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(item.itemCode)}
                              disabled={deleteItem.isPending}
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Barang' : 'Tambah Barang Baru'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label>Kode Barang *</Label>
              <Input
                value={form.itemCode}
                onChange={(e) => setForm((p) => ({ ...p, itemCode: e.target.value }))}
                placeholder="BRG001"
                disabled={!!editingItem}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Barang/Jasa *</Label>
              <Input
                value={form.itemName}
                onChange={(e) => setForm((p) => ({ ...p, itemName: e.target.value }))}
                placeholder="Nama barang atau jasa"
              />
            </div>
            <div className="space-y-2">
              <Label>Qty</Label>
              <Input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Harga Jual (Rp)</Label>
              <Input
                type="number"
                value={form.sellPrice}
                onChange={(e) => setForm((p) => ({ ...p, sellPrice: e.target.value }))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Harga Beli (Rp)</Label>
              <Input
                type="number"
                value={form.buyPrice}
                onChange={(e) => setForm((p) => ({ ...p, buyPrice: e.target.value }))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Stock</Label>
              <Input
                type="number"
                value={form.stock}
                onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Stock Minimal</Label>
              <Input
                type="number"
                value={form.minStock}
                onChange={(e) => setForm((p) => ({ ...p, minStock: e.target.value }))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Stock Maksimal</Label>
              <Input
                type="number"
                value={form.maxStock}
                onChange={(e) => setForm((p) => ({ ...p, maxStock: e.target.value }))}
                min="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={addOrUpdate.isPending}>
              {addOrUpdate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
