import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useShopSettings, ShopSettings } from '../hooks/useShopSettings';
import {
  Camera,
  Store,
  Phone,
  MapPin,
  MessageSquare,
  Save,
  CheckCircle,
  Upload,
  X,
} from 'lucide-react';

export default function SettingsPage() {
  const { settings, saveSettings } = useShopSettings();
  const [form, setForm] = useState<ShopSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>(settings.shopLogoBase64);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(settings);
    setLogoPreview(settings.shopLogoBase64);
  }, [settings]);

  const handleChange = (field: keyof ShopSettings, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setLogoPreview(base64);
      setForm((prev) => ({ ...prev, shopLogoBase64: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setForm((prev) => ({ ...prev, shopLogoBase64: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    saveSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pengaturan Toko</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Kelola informasi toko, logo, dan pesan struk Anda.
          </p>
        </div>

        {/* Logo Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="w-4 h-4 text-primary" />
              Logo Toko
            </CardTitle>
            <CardDescription>
              Upload logo toko Anda. Logo akan tampil di header dan struk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {/* Logo Preview */}
              <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoPreview ? (
                  <>
                    <img
                      src={logoPreview}
                      alt="Logo toko"
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center hover:opacity-80 transition-opacity"
                      title="Hapus logo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <img
                    src="/assets/generated/shop-logo-placeholder.dim_256x256.png"
                    alt="Placeholder logo"
                    className="w-16 h-16 object-contain opacity-50"
                  />
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  id="logo-upload"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {logoPreview ? 'Ganti Logo' : 'Upload Logo'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Format: JPG, PNG, GIF. Maks 2MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Store Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="w-4 h-4 text-primary" />
              Informasi Toko
            </CardTitle>
            <CardDescription>
              Nama, alamat, dan nomor telepon toko Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Shop Name */}
            <div className="space-y-1.5">
              <Label htmlFor="shopName" className="flex items-center gap-1.5 text-sm">
                <Store className="w-3.5 h-3.5 text-muted-foreground" />
                Nama Toko
              </Label>
              <Input
                id="shopName"
                value={form.shopName}
                onChange={(e) => handleChange('shopName', e.target.value)}
                placeholder="Masukkan nama toko"
              />
            </div>

            <Separator />

            {/* Shop Address */}
            <div className="space-y-1.5">
              <Label htmlFor="shopAddress" className="flex items-center gap-1.5 text-sm">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                Alamat Toko
              </Label>
              <Textarea
                id="shopAddress"
                value={form.shopAddress}
                onChange={(e) => handleChange('shopAddress', e.target.value)}
                placeholder="Masukkan alamat lengkap toko"
                rows={3}
              />
            </div>

            <Separator />

            {/* Shop Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="shopPhone" className="flex items-center gap-1.5 text-sm">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                Nomor Telepon
              </Label>
              <Input
                id="shopPhone"
                value={form.shopPhone}
                onChange={(e) => handleChange('shopPhone', e.target.value)}
                placeholder="Contoh: 08123456789"
                type="tel"
              />
            </div>
          </CardContent>
        </Card>

        {/* Receipt Greeting Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4 text-primary" />
              Pesan Struk
            </CardTitle>
            <CardDescription>
              Ucapan terima kasih atau pesan yang akan tampil di bagian bawah struk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="shopGreeting" className="text-sm">
                Ucapan / Pesan Struk
              </Label>
              <Textarea
                id="shopGreeting"
                value={form.shopGreeting}
                onChange={(e) => handleChange('shopGreeting', e.target.value)}
                placeholder="Contoh: Terima kasih telah berbelanja di toko kami!"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Kosongkan jika tidak ingin menampilkan pesan di struk.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <div>
            {saved && (
              <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                Pengaturan berhasil disimpan!
              </div>
            )}
          </div>
          <Button onClick={handleSave} className="gap-2 min-w-[160px]">
            <Save className="w-4 h-4" />
            Simpan Pengaturan
          </Button>
        </div>
      </div>
    </div>
  );
}
