// Transaction/checkout page with customer autocomplete, cart management, and receipt printing via window.print()
import { useState, useEffect, useRef } from 'react';
import { useGetAllInventoryItems } from '../hooks/useInventory';
import { useAddTransaction } from '../hooks/useTransaction';
import { useGetAllCustomers, useUpsertCustomerRecord } from '../hooks/useCustomer';
import { useShopSettings } from '../hooks/useShopSettings';
import { DiscountType } from '../backend';
import type { CustomerRecord } from '../backend';
import { ReceiptPrint, type CartItem } from '../components/transaction/ReceiptPrint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Trash2, Printer, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';

function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

export function TransactionPage() {
  const { data: inventoryItems = [] } = useGetAllInventoryItems();
  const { data: allCustomers = [] } = useGetAllCustomers();
  const addTransaction = useAddTransaction();
  const upsertCustomer = useUpsertCustomerRecord();
  useShopSettings(); // ensure settings are loaded

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [suggestions, setSuggestions] = useState<CustomerRecord[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Customer autocomplete
  useEffect(() => {
    if (customerName.length >= 3) {
      const matches = allCustomers.filter((c) =>
        c.name.toLowerCase().includes(customerName.toLowerCase())
      );
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [customerName, allCustomers]);

  const selectCustomer = (customer: CustomerRecord) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setShowSuggestions(false);
  };

  const addToCart = () => {
    if (!selectedItemCode) { toast.error('Pilih barang terlebih dahulu'); return; }
    const item = inventoryItems.find((i) => i.itemCode === selectedItemCode);
    if (!item) return;
    const existing = cartItems.findIndex((c) => c.itemCode === selectedItemCode);
    if (existing >= 0) {
      setCartItems((prev) =>
        prev.map((c, idx) =>
          idx === existing ? { ...c, quantity: c.quantity + selectedQty } : c
        )
      );
    } else {
      setCartItems((prev) => [
        ...prev,
        {
          itemCode: item.itemCode,
          itemName: item.itemName,
          quantity: selectedQty,
          sellPrice: Number(item.sellPrice),
          buyPrice: Number(item.buyPrice),
        },
      ]);
    }
    setSelectedItemCode('');
    setSelectedQty(1);
  };

  const removeFromCart = (itemCode: string) => {
    setCartItems((prev) => prev.filter((c) => c.itemCode !== itemCode));
  };

  const updateQty = (itemCode: string, qty: number) => {
    if (qty <= 0) { removeFromCart(itemCode); return; }
    setCartItems((prev) =>
      prev.map((c) => (c.itemCode === itemCode ? { ...c, quantity: qty } : c))
    );
  };

  const total = cartItems.reduce((sum, item) => sum + item.quantity * item.sellPrice, 0);

  const handleTransact = async () => {
    if (cartItems.length === 0) { toast.error('Keranjang masih kosong'); return; }
    if (!customerName.trim()) { toast.error('Nama pelanggan wajib diisi'); return; }

    try {
      const txId = await addTransaction.mutateAsync({
        id: BigInt(0),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: cartItems.map((ci) => ({
          itemCode: ci.itemCode,
          quantity: BigInt(ci.quantity),
          sellPrice: BigInt(ci.sellPrice),
          buyPrice: BigInt(ci.buyPrice),
        })),
        totalAmount: BigInt(total),
        buyPrices: cartItems.map((ci) => [ci.itemCode, BigInt(ci.buyPrice)] as [string, bigint]),
      });

      // Upsert customer record
      const existingCustomer = allCustomers.find((c) => c.phone === customerPhone.trim());
      await upsertCustomer.mutateAsync({
        name: customerName.trim(),
        phone: customerPhone.trim(),
        transactionCount: BigInt((existingCustomer ? Number(existingCustomer.transactionCount) : 0) + 1),
        discountAmount: existingCustomer?.discountAmount ?? BigInt(0),
        discountPercentage: existingCustomer?.discountPercentage ?? BigInt(0),
        discountType: existingCustomer?.discountType ?? DiscountType.goods,
        vehicleHistory: existingCustomer?.vehicleHistory ?? [],
      });

      setLastTransactionId(String(txId));
      toast.success('Transaksi berhasil!');
      setCartItems([]);
      setCustomerName('');
      setCustomerPhone('');
    } catch (err: unknown) {
      toast.error('Gagal transaksi: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingCart className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Transaksi</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Item Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tambah Barang</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Label className="mb-1 block">Pilih Barang</Label>
                  <Select value={selectedItemCode} onValueChange={setSelectedItemCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih barang..." />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems.map((item) => (
                        <SelectItem key={item.itemCode} value={item.itemCode}>
                          {item.itemName} — {formatRupiah(Number(item.sellPrice))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Label className="mb-1 block">Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addToCart} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Tambah
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cart */}
          <Card>
            <CardHeader>
              <CardTitle>Keranjang ({cartItems.length} item)</CardTitle>
            </CardHeader>
            <CardContent>
              {cartItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Keranjang kosong</p>
              ) : (
                <div className="space-y-2">
                  {cartItems.map((ci) => (
                    <div
                      key={ci.itemCode}
                      className="flex items-center gap-3 p-2 rounded-lg border border-border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{ci.itemName}</p>
                        <p className="text-sm text-muted-foreground">{formatRupiah(ci.sellPrice)} / item</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQty(ci.itemCode, ci.quantity - 1)}
                          className="w-7 h-7 rounded bg-muted hover:bg-accent text-foreground flex items-center justify-center text-sm"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{ci.quantity}</span>
                        <button
                          onClick={() => updateQty(ci.itemCode, ci.quantity + 1)}
                          className="w-7 h-7 rounded bg-muted hover:bg-accent text-foreground flex items-center justify-center text-sm"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-sm font-semibold text-foreground w-24 text-right">
                        {formatRupiah(ci.quantity * ci.sellPrice)}
                      </div>
                      <button
                        onClick={() => removeFromCart(ci.itemCode)}
                        className="text-destructive hover:text-destructive/80 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-foreground border-t border-border pt-2 mt-2">
                    <span>Total</span>
                    <span>{formatRupiah(total)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Customer & Checkout */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Info Pelanggan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Label className="mb-1 block">Nama Pelanggan *</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama pelanggan"
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {showSuggestions && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto"
                  >
                    {suggestions.map((c) => (
                      <button
                        key={c.phone}
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                        onMouseDown={() => selectCustomer(c)}
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted-foreground ml-2">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label className="mb-1 block">No. Telepon</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Nomor telepon"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between text-lg font-bold text-foreground">
                <span>Total</span>
                <span>{formatRupiah(total)}</span>
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleTransact}
                disabled={addTransaction.isPending || cartItems.length === 0}
              >
                {addTransaction.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShoppingCart className="w-4 h-4" />
                )}
                {addTransaction.isPending ? 'Memproses...' : 'Bayar'}
              </Button>
              {lastTransactionId && (
                <Button variant="outline" className="w-full gap-2" onClick={handlePrint}>
                  <Printer className="w-4 h-4" />
                  Cetak Struk
                </Button>
              )}
            </CardContent>
          </Card>

          {lastTransactionId && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 rounded-xl p-3 text-sm text-center">
              ✓ Transaksi #{lastTransactionId} berhasil!
            </div>
          )}
        </div>
      </div>

      {/* Print receipt (hidden, shown on print) */}
      {isPrinting && lastTransactionId && (
        <ReceiptPrint
          cartItems={cartItems}
          customerName={customerName}
          customerPhone={customerPhone}
          total={total}
          transactionId={lastTransactionId}
        />
      )}
    </div>
  );
}
