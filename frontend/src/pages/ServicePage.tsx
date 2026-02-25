// Service management page with queue display and conditional form behavior based on status
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGetServiceQueue, useAddServiceRecord, useUpdateServiceStatus } from '../hooks/useService';
import { Status } from '../backend';
import type { ServiceRecord } from '../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_FORM = {
  customerName: '',
  vehicleBrand: '',
  vehicleModel: '',
  plateNumber: '',
  problemDescription: '',
  technicianName: '',
  status: 'masuk' as 'masuk' | 'selesai',
  repairAction: '',
};

export function ServicePage() {
  const navigate = useNavigate();
  const { data: queue = [], isLoading: queueLoading } = useGetServiceQueue();
  const addRecord = useAddServiceRecord();
  const updateStatus = useUpdateServiceStatus();
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const handleReset = () => setForm({ ...EMPTY_FORM });

  const handleSave = async () => {
    if (!form.customerName.trim() || !form.vehicleBrand.trim() || !form.vehicleModel.trim()) {
      toast.error('Nama pelanggan, merk, dan model kendaraan wajib diisi');
      return;
    }
    if (!form.technicianName.trim()) {
      toast.error('Nama teknisi wajib diisi');
      return;
    }

    const record: ServiceRecord = {
      id: BigInt(0),
      customerName: form.customerName.trim(),
      vehicleBrand: form.vehicleBrand.trim(),
      vehicleModel: form.vehicleModel.trim(),
      plateNumber: form.plateNumber.trim() || undefined,
      problemDescription: form.problemDescription.trim(),
      technicianName: form.technicianName.trim(),
      status: form.status === 'masuk' ? Status.masuk : Status.selesai,
      repairAction: form.repairAction.trim() || undefined,
    };

    try {
      await addRecord.mutateAsync(record);
      if (form.status === 'selesai') {
        toast.success('Service disimpan, membuka halaman transaksi...');
        const savedName = form.customerName.trim();
        handleReset();
        navigate({ to: '/transaction', search: { customerName: savedName } });
      } else {
        toast.success('Service masuk antrian');
        handleReset();
      }
    } catch (err: unknown) {
      toast.error('Gagal menyimpan: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleMarkDone = async (record: ServiceRecord) => {
    try {
      await updateStatus.mutateAsync({
        id: record.id,
        status: Status.selesai,
        repairAction: null,
      });
      toast.success(`Service ${record.customerName} ditandai selesai`);
      navigate({ to: '/transaction', search: { customerName: record.customerName } });
    } catch {
      toast.error('Gagal memperbarui status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wrench className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Menu Service</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Form Service Baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Pelanggan *</Label>
              <Input
                value={form.customerName}
                onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                placeholder="Nama pelanggan"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Merk Kendaraan *</Label>
                <Input
                  value={form.vehicleBrand}
                  onChange={(e) => setForm((p) => ({ ...p, vehicleBrand: e.target.value }))}
                  placeholder="Honda, Toyota, dll"
                />
              </div>
              <div className="space-y-2">
                <Label>Model Kendaraan *</Label>
                <Input
                  value={form.vehicleModel}
                  onChange={(e) => setForm((p) => ({ ...p, vehicleModel: e.target.value }))}
                  placeholder="Vario, Avanza, dll"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Nomor Polisi{' '}
                <span className="text-muted-foreground text-xs">(Opsional)</span>
              </Label>
              <Input
                value={form.plateNumber}
                onChange={(e) => setForm((p) => ({ ...p, plateNumber: e.target.value }))}
                placeholder="B 1234 ABC"
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi Masalah</Label>
              <Textarea
                value={form.problemDescription}
                onChange={(e) => setForm((p) => ({ ...p, problemDescription: e.target.value }))}
                placeholder="Jelaskan masalah kendaraan..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Teknisi *</Label>
              <Input
                value={form.technicianName}
                onChange={(e) => setForm((p) => ({ ...p, technicianName: e.target.value }))}
                placeholder="Nama teknisi yang menangani"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((p) => ({ ...p, status: v as 'masuk' | 'selesai' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masuk">Masuk</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.status === 'selesai' && (
              <div className="space-y-2">
                <Label>Tindakan Perbaikan</Label>
                <Textarea
                  value={form.repairAction}
                  onChange={(e) => setForm((p) => ({ ...p, repairAction: e.target.value }))}
                  placeholder="Jelaskan tindakan perbaikan yang dilakukan..."
                  rows={3}
                />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSave}
                disabled={addRecord.isPending}
                className="flex-1"
              >
                {addRecord.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {form.status === 'selesai' ? 'Simpan & Transaksi' : 'Simpan'}
              </Button>
              <Button variant="outline" onClick={handleReset}>Batal</Button>
            </div>
          </CardContent>
        </Card>

        {/* Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Antrian Service ({queue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queueLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : queue.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Tidak ada antrian service</p>
            ) : (
              <div className="space-y-3">
                {queue.map((record) => (
                  <div
                    key={String(record.id)}
                    className="border border-border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{record.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {record.vehicleBrand} {record.vehicleModel}
                          {record.plateNumber ? ` • ${record.plateNumber}` : ''}
                        </p>
                        <p className="text-sm text-muted-foreground">Teknisi: {record.technicianName}</p>
                        {record.problemDescription && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {record.problemDescription}
                          </p>
                        )}
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 shrink-0">
                        Antrian
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => handleMarkDone(record)}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Selesai & Transaksi
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
