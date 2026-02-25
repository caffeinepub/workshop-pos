// Utility functions for CSV/Excel import/export for inventory and customer data
import type { InventoryItem, CustomerRecord } from '../backend';
import { DiscountType } from '../backend';

function downloadCSV(content: string, filename: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCSV(value: string | number | bigint): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function exportInventoryToExcel(items: InventoryItem[]) {
  const headers = ['Kode Barang', 'Nama Barang', 'Qty', 'Harga Jual', 'Harga Beli', 'Stock', 'Stock Min', 'Stock Max'];
  const rows = items.map((item) => [
    item.itemCode,
    item.itemName,
    Number(item.quantity),
    Number(item.sellPrice),
    Number(item.buyPrice),
    Number(item.stock),
    Number(item.minStock),
    Number(item.maxStock),
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCSV).join(',')).join('\n');
  downloadCSV(csv, 'inventory.csv');
}

export async function importInventoryFromExcel(file: File): Promise<Partial<InventoryItem>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
        if (lines.length < 2) {
          resolve([]);
          return;
        }
        const items: Partial<InventoryItem>[] = lines.slice(1).map((line) => {
          const cols = parseCSVLine(line);
          return {
            itemCode: cols[0]?.trim() || '',
            itemName: cols[1]?.trim() || '',
            quantity: BigInt(parseInt(cols[2]) || 0),
            sellPrice: BigInt(parseInt(cols[3]) || 0),
            buyPrice: BigInt(parseInt(cols[4]) || 0),
            stock: BigInt(parseInt(cols[5]) || 0),
            minStock: BigInt(parseInt(cols[6]) || 0),
            maxStock: BigInt(parseInt(cols[7]) || 0),
          };
        }).filter((item) => item.itemCode);
        resolve(items);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}

export function exportCustomersToExcel(customers: CustomerRecord[]) {
  const headers = [
    'Nama', 'No HP', 'Jumlah Transaksi', 'Diskon (Rp)', 'Diskon (%)',
    'Diskon Berlaku Untuk', 'Riwayat Kendaraan',
  ];
  const rows = customers.map((c) => [
    c.name,
    c.phone,
    Number(c.transactionCount),
    Number(c.discountAmount),
    Number(c.discountPercentage),
    c.discountType === DiscountType.goods ? 'Barang' : 'Jasa',
    c.vehicleHistory.map((v) => `${v.brand} ${v.model} (${v.plate})`).join('; '),
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCSV).join(',')).join('\n');
  downloadCSV(csv, 'pelanggan.csv');
}

export async function importCustomersFromExcel(file: File): Promise<Partial<CustomerRecord>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
        if (lines.length < 2) {
          resolve([]);
          return;
        }
        const customers: Partial<CustomerRecord>[] = lines.slice(1).map((line) => {
          const cols = parseCSVLine(line);
          const discountTypeStr = cols[5]?.trim().toLowerCase();
          return {
            name: cols[0]?.trim() || '',
            phone: cols[1]?.trim() || '',
            transactionCount: BigInt(parseInt(cols[2]) || 0),
            discountAmount: BigInt(parseInt(cols[3]) || 0),
            discountPercentage: BigInt(parseInt(cols[4]) || 0),
            discountType: discountTypeStr === 'barang' ? DiscountType.goods : DiscountType.services,
            vehicleHistory: [],
          };
        }).filter((c) => c.name && c.phone);
        resolve(customers);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}
