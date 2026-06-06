'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchTenantSettings,
  updateTenantSettings,
  type TenantSettingsView,
} from '@/lib/settings-api';

export const TENANT_SETTINGS_QUERY_KEY = ['tenant-settings'] as const;

export function useTenantSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: TENANT_SETTINGS_QUERY_KEY,
    queryFn: fetchTenantSettings,
    enabled,
  });
}

export function useUpdateTenantSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTenantSettings,
    onSuccess: (data: TenantSettingsView) => {
      queryClient.setQueryData(TENANT_SETTINGS_QUERY_KEY, data);
    },
  });
}
