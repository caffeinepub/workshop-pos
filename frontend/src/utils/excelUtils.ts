import { InventoryItem, CustomerRecord, InventoryType, DiscountType } from '../backend';

// ─── Minimal XLSX writer (no external dependency) ───────────────────────────
// Generates a real .xlsx (Office Open XML) file using only browser APIs.

function u8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

// CRC32 table
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function le16(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
}
function le32(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

interface ZipEntry { name: string; data: Uint8Array; }

function buildZip(entries: ZipEntry[]): ArrayBuffer {
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = u8(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    // Local file header
    const local = concat(
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]), // signature
      le16(20), le16(0), le16(0),               // version, flags, compression (stored)
      le16(0), le16(0),                          // mod time, mod date
      le32(crc), le32(size), le32(size),         // crc, compressed, uncompressed
      le16(nameBytes.length), le16(0),           // name len, extra len
      nameBytes,
      entry.data,
    );
    localHeaders.push(local);

    // Central directory header
    const central = concat(
      new Uint8Array([0x50, 0x4b, 0x01, 0x02]), // signature
      le16(20), le16(20), le16(0), le16(0),      // version made, version needed, flags, compression
      le16(0), le16(0),                           // mod time, mod date
      le32(crc), le32(size), le32(size),          // crc, compressed, uncompressed
      le16(nameBytes.length), le16(0), le16(0),  // name len, extra len, comment len
      le16(0), le16(0),                           // disk start, internal attr
      le32(0),                                    // external attr
      le32(offset),                               // local header offset
      nameBytes,
    );
    centralHeaders.push(central);
    offset += local.length;
  }

  const centralDir = concat(...centralHeaders);
  const centralOffset = offset;
  const eocd = concat(
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]), // signature
    le16(0), le16(0),                          // disk number, disk with central dir
    le16(entries.length), le16(entries.length), // entries on disk, total entries
    le32(centralDir.length),                   // central dir size
    le32(centralOffset),                       // central dir offset
    le16(0),                                   // comment length
  );

  const result = concat(...localHeaders, centralDir, eocd);
  // Return a plain ArrayBuffer to avoid SharedArrayBuffer type issues
  return result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength) as ArrayBuffer;
}

