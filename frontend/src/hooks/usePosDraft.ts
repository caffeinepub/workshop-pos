// Stub hook - replaced by new workshop POS system; kept to avoid import errors in legacy files
export function usePosDraft() {
  return {
    draft: {
      items: new Map<string, bigint>(),
      appliedDiscount: BigInt(0),
      hasLoyaltyCard: false,
      originalSubtotal: BigInt(0),
      currency: 'usd' as const,
    },
    addItem: (_item: unknown) => {},
    updateQuantity: (_id: string, _qty: bigint) => {},
    removeItem: (_id: string) => {},
    setDiscount: (_d: bigint) => {},
    setLoyaltyCard: (_h: boolean) => {},
    setCurrency: (_c: string) => {},
    clearDraft: () => {},
  };
}
