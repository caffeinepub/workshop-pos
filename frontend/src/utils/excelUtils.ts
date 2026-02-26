import { InventoryItem, InventoryType, CustomerRecord, DiscountType } from '../backend';

// ─── Inventory CSV Export/Import ─────────────────────────────────────────────

// CSV column headers (Indonesian labels)
const INVENTORY_CSV_HEADERS = [
  'kodeBarang',
  'namaBarang',
  'jenis',
  'qty',
  'hargaJual',
  'hargaBeli',
  'stock',
  'stockMinimal',
  'stockMaksimal',
];

/**
 * Export inventory items to a CSV file and trigger download.
 */
export function exportInventoryToCSV(items: InventoryItem[], filename = 'produk-inventory.csv'): void {
  const rows: string[] = [INVENTORY_CSV_HEADERS.join(',')];

  for (const item of items) {
    const isJasa = item.type === InventoryType.jasa;
    const row = [
      escapeCsvValue(item.itemCode),
      escapeCsvValue(item.itemName),
      isJasa ? 'Jasa' : 'Barang',
      isJasa ? '' : (item.quantity !== undefined && item.quantity !== null ? String(item.quantity) : ''),
      String(item.sellPrice),
      String(item.buyPrice),
      item.stock !== undefined && item.stock !== null ? String(item.stock) : '',
      String(item.minStock),
      String(item.maxStock),
    ];
    rows.push(row.join(','));
  }

  downloadCSV(rows.join('\n'), filename);
}

/** Alias for backward compatibility */
export function exportInventoryToExcel(items: InventoryItem[], filename = 'produk-inventory.csv'): void {
  exportInventoryToCSV(items, filename);
}

export interface ParsedInventoryRow {
  itemCode: string;
  itemName: string;
  type: InventoryType;
  quantity?: bigint;
  sellPrice: bigint;
  buyPrice: bigint;
  stock?: bigint;
  minStock: bigint;
  maxStock: bigint;
}

export interface ImportResult {
  items: ParsedInventoryRow[];
  errors: string[];
}

/**
 * Parse a CSV file (File object) and return parsed inventory rows.
 * Accepts both comma and semicolon delimiters.
 */
