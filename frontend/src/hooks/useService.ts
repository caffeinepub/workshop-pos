// React Query hook for service record management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { ServiceRecord, Status } from '../backend';

export function useGetServiceQueue() {
  const { actor, isFetching } = useActor();
  return useQuery<ServiceRecord[]>({
    queryKey: ['serviceQueue'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getServiceQueue();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllServiceRecords() {
  const { actor, isFetching } = useActor();
  return useQuery<ServiceRecord[]>({
    queryKey: ['serviceRecords'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllServiceRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddServiceRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: ServiceRecord) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addServiceRecord(record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceQueue'] });
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
      status: Status;
      repairAction: string | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateServiceStatus(id, status, repairAction);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceQueue'] });
      queryClient.invalidateQueries({ queryKey: ['serviceRecords'] });
    },
  });
}
