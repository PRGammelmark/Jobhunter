import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Settings } from '@career-intelligence/shared';
import { api } from '../services/api';
import { keys } from './keys';

export function useSettings() {
  return useQuery({
    queryKey: keys.settings,
    queryFn: () => api.getSettings(),
  });
}

export function useEmailStatus() {
  return useQuery({
    queryKey: keys.emailStatus,
    queryFn: () => api.getEmailStatus(),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Settings>) => api.updateSettings(data),
    onSuccess: (settings) => {
      queryClient.setQueryData(keys.settings, settings);
    },
  });
}

export function useDisconnectEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.disconnectEmail(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.emailStatus });
      void queryClient.invalidateQueries({ queryKey: keys.settings });
    },
  });
}
