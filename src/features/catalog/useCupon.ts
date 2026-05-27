import { useQuery } from '@tanstack/react-query';
import { catalogKeys } from './catalogKeys';
import { fetchCupon } from './catalogService';

export function useCupon(code: string | null) {
  return useQuery({
    queryKey: catalogKeys.cupon(code ?? ''),
    queryFn: () => fetchCupon(code ?? ''),
    enabled: Boolean(code && code.trim().length > 0),
    staleTime: 60 * 1000,
    placeholderData: null,
  });
}
