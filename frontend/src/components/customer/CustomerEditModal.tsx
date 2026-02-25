// Customer edit modal with form fields for all customer data including vehicle history
import { useState, useEffect } from 'react';
import { useUpsertCustomerRecord } from '../../hooks/useCustomer';
import { DiscountType } from '../../backend';
import type { CustomerRecord, VehicleHistory } from '../../backend';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerEditModalProps {
  customer: CustomerRecord | null;
  open: boolean;
  onClose: () => void;
}

export function CustomerEditModal({ customer, open, onClose }: CustomerEditModalProps) {
  const upsert = useUpsertCustomerRecord();
  const [form, setForm] = useState<{
    name: string;
    phone: string;
    discountAmount: string;
    discountPercentage: string;
    discountType: DiscountType;
    vehicleHistory: VehicleHistory[];
  }>({
    name: '',
    phone: '',
    discountAmount: '0',
    discountPercentage: '0',
    discountType: DiscountType.goods,
    vehicleHistory: [],
  });

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        phone: customer.phone,
        discountAmount: String(customer.discountAmount),
        discountPercentage: String(customer.discountPercentage),
        discountType: customer.discountType,
        vehicleHistory: [...customer.vehicleHistory],
      });
    } else {
      setForm({
        name: '',
        phone: '',
        discountAmount: '0',
        discountPercentage: '0',
        discountType: DiscountType.goods,
        vehicleHistory: [],
      });
    }
  }, [customer, open]);

  const addVehicle = () => {
    setForm((p) => ({
      ...p,
      vehicleHistory: [...p.vehicleHistory, { brand: '', model: '', plate: '' }],
    }));
  };

  const removeVehicle = (idx: number) => {
    setForm((p) => ({
      ...p,
      vehicleHistory: p.vehicleHistory.filter((_, i) => i !== idx),
    }));
  };

  const updateVehicle = (idx: number, field: keyof VehicleHistory, value: string) => {
    setForm((p) => ({
      ...p,
      vehicleHistory: p.vehicleHistory.map((v, i) =>
        i === idx ? { ...v, [field]: value } : v
      ),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Nama dan nomor HP wajib diisi');
      return;
    }
    try {
      await upsert.mutateAsync({
        name: form.name.trim(),
        phone: form.phone.trim(),
        transactionCount: customer?.transactionCount ?? BigInt(0),
        discountAmount: BigInt(parseInt(form.discountAmount) || 0),
        discountPercentage: BigInt(parseInt(form.discountPercentage) || 0),
        discountType: form.discountType,
        vehicleHistory: form.vehicleHistory.filter((v) => v.brand || v.model || v.plate),
      });
      toast.success('Data pelanggan berhasil disimpan');
      onClose();
    } catch (err: unknown) {
      toast.error('Gagal menyimpan: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nama *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nama pelanggan"
              />
            </div>
            <div className="space-y-2">
              <Label>No. HP *</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Diskon (Rp)</Label>
              <Input
                type="number"
                value={form.discountAmount}
                onChange={(e) => setForm((p) => ({ ...p, discountAmount: e.target.value }))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Diskon (%)</Label>
              <Input
                type="number"
                value={form.discountPercentage}
                onChange={(e) => setForm((p) => ({ ...p, discountPercentage: e.target.value }))}
                min="0"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label>Berlaku Untuk</Label>
              <Select
                value={form.discountType}
                onValueChange={(v) => setForm((p) => ({ ...p, discountType: v as DiscountType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DiscountType.goods}>Barang</SelectItem>
                  <SelectItem value={DiscountType.services}>Jasa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vehicle History */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Riwayat Kendaraan</Label>
              <Button variant="outline" size="sm" onClick={addVehicle} className="gap-1 h-7">
                <Plus className="w-3 h-3" />
                Tambah
              </Button>
            </div>
            {form.vehicleHistory.map((v, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2 items-center">
                <Input
                  value={v.brand}
                  onChange={(e) => updateVehicle(idx, 'brand', e.target.value)}
                  placeholder="Merk"
                />
                <Input
                  value={v.model}
                  onChange={(e) => updateVehicle(idx, 'model', e.target.value)}
                  placeholder="Model"
                />
                <div className="flex gap-1">
                  <Input
                    value={v.plate}
                    onChange={(e) => updateVehicle(idx, 'plate', e.target.value)}
                    placeholder="Plat"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-destructive"
                    onClick={() => removeVehicle(idx)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
