const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

export interface MobileAuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface MobileLoginResult {
  user: MobileAuthUser;
  accessToken: string;
  refreshToken: string;
}

export async function loginMobile(email: string, password: string): Promise<MobileLoginResult> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });

  const json = (await res.json()) as ApiEnvelope<{
    user: MobileAuthUser;
    tokens: { accessToken: string; refreshToken: string };
  }>;

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Login gagal. Periksa email dan password.');
  }

  return {
    user: json.data.user,
    accessToken: json.data.tokens.accessToken,
    refreshToken: json.data.tokens.refreshToken,
  };
}

export interface MobileProductGridItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  unitSymbol?: string | null;
}

export async function fetchMobileProductGrid(
  accessToken: string,
  limit = 20,
): Promise<MobileProductGridItem[]> {
  const res = await fetch(`${API_BASE}/catalog/products/grid?limit=${limit}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as ApiEnvelope<MobileProductGridItem[] | { items: MobileProductGridItem[] }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat produk.');
  }
  if (Array.isArray(json.data)) {
    return json.data;
  }
  return json.data.items ?? [];
}

export interface MobileCheckoutResult {
  receiptNo: string;
  total: number;
  change: number;
}

export async function checkoutMobileCash(
  accessToken: string,
  input: {
    items: Array<{ productId: string; quantity: number }>;
    cashReceived: number;
  },
): Promise<MobileCheckoutResult> {
  const clientRequestId = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const res = await fetch(`${API_BASE}/transactions/checkout-cash`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...input,
      clientRequestId,
    }),
  });
  const json = (await res.json()) as ApiEnvelope<{
    receiptNo: string;
    total: number;
    change: number;
  }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Checkout tunai gagal.');
  }
  return {
    receiptNo: json.data.receiptNo,
    total: json.data.total,
    change: json.data.change,
  };
}

export { API_BASE };
