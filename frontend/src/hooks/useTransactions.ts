// Stub hook - old transactions hook replaced by useTransaction.ts for new backend
export function useTransactions() {
  return {
    data: [] as unknown[],
    isLoading: false,
  };
}
