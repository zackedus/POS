import { apiConfig, toUserFacingError } from './api';
import { useHttpOnlyAuthPath } from './auth-cookies';

const AUTH_BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/auth`;
const PROXY_BASE = '/api/proxy';
const TOKEN_KEY = 'barokah_access_token';
const REFRESH_KEY = 'barokah_refresh_token';
const ROLE_KEY = 'barokah_user_role';
/** Presence cookie for Next.js middleware (localStorage tokens are client-only). */
export const AUTH_SESSION_COOKIE = 'barokah_auth_session';
/** Role cookie for middleware RBAC (synced on login/logout). */
export const AUTH_ROLE_COOKIE = 'barokah_auth_role';

function syncAuthCookies(hasSession: boolean, role?: string) {
  if (typeof document === 'undefined') return;
  if (hasSession) {
    document.cookie = `${AUTH_SESSION_COOKIE}=1; path=/; SameSite=Lax`;
    if (role) {
      document.cookie = `${AUTH_ROLE_COOKIE}=${encodeURIComponent(role)}; path=/; SameSite=Lax`;
    }
  } else {
    document.cookie = `${AUTH_SESSION_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = `${AUTH_ROLE_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
  }
}

function syncAuthSessionCookie(hasSession: boolean, role?: string) {
  syncAuthCookies(hasSession, role);
}

/** Dev MVP: localStorage (documented). Production uses httpOnly cookies via /api/proxy. */
export const tokenStorage = {
  getAccessToken: () => {
    if (useHttpOnlyAuthPath()) {
      return null;
    }
    return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  },
  getRefreshToken: () => {
    if (useHttpOnlyAuthPath()) {
      return null;
    }
    return typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
  },
  setTokens: (accessToken: string, refreshToken: string, role?: string) => {
    if (!useHttpOnlyAuthPath()) {
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_KEY, refreshToken);
      if (role) {
        localStorage.setItem(ROLE_KEY, role);
      }
    }
    syncAuthSessionCookie(true, role ?? localStorage.getItem(ROLE_KEY) ?? undefined);
  },
  clear: () => {
    if (!useHttpOnlyAuthPath()) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(ROLE_KEY);
    }
    syncAuthSessionCookie(false);
    if (typeof window !== 'undefined' && useHttpOnlyAuthPath()) {
      void fetch('/api/auth/logout', { method: 'POST' });
    }
  },
  getRole: () => (typeof window !== 'undefined' ? localStorage.getItem(ROLE_KEY) : null),
};

function resolveAuthUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!useHttpOnlyAuthPath() || typeof input !== 'string') {
    return input;
  }
  const prefix = `${apiConfig.baseUrl}/${apiConfig.prefix}/`;
  if (input.startsWith(prefix)) {
    return `${PROXY_BASE}/${input.slice(prefix.length)}`;
  }
  return input;
}

/** Keep middleware cookies aligned with localStorage session. */
export function syncAuthSessionFromStorage() {
  syncAuthSessionCookie(Boolean(tokenStorage.getAccessToken()), tokenStorage.getRole() ?? undefined);
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  tenantId: string;
  tenantName: string;
  tenantSlug?: string;
  outletIds: string[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface LoginResponseData {
  user: AuthUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

let refreshInFlight: Promise<AuthTokens | null> | null = null;

async function parseEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
  return (await res.json()) as ApiEnvelope<T>;
}

export async function refreshTokensRequest(): Promise<AuthTokens | null> {
  if (useHttpOnlyAuthPath()) {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      const json = await parseEnvelope<AuthTokens>(res);
      if (!res.ok || !json.success || !json.data) {
        tokenStorage.clear();
        return null;
      }
      return json.data;
    } catch {
      tokenStorage.clear();
      return null;
    }
  }

  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${AUTH_BASE}/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const json = await parseEnvelope<AuthTokens>(res);
        if (!res.ok || !json.success || !json.data) {
          tokenStorage.clear();
          return null;
        }
        tokenStorage.setTokens(json.data.accessToken, json.data.refreshToken);
        return json.data;
      } catch {
        tokenStorage.clear();
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

/** Authenticated fetch with one refresh retry on 401. */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const resolvedInput = resolveAuthUrl(input);
  const accessToken = tokenStorage.getAccessToken();
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const fetchInit: RequestInit = {
    ...init,
    headers,
    ...(useHttpOnlyAuthPath() ? { credentials: 'include' as RequestCredentials } : {}),
  };

  let res = await fetch(resolvedInput, fetchInit);
  if (res.status !== 401) {
    return res;
  }

  const refreshed = await refreshTokensRequest();
  if (!refreshed) {
    return res;
  }

  headers.set('Authorization', `Bearer ${refreshed.accessToken}`);
  res = await fetch(resolvedInput, fetchInit);
  return res;
}

export async function loginRequest(body: LoginRequest): Promise<LoginResponseData> {
  try {
    if (useHttpOnlyAuthPath()) {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      const json = await parseEnvelope<LoginResponseData>(res);
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? 'Login gagal. Periksa email dan password.');
      }
      return json.data;
    }

    const res = await fetch(`${AUTH_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await parseEnvelope<LoginResponseData>(res);

    if (!res.ok || !json.success || !json.data) {
      const message = json.error?.message ?? 'Login gagal. Periksa email dan password.';
      throw new Error(message);
    }

    return json.data;
  } catch (err) {
    throw new Error(toUserFacingError(err, 'Login gagal. Periksa email dan password.'));
  }
}

export async function fetchMe(): Promise<AuthUser> {
  try {
    const res = await authFetch(`${AUTH_BASE}/me`);
    const json = await parseEnvelope<AuthUser>(res);

    if (!res.ok || !json.success || !json.data) {
      throw new Error(json.error?.message ?? 'Gagal memuat profil.');
    }

    return json.data;
  } catch (err) {
    throw new Error(toUserFacingError(err, 'Gagal memuat profil.'));
  }
}

export function hasClientAuthSession(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  if (tokenStorage.getAccessToken()) {
    return true;
  }
  return document.cookie.includes(`${AUTH_SESSION_COOKIE}=1`);
}

export function readClientRoleFromCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie.match(new RegExp(`${AUTH_ROLE_COOKIE}=([^;]+)`));
  if (!match?.[1]) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function persistUserRole(role: string) {
  if (typeof window === 'undefined') return;
  if (!useHttpOnlyAuthPath()) {
    localStorage.setItem(ROLE_KEY, role);
  }
  syncAuthSessionCookie(hasClientAuthSession(), role);
}
