import { useQuery } from '@tanstack/react-query';
import { getRuntimeCapabilities } from '@/services/runtime';

export function useRuntimeCapabilities() {
  return useQuery({
    queryKey: ['runtime', 'capabilities'],
    queryFn: getRuntimeCapabilities,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}
