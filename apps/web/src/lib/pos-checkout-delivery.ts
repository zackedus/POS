import { formatPhoneDisplay, isValidIndonesianMobilePhone, normalizePhone } from '@barokah/shared';
import type { DeliverySelection } from '@/components/pos/PosDeliverySelector';
import { isDeliverySelectionValid } from '@/components/pos/PosDeliverySelector';
import type { CreateDeliveryPayload } from '@/lib/deliveries-api';

export function isWalkInDeliveryEligible(customerName: string, customerPhone: string): boolean {
  return customerName.trim().length >= 2 && isValidIndonesianMobilePhone(customerPhone.trim());
}

export function toCheckoutCustomerPhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!isValidIndonesianMobilePhone(trimmed)) {
    return null;
  }
  return formatPhoneDisplay(normalizePhone(trimmed));
}

export function buildCheckoutDeliveryPayload(params: {
  deliveryEnabled: boolean;
  deliverySelection: DeliverySelection | null;
  deliveryNotes?: string;
}): Record<string, unknown> {
  const { deliveryEnabled, deliverySelection, deliveryNotes } = params;
  if (!deliveryEnabled || !deliverySelection || !isDeliverySelectionValid(deliverySelection)) {
    return {};
  }

  const payload: Record<string, unknown> = { deliveryRequired: true };
  if (deliveryNotes?.trim()) {
    payload.deliveryNotes = deliveryNotes.trim();
  }

  if (deliverySelection.mode === 'saved') {
    payload.deliveryAddressId = deliverySelection.addressId;
  } else {
    const { snapshot } = deliverySelection;
    payload.deliveryAddressSnapshot = {
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

export function buildDeliveryOrderPayload(params: {
  transactionId: string;
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string;
  outletId?: string | null;
  selection: DeliverySelection;
  notes?: string;
}): CreateDeliveryPayload {
  const { transactionId, customerId, customerName, customerPhone, outletId, selection, notes } = params;
  const payload: CreateDeliveryPayload = {
    transactionId,
    ...(customerId ? { customerId } : {}),
    ...(!customerId && customerName?.trim() && toCheckoutCustomerPhone(customerPhone ?? '')
      ? {
          customerName: customerName.trim(),
          customerPhone: toCheckoutCustomerPhone(customerPhone ?? '')!,
        }
      : {}),
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
