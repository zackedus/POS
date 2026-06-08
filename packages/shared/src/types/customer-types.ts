/** Customer/member CRM shared types — Barokah Core POS */

export type LoyaltyPointLedgerType = 'EARN' | 'REDEEM' | 'ADJUST';

export interface CustomerAddressView {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  province: string | null;
  postalCode: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyPointLedgerEntry {
  id: string;
  type: LoyaltyPointLedgerType;
  points: number;
  balanceAfter: number;
  transactionId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface MemberCardView {
  memberCode: string;
  memberName: string;
  tenantName: string;
  tenantLogoUrl: string | null;
  points: number;
  tier: string;
  memberSince: string;
  qrPayload: string;
}

export interface CustomerProfileView {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  memberCode: string;
  memberSince: string;
  notes: string | null;
  points: number;
  creditLimit: number | null;
  receivableOutstanding?: number;
  depositBalance?: number;
  creditAvailable?: number | null;
  updatedAt: string;
}

export const MEMBER_TIER_STUB = 'Standard';

export const CUSTOMER_ADDRESS_LABELS = ['Rumah', 'Kantor', 'Proyek', 'Lainnya'] as const;
