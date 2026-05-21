import { useQuery } from '@tanstack/react-query';
import { catalogKeys } from './catalogKeys';
import { fetchLandingConfig } from './catalogService';

export function useLandingConfig() {
  return useQuery({
    queryKey: catalogKeys.landingConfig(),
    queryFn: fetchLandingConfig,
    staleTime: 10 * 60 * 1000,
  });
}
