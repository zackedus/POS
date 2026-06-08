import { isValidIndonesianMobilePhone } from '@barokah/shared';
import type { DeliverySelection } from '@/components/pos/PosDeliverySelector';
import type { CreateDeliveryPayload } from '@/lib/deliveries-api';

export function isWalkInDeliveryEligible(customerName: string, customerPhone: string): boolean {
  return customerName.trim().length >= 2 && isValidIndonesianMobilePhone(customerPhone.trim());
}

export function buildDeliveryOrderPayload(params: {
  transactionId: string;
  customerId?: string | null;
  outletId?: string | null;
  selection: DeliverySelection;
  notes?: string;
}): CreateDeliveryPayload {
  const { transactionId, customerId, outletId, selection, notes } = params;
  const payload: CreateDeliveryPayload = {
    transactionId,
    ...(customerId ? { customerId } : {}),
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
