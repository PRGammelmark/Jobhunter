import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { keys } from './keys';

export function useDashboard() {
  return useQuery({
    queryKey: keys.dashboard,
    queryFn: () => api.getDashboard(),
  });
}

export function useStatistics() {
  return useQuery({
    queryKey: keys.statistics,
    queryFn: () => api.getStatistics(),
  });
}
