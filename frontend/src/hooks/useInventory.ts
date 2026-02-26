import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { InventoryItem } from '../backend';

export function useAddInventoryItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: InventoryItem) => {
      if (!actor) throw new Error('Actor tidak tersedia. Pastikan Anda sudah login.');
      return actor.addInventoryItem(item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
    },
    onError: (error: any) => {
      console.error('Failed to add inventory item:', error);
    },
  });
}

export function useUpdateInventoryItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: InventoryItem) => {
      if (!actor) throw new Error('Actor tidak tersedia. Pastikan Anda sudah login.');
      return actor.updateInventoryItem(item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
    },
    onError: (error: any) => {
      console.error('Failed to update inventory item:', error);
    },
  });
}

export function useAddOrUpdateInventoryItem() {
  const addMutation = useAddInventoryItem();
  const updateMutation = useUpdateInventoryItem();

  const mutateAsync = async (item: InventoryItem) => {
    try {
      return await addMutation.mutateAsync(item);
    } catch {
      return await updateMutation.mutateAsync(item);
    }
  };

  return {
    mutateAsync,
    isPending: addMutation.isPending || updateMutation.isPending,
    isError: addMutation.isError && updateMutation.isError,
    error: addMutation.error || updateMutation.error,
  };
}
