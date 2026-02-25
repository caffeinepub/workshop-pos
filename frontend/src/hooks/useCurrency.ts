// Stub currency hook - kept for compatibility; new app uses IDR formatting inline
export function useCurrency() {
  const formatAmount = (amount: number, _currency?: string): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getCurrencySymbol = (_currency?: string): string => 'Rp';

  return { formatAmount, getCurrencySymbol };
}
