'use client';

import { useSyncExternalStore } from 'react';
import type { OutletsListResponse, ReportOutlet } from '@/lib/reports';
import { outletSelectionStorage, resolveSelectedOutletId } from '@/lib/outlet-selection';

export interface OutletOption {
  id: string;
  label: string;
}

interface OutletSelectionState {
  outlets: OutletOption[];
  selectedOutletId: string | null;
  needsOutletPick: boolean;
}

let state: OutletSelectionState = {
  outlets: [],
  selectedOutletId: null,
  needsOutletPick: false,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function outletLabel(outlet: ReportOutlet): string {
  return outlet.code ? `${outlet.name} (${outlet.code})` : outlet.name;
}

function buildState(
  outlets: ReportOutlet[],
  requiresOutletSelection: boolean,
  defaultOutletId: string | null,
  selectedOutletId: string | null,
): OutletSelectionState {
  const resolved =
    selectedOutletId ??
    defaultOutletId ??
    (outlets.length === 1 ? (outlets[0]?.id ?? null) : null);

  return {
    outlets: outlets.map((o) => ({ id: o.id, label: outletLabel(o) })),
    selectedOutletId: resolved,
    needsOutletPick: requiresOutletSelection && resolved === null,
  };
}

/** Initialize from `GET /reports/outlets` (preferred) or JWT outletIds fallback. */
export function initOutletSelection(
  data: OutletsListResponse | { outletIds: string[] },
): void {
  const stored = outletSelectionStorage.get();

  if ('outlets' in data) {
    const selected = resolveSelectedOutletId(
      data.outlets.map((o) => o.id),
      stored ?? data.defaultOutletId,
    );
    state = buildState(data.outlets, data.requiresOutletSelection, data.defaultOutletId, selected);
    if (selected) {
      outletSelectionStorage.set(selected);
    }
    emit();
    return;
  }

  const outlets = data.outletIds.map((id, index) => ({
    id,
    name: `Cabang ${index + 1}`,
    code: '',
  }));
  const selected = resolveSelectedOutletId(data.outletIds, stored);
  state = buildState(outlets, data.outletIds.length > 1, null, selected);
  if (selected) {
    outletSelectionStorage.set(selected);
  }
  emit();
}

export function setSelectedOutletId(outletId: string): void {
  if (!state.outlets.some((o) => o.id === outletId)) return;
  outletSelectionStorage.set(outletId);
  state = { ...state, selectedOutletId: outletId, needsOutletPick: false };
  emit();
}

function getSnapshot(): OutletSelectionState {
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOutletSelection(): OutletSelectionState & {
  setSelectedOutletId: (outletId: string) => void;
} {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    ...snapshot,
    setSelectedOutletId,
  };
}
