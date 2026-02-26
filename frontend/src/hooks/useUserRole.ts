import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import { UserRole } from '../backend';

export function useUserRole() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserRole>({
    queryKey: ['currentUserRole'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  const role = query.data;

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
    role,
    isAdmin: role === UserRole.admin,
    isUser: role === UserRole.user,
    isKasir: role === UserRole.guest, // guest maps to kasir in UI
    canEditInventory: role === UserRole.admin || role === UserRole.user,
    canDeleteInventory: role === UserRole.admin,
  };
}