// XML escape
function xe(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Build a worksheet XML from rows (array of arrays of values)
function buildSheetXml(rows: (string | number)[][]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>`;

  for (let r = 0; r < rows.length; r++) {
    xml += `<row r="${r + 1}">`;
    for (let c = 0; c < rows[r].length; c++) {
      const col = String.fromCharCode(65 + c);
      const cell = `${col}${r + 1}`;
      const val = rows[r][c];
      if (typeof val === 'number') {
        xml += `<c r="${cell}"><v>${val}</v></c>`;
      } else {
        xml += `<c r="${cell}" t="inlineStr"><is><t>${xe(String(val ?? ''))}</t></is></c>`;
      }
    }
    xml += `</row>`;
  }

  xml += `</sheetData></worksheet>`;
  return xml;
}

function buildXlsx(rows: (string | number)[][]): ArrayBuffer {
  const sheetXml = buildSheetXml(rows);

  const entries: ZipEntry[] = [
    {
      name: '[Content_Types].xml',
      data: u8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`),
    },
    {
      name: '_rels/.rels',
      data: u8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    },
    {
      name: 'xl/workbook.xml',
      data: u8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: u8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`),
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      data: u8(sheetXml),
    },
  ];

  return buildZip(entries);
}

// ─── Parse XLSX (read shared strings + inline strings from sheet1) ────────────
function parseXlsx(buffer: ArrayBuffer): string[][] {
  const bytes = new Uint8Array(buffer);

  // Find all local file entries
  const files: Record<string, string> = {};

  let i = 0;
  while (i < bytes.length - 4) {
    // Local file header signature: PK\x03\x04
    if (bytes[i] === 0x50 && bytes[i+1] === 0x4b && bytes[i+2] === 0x03 && bytes[i+3] === 0x04) {
      const compression = bytes[i+8] | (bytes[i+9] << 8);
      const compressedSize = bytes[i+18] | (bytes[i+19] << 8) | (bytes[i+20] << 16) | (bytes[i+21] << 24);
      const nameLen = bytes[i+26] | (bytes[i+27] << 8);
      const extraLen = bytes[i+28] | (bytes[i+29] << 8);
      const nameBytes = bytes.slice(i+30, i+30+nameLen);
      const name = new TextDecoder().decode(nameBytes);
      const dataStart = i + 30 + nameLen + extraLen;
      const dataEnd = dataStart + compressedSize;

      if (compression === 0) {
        // Stored (no compression)
        const content = new TextDecoder().decode(bytes.slice(dataStart, dataEnd));
        files[name] = content;
      }
      i = dataEnd;
    } else {
      i++;
    }
  }

  // Parse shared strings if present
  const sharedStrings: string[] = [];
  const ssXml = files['xl/sharedStrings.xml'];
  if (ssXml) {
    const siMatches = ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g);
    for (const m of siMatches) {
      const tMatches = m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g);
      let val = '';
      for (const t of tMatches) val += t[1];
      sharedStrings.push(val.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'));
    }
  }

  // Parse sheet1
  const sheetXml = files['xl/worksheets/sheet1.xml'] || files['xl/worksheets/Sheet1.xml'];
  if (!sheetXml) return [];

  const rows: string[][] = [];
  const rowMatches = sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g);

  for (const rowMatch of rowMatches) {
    const rowContent = rowMatch[1];
    const cells: string[] = [];
    const cellMatches = rowContent.matchAll(/<c\s([^>]*)>([\s\S]*?)<\/c>/g);

    for (const cellMatch of cellMatches) {
      const attrs = cellMatch[1];
      const cellContent = cellMatch[2];

      // Get column reference to handle sparse cells
      const rAttr = attrs.match(/r="([A-Z]+)(\d+)"/);
      const colStr = rAttr ? rAttr[1] : '';
      const colIdx = colStr.split('').reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1;

      // Pad with empty strings for sparse columns
      while (cells.length < colIdx) cells.push('');

      const typeAttr = attrs.match(/t="([^"]+)"/);
      const cellType = typeAttr ? typeAttr[1] : '';

      let value = '';
      if (cellType === 'inlineStr') {
        const tMatch = cellContent.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        value = tMatch ? tMatch[1] : '';
      } else if (cellType === 's') {
        const vMatch = cellContent.match(/<v>([\s\S]*?)<\/v>/);
        const idx = vMatch ? parseInt(vMatch[1]) : -1;
        value = idx >= 0 && idx < sharedStrings.length ? sharedStrings[idx] : '';
      } else {
        const vMatch = cellContent.match(/<v>([\s\S]*?)<\/v>/);
        value = vMatch ? vMatch[1] : '';
      }

      // Decode XML entities
      value = value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      cells.push(value);
    }

    rows.push(cells);
  }

  return rows;
}

function downloadXlsx(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Inventory XLSX Export ────────────────────────────────────────────────────
export function exportInventoryToXLSX(items: InventoryItem[], filename = 'produk.xlsx'): void {
  const headers = [
    'Kode Barang', 'Nama Barang', 'Jenis', 'Qty', 'Harga Jual', 'Harga Beli',
    'Stock', 'Stock Min', 'Stock Maks',
  ];

  const rows: (string | number)[][] = [headers];
  for (const item of items) {
    rows.push([
      item.itemCode,
      item.itemName,
      item.type === InventoryType.barang ? 'barang' : 'jasa',
      item.quantity !== undefined && item.quantity !== null ? Number(item.quantity) : '',
      Number(item.sellPrice),
      Number(item.buyPrice),
      item.stock !== undefined && item.stock !== null ? Number(item.stock) : '',
      Number(item.minStock),
      Number(item.maxStock),
    ]);
  }

  downloadXlsx(buildXlsx(rows), filename);
}

// ─── Inventory XLSX Import ────────────────────────────────────────────────────
export interface ImportResult {
  items: InventoryItem[];
  errors: string[];
}

export function parseInventoryXLSX(buffer: ArrayBuffer): ImportResult {
  const rows = parseXlsx(buffer);
  const errors: string[] = [];
  const items: InventoryItem[] = [];

  if (rows.length === 0) {
    return { items: [], errors: ['File kosong atau format tidak dikenali.'] };
  }

  // Find header row
  const headerRow = rows[0].map(h => h.trim().toLowerCase());
  const requiredHeaders = ['kode barang', 'nama barang', 'jenis', 'harga jual', 'harga beli'];
  const missingHeaders = requiredHeaders.filter(h => !headerRow.includes(h));
  if (missingHeaders.length > 0) {
    return {
      items: [],
      errors: [`Header kolom tidak ditemukan: ${missingHeaders.join(', ')}. Pastikan file menggunakan template yang benar.`],
    };
  }

  const colIdx = (name: string) => headerRow.indexOf(name);
  const iKode = colIdx('kode barang');
  const iNama = colIdx('nama barang');
  const iJenis = colIdx('jenis');
  const iQty = colIdx('qty');
  const iHargaJual = colIdx('harga jual');
  const iHargaBeli = colIdx('harga beli');
  const iStock = colIdx('stock');
  const iStockMin = colIdx('stock min');
  const iStockMaks = colIdx('stock maks');

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every(c => !c.trim())) continue; // skip empty rows

    const rowNum = r + 1;
    const itemCode = (row[iKode] ?? '').trim();
    const itemName = (row[iNama] ?? '').trim();
    const jenisRaw = (row[iJenis] ?? '').trim().toLowerCase();

    if (!itemCode) { errors.push(`Baris ${rowNum}: Kode Barang kosong.`); continue; }
    if (!itemName) { errors.push(`Baris ${rowNum}: Nama Barang kosong.`); continue; }
    if (jenisRaw !== 'barang' && jenisRaw !== 'jasa') {
      errors.push(`Baris ${rowNum}: Jenis harus 'barang' atau 'jasa', ditemukan '${jenisRaw}'.`);
      continue;
    }

    const sellPrice = parseFloat((row[iHargaJual] ?? '0').replace(/[^0-9.]/g, ''));
    const buyPrice = parseFloat((row[iHargaBeli] ?? '0').replace(/[^0-9.]/g, ''));

    if (isNaN(sellPrice)) { errors.push(`Baris ${rowNum}: Harga Jual tidak valid.`); continue; }
    if (isNaN(buyPrice)) { errors.push(`Baris ${rowNum}: Harga Beli tidak valid.`); continue; }

    const qtyRaw = iQty >= 0 ? (row[iQty] ?? '').trim() : '';
    const stockRaw = iStock >= 0 ? (row[iStock] ?? '').trim() : '';
    const minStockRaw = iStockMin >= 0 ? (row[iStockMin] ?? '').trim() : '0';
    const maxStockRaw = iStockMaks >= 0 ? (row[iStockMaks] ?? '').trim() : '0';

    const item: InventoryItem = {
      itemCode,
      itemName,
      type: jenisRaw === 'barang' ? InventoryType.barang : InventoryType.jasa,
      sellPrice: BigInt(Math.round(sellPrice)),
      buyPrice: BigInt(Math.round(buyPrice)),
      quantity: qtyRaw ? BigInt(Math.round(parseFloat(qtyRaw))) : undefined,
      stock: stockRaw ? BigInt(Math.round(parseFloat(stockRaw))) : undefined,
      minStock: BigInt(Math.round(parseFloat(minStockRaw || '0'))),
      maxStock: BigInt(Math.round(parseFloat(maxStockRaw || '0'))),
    };

    items.push(item);
  }

  return { items, errors };
}

/**
 * Parse a File object (XLSX) and return ImportResult.
 * Accepts a File and reads it as ArrayBuffer internally.
 */
export async function importInventoryFromXLSX(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  return parseInventoryXLSX(buffer);
}

// ─── Customer XLSX Export ─────────────────────────────────────────────────────
export function exportCustomersToXLSX(customers: CustomerRecord[], filename = 'pelanggan.xlsx'): void {
  const headers = [
    'Nama', 'Telepon', 'Jumlah Transaksi', 'Diskon Nominal', 'Diskon Persen', 'Tipe Diskon',
  ];

  const rows: (string | number)[][] = [headers];
  for (const c of customers) {
    rows.push([
      c.name,
      c.phone,
      Number(c.transactionCount),
      Number(c.discountAmount),
      Number(c.discountPercentage),
      c.discountType === DiscountType.goods ? 'goods' : 'services',
    ]);
  }

  downloadXlsx(buildXlsx(rows), filename);
}

// ─── Customer XLSX Import ─────────────────────────────────────────────────────
export interface ParsedCustomerRow {
  name?: string;
  phone?: string;
  transactionCount?: bigint;
  discountAmount?: bigint;
  discountPercentage?: bigint;
  discountType?: DiscountType;
  vehicleHistory?: Array<{ brand: string; model: string; plate: string }>;
}

export async function importCustomersFromXLSX(file: File): Promise<ParsedCustomerRow[]> {
  const buffer = await file.arrayBuffer();
  const rows = parseXlsx(buffer);

  if (rows.length < 2) return [];

  const headerRow = rows[0].map(h => h.trim().toLowerCase());
  const iNama = headerRow.indexOf('nama');
  const iTelepon = headerRow.indexOf('telepon');
  const iJumlahTransaksi = headerRow.indexOf('jumlah transaksi');
  const iDiskonNominal = headerRow.indexOf('diskon nominal');
  const iDiskonPersen = headerRow.indexOf('diskon persen');
  const iTipeDiskon = headerRow.indexOf('tipe diskon');

  const results: ParsedCustomerRow[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every(c => !c.trim())) continue;

    const name = iNama >= 0 ? (row[iNama] ?? '').trim() : '';
    const phone = iTelepon >= 0 ? (row[iTelepon] ?? '').trim() : '';

    if (!name && !phone) continue;

    const transactionCountRaw = iJumlahTransaksi >= 0 ? (row[iJumlahTransaksi] ?? '').trim() : '';
    const discountAmountRaw = iDiskonNominal >= 0 ? (row[iDiskonNominal] ?? '').trim() : '';
    const discountPercentageRaw = iDiskonPersen >= 0 ? (row[iDiskonPersen] ?? '').trim() : '';
    const tipeDiskonRaw = iTipeDiskon >= 0 ? (row[iTipeDiskon] ?? '').trim().toLowerCase() : '';

    const discountType =
      tipeDiskonRaw === 'services' || tipeDiskonRaw === 'jasa'
        ? DiscountType.services
        : DiscountType.goods;

    results.push({
      name: name || undefined,
      phone: phone || undefined,
      transactionCount: transactionCountRaw ? BigInt(Math.round(parseFloat(transactionCountRaw))) : BigInt(0),
      discountAmount: discountAmountRaw ? BigInt(Math.round(parseFloat(discountAmountRaw.replace(/[^0-9.]/g, '')))) : BigInt(0),
      discountPercentage: discountPercentageRaw ? BigInt(Math.round(parseFloat(discountPercentageRaw))) : BigInt(0),
      discountType,
      vehicleHistory: [],
    });
  }

  return results;
}

// ─── Backward-compatible aliases ──────────────────────────────────────────────

/** @deprecated Use exportInventoryToXLSX */
export function exportInventoryToCSV(items: InventoryItem[], filename = 'produk.xlsx'): void {
  exportInventoryToXLSX(items, filename);
}

/** @deprecated Use exportInventoryToXLSX */
export function exportInventoryToExcel(items: InventoryItem[], filename = 'produk.xlsx'): void {
  exportInventoryToXLSX(items, filename);
}

/** @deprecated Use importInventoryFromXLSX */
export async function importInventoryFromCSV(file: File): Promise<ImportResult> {
  return importInventoryFromXLSX(file);
}

/** @deprecated Use importInventoryFromXLSX */
export async function importInventoryFromExcel(file: File): Promise<ImportResult> {
  return importInventoryFromXLSX(file);
}

/** @deprecated Use exportCustomersToXLSX */
export function exportCustomersToCSV(customers: CustomerRecord[], filename = 'pelanggan.xlsx'): void {
  exportCustomersToXLSX(customers, filename);
}

/** @deprecated Use exportCustomersToXLSX */
export function exportCustomersToExcel(customers: CustomerRecord[], filename = 'pelanggan.xlsx'): void {
  exportCustomersToXLSX(customers, filename);
}

/** @deprecated Use importCustomersFromXLSX */
export async function importCustomersFromExcel(file: File): Promise<ParsedCustomerRow[]> {
  return importCustomersFromXLSX(file);
}

/** @deprecated Use importCustomersFromXLSX */
export async function importCustomersFromCSV(file: File): Promise<ParsedCustomerRow[]> {
  return importCustomersFromXLSX(file);
}
