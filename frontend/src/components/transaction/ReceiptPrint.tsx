// Print-friendly receipt component rendered only during window.print()
import { useShopSettings } from '../../hooks/useShopSettings';

export interface CartItem {
  itemCode: string;
  itemName: string;
  quantity: number;
  sellPrice: number;
  buyPrice: number;
}

interface ReceiptPrintProps {
  customerName: string;
  customerPhone: string;
  cartItems: CartItem[];
  total: number;
  transactionId?: string;
}

function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n);
}

export function ReceiptPrint({
  customerName,
  customerPhone,
  cartItems,
  total,
  transactionId,
}: ReceiptPrintProps) {
  const { settings } = useShopSettings();
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="receipt-print-area">
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: '12px',
          width: '300px',
          margin: '0 auto',
          padding: '8px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          {settings.shopLogoBase64 && (
            <img
              src={settings.shopLogoBase64}
              alt="Logo"
              style={{
                width: '60px',
                height: '60px',
                objectFit: 'contain',
                margin: '0 auto 4px',
                display: 'block',
              }}
            />
          )}
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{settings.shopName}</div>
          <div style={{ fontSize: '11px' }}>{settings.shopAddress}</div>
          <div style={{ fontSize: '11px' }}>Telp: {settings.shopPhone}</div>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Transaction Info */}
        <div style={{ fontSize: '11px', marginBottom: '4px' }}>
          <div>
            Tanggal: {dateStr} {timeStr}
          </div>
          {transactionId && <div>No. Transaksi: {transactionId}</div>}
          <div>Pelanggan: {customerName || '-'}</div>
          {customerPhone && <div>No. HP: {customerPhone}</div>}
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Items */}
        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Item</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Harga</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {cartItems.map((item, idx) => (
              <tr key={idx}>
                <td
                  style={{
                    paddingBottom: '2px',
                    maxWidth: '120px',
                    wordBreak: 'break-word',
                  }}
                >
                  {item.itemName}
                </td>
                <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>{formatRupiah(item.sellPrice)}</td>
                <td style={{ textAlign: 'right' }}>
                  {formatRupiah(item.quantity * item.sellPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Total */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 'bold',
            fontSize: '13px',
          }}
        >
          <span>TOTAL</span>
          <span>{formatRupiah(total)}</span>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Footer greeting */}
        {settings.shopGreeting && (
          <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '8px' }}>
            <p>{settings.shopGreeting}</p>
          </div>
        )}
      </div>
    </div>
  );
}