export async function importInventoryFromCSV(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || '';
        const cleaned = text.replace(/^\uFEFF/, '');
        const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);

        if (lines.length < 2) {
          resolve({ items: [], errors: ['File CSV kosong atau tidak memiliki data.'] });
          return;
        }

        const headerLine = lines[0];
        const delimiter = headerLine.includes(';') ? ';' : ',';
        const headers = parseCSVLine(headerLine, delimiter).map((h) => h.trim().toLowerCase());

        const idx = {
          kodeBarang: findHeaderIndex(headers, ['kodebarang', 'kode barang', 'item code', 'itemcode', 'kode']),
          namaBarang: findHeaderIndex(headers, ['namabarang', 'nama barang', 'item name', 'itemname', 'nama']),
          jenis: findHeaderIndex(headers, ['jenis', 'type', 'tipe']),
          qty: findHeaderIndex(headers, ['qty', 'quantity', 'jumlah']),
          hargaJual: findHeaderIndex(headers, ['hargajual', 'harga jual', 'sell price', 'sellprice']),
          hargaBeli: findHeaderIndex(headers, ['hargabeli', 'harga beli', 'buy price', 'buyprice']),
          stock: findHeaderIndex(headers, ['stock', 'stok']),
          stockMinimal: findHeaderIndex(headers, ['stockminimal', 'stock minimal', 'min stock', 'minstock', 'stok minimal']),
          stockMaksimal: findHeaderIndex(headers, ['stockmaksimal', 'stock maksimal', 'max stock', 'maxstock', 'stok maksimal']),
        };

        const errors: string[] = [];
        const items: ParsedInventoryRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const lineNum = i + 1;
          const cols = parseCSVLine(lines[i], delimiter);

          const itemCode = getCol(cols, idx.kodeBarang)?.trim();
          const itemName = getCol(cols, idx.namaBarang)?.trim();
          const jenisRaw = getCol(cols, idx.jenis)?.trim().toLowerCase();
          const qtyRaw = getCol(cols, idx.qty)?.trim();
          const hargaJualRaw = getCol(cols, idx.hargaJual)?.trim();
          const hargaBeliRaw = getCol(cols, idx.hargaBeli)?.trim();
          const stockRaw = getCol(cols, idx.stock)?.trim();
          const stockMinRaw = getCol(cols, idx.stockMinimal)?.trim();
          const stockMaxRaw = getCol(cols, idx.stockMaksimal)?.trim();

          if (!itemCode) {
            errors.push(`Baris ${lineNum}: Kode barang kosong, dilewati.`);
            continue;
          }
          if (!itemName) {
            errors.push(`Baris ${lineNum}: Nama barang kosong, dilewati.`);
            continue;
          }

          const isJasa = jenisRaw === 'jasa' || jenisRaw === 'service';
          const type: InventoryType = isJasa ? InventoryType.jasa : InventoryType.barang;

          let quantity: bigint | undefined = undefined;
          if (!isJasa && qtyRaw && qtyRaw !== '') {
            const parsed = parseNatural(qtyRaw);
            if (parsed === null) {
              errors.push(`Baris ${lineNum}: Qty tidak valid ("${qtyRaw}"), dilewati.`);
              continue;
            }
            quantity = parsed;
          }

          const sellPrice = parseNatural(hargaJualRaw ?? '');
          if (sellPrice === null) {
            errors.push(`Baris ${lineNum}: Harga jual tidak valid ("${hargaJualRaw}"), dilewati.`);
            continue;
          }

          const buyPrice = parseNatural(hargaBeliRaw ?? '');
          if (buyPrice === null) {
            errors.push(`Baris ${lineNum}: Harga beli tidak valid ("${hargaBeliRaw}"), dilewati.`);
            continue;
          }

          let stock: bigint | undefined = undefined;
          if (!isJasa && stockRaw && stockRaw !== '') {
            const parsed = parseNatural(stockRaw);
            if (parsed === null) {
              errors.push(`Baris ${lineNum}: Stock tidak valid ("${stockRaw}"), dilewati.`);
              continue;
            }
            stock = parsed;
          }

          const minStock = parseNatural(stockMinRaw ?? '0') ?? BigInt(0);
          const maxStock = parseNatural(stockMaxRaw ?? '0') ?? BigInt(0);

          items.push({ itemCode, itemName, type, quantity, sellPrice, buyPrice, stock, minStock, maxStock });
        }

        resolve({ items, errors });
      } catch (err) {
        resolve({ items: [], errors: [`Gagal membaca file: ${String(err)}`] });
      }
    };
    reader.onerror = () => {
      resolve({ items: [], errors: ['Gagal membaca file CSV.'] });
    };
    reader.readAsText(file, 'utf-8');
  });
}

/** Alias for backward compatibility */
export async function importInventoryFromExcel(file: File): Promise<ParsedInventoryRow[]> {
  const result = await importInventoryFromCSV(file);
  return result.items;
}

// ─── Customer CSV Export/Import ───────────────────────────────────────────────

const CUSTOMER_CSV_HEADERS = [
  'nama',
  'telepon',
  'jumlahTransaksi',
  'diskonRupiah',
  'diskonPersen',
  'jenisDiskon',
  'riwayatKendaraan',
];

export interface ParsedCustomerRow {
  name?: string;
  phone?: string;
  transactionCount?: bigint;
  discountAmount?: bigint;
  discountPercentage?: bigint;
  discountType?: DiscountType;
  vehicleHistory?: Array<{ brand: string; model: string; plate: string }>;
}

/**
 * Export customer records to a CSV file and trigger download.
 */
export function exportCustomersToCSV(customers: CustomerRecord[], filename = 'data-pelanggan.csv'): void {
  const rows: string[] = [CUSTOMER_CSV_HEADERS.join(',')];

  for (const c of customers) {
    const vehicleStr = c.vehicleHistory
      .map((v) => `${v.brand}|${v.model}|${v.plate}`)
      .join(';');
    const row = [
      escapeCsvValue(c.name),
      escapeCsvValue(c.phone),
      String(c.transactionCount),
      String(c.discountAmount),
      String(c.discountPercentage),
      c.discountType === DiscountType.goods ? 'Barang' : 'Jasa',
      escapeCsvValue(vehicleStr),
    ];
    rows.push(row.join(','));
  }

  downloadCSV(rows.join('\n'), filename);
}

