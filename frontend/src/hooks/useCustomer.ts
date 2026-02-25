// React Query hook for customer data management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { CustomerRecord } from '../backend';

export function useGetAllCustomers() {
  const { actor, isFetching } = useActor();
  return useQuery<CustomerRecord[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllCustomers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useFindCustomersByName(searchTerm: string) {
  const { actor, isFetching } = useActor();
  return useQuery<CustomerRecord[]>({
    queryKey: ['customers', 'search', searchTerm],
    queryFn: async () => {
      if (!actor || searchTerm.length < 3) return [];
      return actor.findCustomersByName(searchTerm);
    },
    enabled: !!actor && !isFetching && searchTerm.length >= 3,
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
