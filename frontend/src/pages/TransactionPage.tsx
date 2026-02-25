// Transaction/checkout page with customer autocomplete, cart management, and receipt printing via window.print()
import { useState, useEffect, useRef } from 'react';
import { useSearch } from '@tanstack/react-router';
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
  const search = useSearch({ from: '/transaction' });
  const prefilledName = (search as Record<string, string>).customerName || '';

  const { data: inventoryItems = [] } = useGetAllInventoryItems();
  const { data: allCustomers = [] } = useGetAllCustomers();
  const addTransaction = useAddTransaction();
  const upsertCustomer = useUpsertCustomerRecord();
  useShopSettings(); // ensure settings are loaded

  const [customerName, setCustomerName] = useState(prefilledName);
  const [customerPhone, setCustomerPhone] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [suggestions, setSuggestions] = useState<CustomerRecord[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Pre-fill from service navigation
  useEffect(() => {
    if (prefilledName) {
      setCustomerName(prefilledName);
      const found = allCustomers.find(
        (c) => c.name.toLowerCase() === prefilledName.toLowerCase()
      );
      if (found) setCustomerPhone(found.phone);
    }
  }, [prefilledName, allCustomers]);

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

    setIsPrinting(true);
    try {
      const txId = await addTransaction.mutateAsync({
        id: BigInt(0),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: cartItems.map((c) => ({
          itemCode: c.itemCode,
          quantity: BigInt(c.quantity),
          sellPrice: BigInt(c.sellPrice),
          buyPrice: BigInt(c.buyPrice),
        })),
        totalAmount: BigInt(total),
        buyPrices: cartItems.map((c) => [c.itemCode, BigInt(c.buyPrice)] as [string, bigint]),
      });

      setLastTransactionId(String(txId));

      // Upsert customer
      const existingCustomer = allCustomers.find(
        (c) =>
          (customerPhone.trim() && c.phone === customerPhone.trim()) ||
          c.name.toLowerCase() === customerName.trim().toLowerCase()
      );

      if (existingCustomer) {
        await upsertCustomer.mutateAsync({
          ...existingCustomer,
          transactionCount: existingCustomer.transactionCount + BigInt(1),
          phone: customerPhone.trim() || existingCustomer.phone,
        });
      } else if (customerName.trim()) {
        await upsertCustomer.mutateAsync({
          name: customerName.trim(),
          phone: customerPhone.trim(),
          transactionCount: BigInt(1),
          discountAmount: BigInt(0),
          discountPercentage: BigInt(0),
          discountType: DiscountType.goods,
          vehicleHistory: [],
        });
      }

      // Trigger print
      setTimeout(() => {
        window.print();
        toast.success('Transaksi berhasil disimpan!');
        setCartItems([]);
        setCustomerName('');
        setCustomerPhone('');
        setIsPrinting(false);
      }, 300);
    } catch (err: unknown) {
      setIsPrinting(false);
      toast.error('Gagal menyimpan transaksi: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <>
      {/* Receipt for printing */}
      <ReceiptPrint
        customerName={customerName}
        customerPhone={customerPhone}
        cartItems={cartItems}
        total={total}
        transactionId={lastTransactionId}
      />

      <div className="space-y-6 no-print">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Transaksi</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Customer + Item Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4" />
                  Data Pelanggan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Label>Nama Pelanggan *</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    onFocus={() => customerName.length >= 3 && setShowSuggestions(suggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Ketik min. 3 huruf untuk autocomplete"
                    className="mt-1"
                  />
                  {showSuggestions && (
                    <div
                      ref={suggestionsRef}
                      className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto"
                    >
                      {suggestions.map((c) => (
                        <button
                          key={c.phone}
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between items-center"
                          onMouseDown={() => selectCustomer(c)}
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="text-muted-foreground">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Nomor HP</Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Add Item */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tambah Item ke Keranjang</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 items-end flex-wrap">
                  <div className="flex-1 min-w-48 space-y-2">
                    <Label>Pilih Barang/Jasa</Label>
                    <Select value={selectedItemCode} onValueChange={setSelectedItemCode}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih barang atau jasa..." />
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
                  <div className="w-24 space-y-2">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <Button onClick={addToCart} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Tambah
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Cart */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Keranjang</span>
                  <Badge variant="secondary">{cartItems.length} item</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cartItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">Keranjang kosong</p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {cartItems.map((item) => (
                        <div key={item.itemCode} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.itemName}</p>
                            <p className="text-xs text-muted-foreground">{formatRupiah(item.sellPrice)}</p>
                          </div>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQty(item.itemCode, parseInt(e.target.value) || 0)}
                            className="w-16 h-7 text-center text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => removeFromCart(item.itemCode)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border pt-3">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-primary">{formatRupiah(total)}</span>
                      </div>
                    </div>
                  </>
                )}
                <Button
                  className="w-full gap-2"
                  onClick={handleTransact}
                  disabled={isPrinting || addTransaction.isPending || cartItems.length === 0}
                >
                  {isPrinting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4" />
                  )}
                  Transaksi & Cetak
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
