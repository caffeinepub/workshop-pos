import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import { UserRole } from '../backend';

export function useUserRole() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserRole>({
    queryKey: ['callerUserRole'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const role = await actor.getCallerUserRole();
      return role;
    },
    enabled: !!actor && !actorFetching,
    retry: 3,
    retryDelay: 1000,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}
