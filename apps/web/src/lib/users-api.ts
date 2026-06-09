import type { ValidationErrorDetail } from '@barokah/shared';
import { RBAC_ROLE_LABELS, type PaginationMeta } from '@barokah/shared';
import { ApiRequestError } from './api';
import { apiConfig } from './api';
import { authFetch } from './auth';
import { buildPaginationQuery, type PaginatedResult } from './pagination';

const BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/users`;

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    message?: string;
    code?: string;
    details?: ValidationErrorDetail[];
  };
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
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  outlets: UserOutletSummary[];
}

export class UserApiError extends ApiRequestError {
  readonly details?: ValidationErrorDetail[];

  constructor(message: string, code?: string, status?: number, details?: ValidationErrorDetail[]) {
    super(message, code, status);
    this.name = 'UserApiError';
    this.details = details;
  }
}

export const USER_ROLE_LABELS: Record<string, string> = RBAC_ROLE_LABELS;

async function parseEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
  return (await res.json()) as ApiEnvelope<T>;
}

function throwUserApiError(res: Response, json: ApiEnvelope<unknown>, fallback: string): never {
  const message = json.error?.message ?? fallback;
  throw new UserApiError(message, json.error?.code, res.status, json.error?.details);
}

export async function fetchUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}): Promise<PaginatedResult<UserSummary>> {
  const qs = buildPaginationQuery({
    page: params?.page,
    limit: params?.limit,
    extra: {
      search: params?.search?.trim(),
      role: params?.role,
      isActive: params?.isActive,
    },
  });
  const res = await authFetch(`${BASE}${qs}`);
  const json = await parseEnvelope<{ items: UserSummary[]; meta: PaginationMeta }>(res);

  if (!res.ok || !json.success || !json.data) {
    throwUserApiError(res, json, 'Gagal memuat daftar pengguna.');
  }

  return json.data!;
}

export async function createUser(body: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: string;
  outletIds: string[];
  isActive?: boolean;
}): Promise<UserSummary> {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...body,
      phone: body.phone?.trim() || undefined,
    }),
  });
  const json = await parseEnvelope<UserSummary>(res);

  if (!res.ok || !json.success || !json.data) {
    throwUserApiError(res, json, 'Gagal membuat pengguna.');
  }

  return json.data!;
}

export async function updateUser(
  userId: string,
  body: Partial<{
    fullName: string;
    phone: string | null;
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
    throwUserApiError(res, json, 'Gagal memperbarui pengguna.');
  }

  return json.data!;
}

export async function deactivateUser(userId: string): Promise<void> {
  const res = await authFetch(`${BASE}/${userId}`, { method: 'DELETE' });
  const json = await parseEnvelope(res);

  if (!res.ok || !json.success) {
    throwUserApiError(res, json, 'Gagal menonaktifkan pengguna.');
  }
}
