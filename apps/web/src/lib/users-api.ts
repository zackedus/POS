import { apiConfig } from './api';
import { authFetch } from './auth';

const BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/users`;

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

export interface UserOutletSummary {
  id: string;
  name: string;
  code: string;
}

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  outlets: UserOutletSummary[];
}

export const USER_ROLE_LABELS: Record<string, string> = {
  OWNER: 'Pemilik',
  MANAGER: 'Manajer',
  CASHIER: 'Kasir',
  INVENTORY: 'Gudang',
  ACCOUNTANT: 'Akuntan',
};

async function parseEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
  return (await res.json()) as ApiEnvelope<T>;
}

export async function fetchUsers(): Promise<UserSummary[]> {
  const res = await authFetch(BASE);
  const json = await parseEnvelope<UserSummary[]>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat daftar pengguna.');
  }

  return json.data;
}

export async function createUser(body: {
  email: string;
  password: string;
  fullName: string;
  role: string;
  outletIds: string[];
}): Promise<UserSummary> {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseEnvelope<UserSummary>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal membuat pengguna.');
  }

  return json.data;
}

export async function updateUser(
  userId: string,
  body: Partial<{
    fullName: string;
    role: string;
    isActive: boolean;
    password: string;
    outletIds: string[];
  }>,
): Promise<UserSummary> {
  const res = await authFetch(`${BASE}/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseEnvelope<UserSummary>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memperbarui pengguna.');
  }

  return json.data;
}

export async function deactivateUser(userId: string): Promise<void> {
  const res = await authFetch(`${BASE}/${userId}`, { method: 'DELETE' });
  const json = await parseEnvelope(res);

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? 'Gagal menonaktifkan pengguna.');
  }
}
