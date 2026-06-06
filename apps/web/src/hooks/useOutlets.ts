'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOutlet,
  fetchOutletDetail,
  fetchOutletsList,
  setDefaultOutlet,
  updateOutlet,
  type OutletDetail,
  type OutletRecord,
} from '@/lib/outlets-api';

export const OUTLETS_QUERY_KEY = ['outlets'] as const;

export function outletDetailQueryKey(outletId: string) {
  return ['outlet-detail', outletId] as const;
}

export function useOutletsQuery(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: [...OUTLETS_QUERY_KEY, includeInactive ? 'all' : 'active'],
    queryFn: () => fetchOutletsList(includeInactive),
    enabled,
  });
}

export function useOutletDetailQuery(outletId: string | null) {
  return useQuery({
    queryKey: outletId ? outletDetailQueryKey(outletId) : ['outlet-detail', 'none'],
    queryFn: () => fetchOutletDetail(outletId!),
    enabled: Boolean(outletId),
  });
}

export function useCreateOutletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOutlet,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OUTLETS_QUERY_KEY });
    },
  });
}

export function useUpdateOutletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      outletId,
      body,
    }: {
      outletId: string;
      body: Parameters<typeof updateOutlet>[1];
    }) => updateOutlet(outletId, body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: OUTLETS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: outletDetailQueryKey(variables.outletId) });
    },
  });
}

export function useSetDefaultOutletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setDefaultOutlet,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OUTLETS_QUERY_KEY });
    },
  });
}

export type { OutletDetail, OutletRecord };
