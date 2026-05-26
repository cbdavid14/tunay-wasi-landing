import { useQuery } from '@tanstack/react-query';
import { catalogKeys } from './catalogKeys';
import { fetchCheckoutConfig } from './catalogService';

export function useCheckoutConfig() {
  return useQuery({
    queryKey: catalogKeys.checkoutConfig(),
    queryFn: fetchCheckoutConfig,
    staleTime: 60 * 1000,
    placeholderData: { version: 'v2' as const },
  });
}
