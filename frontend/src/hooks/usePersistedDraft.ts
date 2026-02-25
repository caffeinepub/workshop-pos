// Stub hook - old draft persistence replaced by new transaction system
import { useCallback } from 'react';

export function usePersistedDraft() {
  const saveDraft = useCallback((_draft: unknown) => {}, []);
  const checkout = useCallback(async (_draft: unknown) => {}, []);

  return {
    saveDraft,
    isCheckingOut: false,
    checkout,
  };
}
