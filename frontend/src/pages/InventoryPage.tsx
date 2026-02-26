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
import { Plus, Search, Pencil, Trash2, Upload, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { exportInventoryToCSV, importInventoryFromCSV } from '../utils/excelUtils';
import { toast } from 'sonner';
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
    itemCode: form.itemCode,
    itemName: form.itemName,
    type: form.type === 'jasa' ? InventoryType.jasa : InventoryType.barang,
    quantity: isBarang && form.quantity !== '' ? BigInt(form.quantity) : undefined,
    sellPrice: BigInt(form.sellPrice || '0'),
    buyPrice: BigInt(form.buyPrice || '0'),
    stock: isBarang && form.stock !== '' ? BigInt(form.stock) : undefined,
    minStock: BigInt(form.minStock || '0'),
    maxStock: BigInt(form.maxStock || '0'),
  };
}

export default function InventoryPage() {
  const { currentUser } = useAuth();
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
    setDialogOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm(itemToForm(item));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const item = formToItem(form);
    try {
      if (editingItem) {
        await updateMutation.mutateAsync(item);
        toast.success('Item updated successfully');
      } else {
        await addMutation.mutateAsync(item);
        toast.success('Item added successfully');
      }
      setDialogOpen(false);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes('Unauthorized') || msg.includes('authorized')) {
        toast.error('Authorization error: You do not have permission to perform this action.');
      } else if (msg.includes('already exists')) {
        toast.error('Item code already exists. Please use a different code.');
      } else {
        toast.error(`Error: ${msg}`);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.itemCode);
      toast.success('Item deleted');
    } catch (err: any) {
      toast.error(`Delete failed: ${err?.message ?? err}`);
    }
    setDeleteTarget(null);
  };

  const handleExport = () => {
    exportInventoryToCSV(items);
    toast.success('Inventory exported to CSV');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importInventoryFromCSV(file);
      const parsedItems = result.items;
      let added = 0;
      let updated = 0;
      let failed = 0;
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
            updated++;
          } else {
            await addMutation.mutateAsync(inventoryItem);
            added++;
          }
        } catch {
          failed++;
        }
      }
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(`Import complete: ${added} added, ${updated} updated${failed > 0 ? `, ${failed} failed` : ''}`);
    } catch (err: any) {
      toast.error(`Import failed: ${err?.message ?? err}`);
    }
    e.target.value = '';
  };

  const isSaving = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your product and service catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Upload className="w-4 h-4" />
                Import
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
              <Button size="sm" onClick={openAdd} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
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
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Sell Price</TableHead>
                <TableHead className="text-right">Buy Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead className="text-right">Max</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 10 : 9} className="text-center py-12 text-muted-foreground">
                    No items found
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
                      <TableCell className="font-mono text-xs">{item.itemCode}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                          {item.itemName}
                        </div>
                      </TableCell>
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
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the inventory item details.' : 'Fill in the details to add a new inventory item.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="itemCode">Item Code</Label>
                <Input
                  id="itemCode"
                  value={form.itemCode}
                  onChange={(e) => setForm((p) => ({ ...p, itemCode: e.target.value }))}
                  placeholder="e.g. BRG001"
                  disabled={!!editingItem}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((p) => ({ ...p, type: v as 'barang' | 'jasa' }))}
                >
                  <SelectTrigger id="type">
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
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                value={form.itemName}
                onChange={(e) => setForm((p) => ({ ...p, itemName: e.target.value }))}
                placeholder="Enter item name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sellPrice">Sell Price (Rp)</Label>
                <Input
                  id="sellPrice"
                  type="number"
                  value={form.sellPrice}
                  onChange={(e) => setForm((p) => ({ ...p, sellPrice: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="buyPrice">Buy Price (Rp)</Label>
                <Input
                  id="buyPrice"
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
                    <Label htmlFor="quantity">Quantity per Unit</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={form.quantity}
                      onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stock">Current Stock</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={form.stock}
                      onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="minStock">Min Stock</Label>
                    <Input
                      id="minStock"
                      type="number"
                      value={form.minStock}
                      onChange={(e) => setForm((p) => ({ ...p, minStock: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="maxStock">Max Stock</Label>
                    <Input
                      id="maxStock"
                      type="number"
                      value={form.maxStock}
                      onChange={(e) => setForm((p) => ({ ...p, maxStock: e.target.value }))}
                      placeholder="100"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !form.itemCode.trim() || !form.itemName.trim()}
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.itemName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
