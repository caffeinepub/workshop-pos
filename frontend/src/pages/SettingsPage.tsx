// Settings page for shop configuration (logo, name, address, phone, greeting) with localStorage persistence
import { useState, useRef } from 'react';
import { useShopSettings } from '../hooks/useShopSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save, Upload, Store } from 'lucide-react';
import { toast } from 'sonner';

export function SettingsPage() {
  const { settings, saveSettings } = useShopSettings();
  const [form, setForm] = useState({ ...settings });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((prev) => ({ ...prev, logo: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    saveSettings(form);
    toast.success('Pengaturan berhasil disimpan!');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Store className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Pengaturan Toko</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logo Toko</CardTitle>
          <CardDescription>Upload logo yang akan tampil di struk</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border overflow-hidden bg-muted flex items-center justify-center">
              {form.logo ? (
                <img src={form.logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Store className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Logo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG (maks. 2MB)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Toko</CardTitle>
          <CardDescription>Data toko yang akan tampil di struk pembayaran</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shopName">Nama Toko</Label>
            <Input
              id="shopName"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nama bengkel Anda"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopAddress">Alamat</Label>
            <Textarea
              id="shopAddress"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Alamat lengkap bengkel"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopPhone">Nomor Telepon</Label>
            <Input
              id="shopPhone"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Nomor telepon bengkel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopGreeting">Ucapan Terima Kasih (Struk)</Label>
            <Textarea
              id="shopGreeting"
              value={form.greeting}
              onChange={(e) => setForm((p) => ({ ...p, greeting: e.target.value }))}
              placeholder="Pesan yang tampil di bagian bawah struk"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          Simpan Pengaturan
        </Button>
      </div>
    </div>
  );
}
