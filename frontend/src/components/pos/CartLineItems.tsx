// Stub component - old cart replaced by new TransactionPage cart; kept to avoid import errors
export function CartLineItems(_props: {
  items: Map<string, bigint>;
  products: unknown[];
  onUpdateQuantity: (id: string, qty: bigint) => void;
  onRemove: (id: string) => void;
  currency?: string;
}) {
  return null;
}
