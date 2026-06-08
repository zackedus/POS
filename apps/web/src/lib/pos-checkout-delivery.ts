import type { DeliverySelection } from '@/components/pos/PosDeliverySelector';
import type { CreateDeliveryPayload } from '@/lib/deliveries-api';

export function buildDeliveryOrderPayload(params: {
  transactionId: string;
  customerId: string;
  outletId?: string | null;
  selection: DeliverySelection;
  notes?: string;
}): CreateDeliveryPayload {
  const { transactionId, customerId, outletId, selection, notes } = params;
  const payload: CreateDeliveryPayload = {
    transactionId,
    customerId,
    deliveryType: 'STORE_DIRECT',
    ...(outletId ? { outletId } : {}),
    ...(notes?.trim() ? { notes: notes.trim() } : {}),
  };

  if (selection.mode === 'saved') {
    payload.addressId = selection.addressId;
  } else {
    const { snapshot } = selection;
    payload.addressSnapshot = {
      label: snapshot.label,
      addressLine1: snapshot.addressLine1.trim(),
      city: snapshot.city.trim(),
      ...(snapshot.addressLine2?.trim() ? { addressLine2: snapshot.addressLine2.trim() } : {}),
      ...(snapshot.province?.trim() ? { province: snapshot.province.trim() } : {}),
      ...(snapshot.postalCode?.trim() ? { postalCode: snapshot.postalCode.trim() } : {}),
    };
  }

  return payload;
}
