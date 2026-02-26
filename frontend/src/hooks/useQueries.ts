import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { InventoryItem, CustomerRecord, Transaction } from '../backend';

// --- Standalone named exports (used by InventoryPage, ProductsPage, etc.) ---

export function useGetAllInventoryItems() {
  const { actor, isFetching } = useActor();
  return useQuery<InventoryItem[]>({
    queryKey: ['inventoryItems'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllInventoryItems();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useDeleteInventoryItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemCode: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteInventoryItem(itemCode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
    },
  });
}

export function useGetAllCustomers() {
  const { actor, isFetching } = useActor();
  return useQuery<CustomerRecord[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllCustomers();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useUpsertCustomer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: CustomerRecord) => {
      if (!actor) throw new Error('Actor not available');
      return actor.upsertCustomerRecord(record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeleteCustomer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (phone: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteCustomerRecord(phone);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useGetAllTransactions() {
  const { actor, isFetching } = useActor();
  return useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllTransactions();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useAddTransaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transaction: Transaction) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addTransaction(transaction);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
    },
  });
}

export function useDeleteTransaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteTransaction(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useGetProfitLossReport() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ['profitLossReport'],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getProfitLossReport(BigInt(0), BigInt(Date.now()));
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useGetAllServiceRecords() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ['serviceRecords'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllServiceRecords();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useAddServiceRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: any) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addServiceRecord(record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceRecords'] });
    },
  });
}

export function useUpdateServiceStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      repairAction,
    }: {
      id: bigint;
      status: any;
      repairAction: string | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateServiceStatus(id, status, repairAction);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceRecords'] });
    },
  });
}

export function useDeleteServiceRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteServiceRecord(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceRecords'] });
    },
  });
}

export function useUpsertCustomerRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: CustomerRecord) => {
      if (!actor) throw new Error('Actor not available');
      return actor.upsertCustomerRecord(record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeleteCustomerRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (phone: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteCustomerRecord(phone);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