/** Alias for backward compatibility */
export function exportCustomersToExcel(customers: CustomerRecord[], filename = 'data-pelanggan.csv'): void {
  exportCustomersToCSV(customers, filename);
}

/**
 * Parse a CSV file and return parsed customer rows.
 */
export async function importCustomersFromCSV(file: File): Promise<ParsedCustomerRow[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || '';
        const cleaned = text.replace(/^\uFEFF/, '');
        const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);

        if (lines.length < 2) {
          resolve([]);
          return;
        }

        const headerLine = lines[0];
        const delimiter = headerLine.includes(';') ? ';' : ',';
        const headers = parseCSVLine(headerLine, delimiter).map((h) => h.trim().toLowerCase());

        const idx = {
          nama: findHeaderIndex(headers, ['nama', 'name']),
          telepon: findHeaderIndex(headers, ['telepon', 'phone', 'hp', 'no hp', 'nohp']),
          jumlahTransaksi: findHeaderIndex(headers, ['jumlahtransaksi', 'jumlah transaksi', 'transactioncount', 'transaksi']),
          diskonRupiah: findHeaderIndex(headers, ['diskonrupiah', 'diskon rupiah', 'discountamount', 'diskon rp']),
          diskonPersen: findHeaderIndex(headers, ['diskonpersen', 'diskon persen', 'discountpercentage', 'diskon %']),
          jenisDiskon: findHeaderIndex(headers, ['jenisdiskon', 'jenis diskon', 'discounttype']),
          riwayatKendaraan: findHeaderIndex(headers, ['riwayatkendaraan', 'riwayat kendaraan', 'vehiclehistory']),
        };

        const results: ParsedCustomerRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i], delimiter);
          const name = getCol(cols, idx.nama)?.trim();
          const phone = getCol(cols, idx.telepon)?.trim();

          if (!name && !phone) continue;

          const transactionCountRaw = getCol(cols, idx.jumlahTransaksi)?.trim();
          const discountAmountRaw = getCol(cols, idx.diskonRupiah)?.trim();
          const discountPercentageRaw = getCol(cols, idx.diskonPersen)?.trim();
          const jenisDiskonRaw = getCol(cols, idx.jenisDiskon)?.trim().toLowerCase();
          const vehicleRaw = getCol(cols, idx.riwayatKendaraan)?.trim();

          const discountType =
            jenisDiskonRaw === 'jasa' || jenisDiskonRaw === 'service'
              ? DiscountType.services
              : DiscountType.goods;

          const vehicleHistory: Array<{ brand: string; model: string; plate: string }> = [];
          if (vehicleRaw) {
            for (const entry of vehicleRaw.split(';')) {
              const parts = entry.split('|');
              if (parts.length >= 2) {
                vehicleHistory.push({
                  brand: parts[0]?.trim() || '',
                  model: parts[1]?.trim() || '',
                  plate: parts[2]?.trim() || '',
                });
              }
            }
          }

          results.push({
            name,
            phone,
            transactionCount: transactionCountRaw ? (parseNatural(transactionCountRaw) ?? BigInt(0)) : BigInt(0),
            discountAmount: discountAmountRaw ? (parseNatural(discountAmountRaw) ?? BigInt(0)) : BigInt(0),
            discountPercentage: discountPercentageRaw ? (parseNatural(discountPercentageRaw) ?? BigInt(0)) : BigInt(0),
            discountType,
            vehicleHistory,
          });
        }

        resolve(results);
      } catch {
        resolve([]);
      }
    };
    reader.onerror = () => resolve([]);
    reader.readAsText(file, 'utf-8');
  });
}

/** Alias for backward compatibility */
export async function importCustomersFromExcel(file: File): Promise<ParsedCustomerRow[]> {
  return importCustomersFromCSV(file);
}

// ─── Shared Utilities ─────────────────────────────────────────────────────────

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes(';')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function findHeaderIndex(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.indexOf(c);
    if (idx !== -1) return idx;
  }
  return -1;
}

function getCol(cols: string[], idx: number): string | undefined {
  if (idx === -1 || idx >= cols.length) return undefined;
  return cols[idx];
}

function parseNatural(raw: string): bigint | null {
  if (!raw || raw.trim() === '') return null;
  const cleaned = raw.replace(/\D/g, '');
  if (cleaned === '') return null;
  try {
    return BigInt(cleaned);
  } catch {
    return null;
  }
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
