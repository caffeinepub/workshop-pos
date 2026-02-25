// React Query hook for profit/loss report generation
import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';

export function useGetProfitLossReport(startDate: bigint, endDate: bigint, enabled: boolean) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ['reports', 'profitLoss', startDate.toString(), endDate.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getProfitLossReport(startDate, endDate);
    },
    enabled: !!actor && !isFetching && enabled,
  });
}
