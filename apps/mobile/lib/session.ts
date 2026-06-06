import * as SecureStore from 'expo-secure-store';
import type { MobileAuthUser } from './api';

const ACCESS_KEY = 'barokah_mobile_access';
const REFRESH_KEY = 'barokah_mobile_refresh';
const USER_KEY = 'barokah_mobile_user';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let user: MobileAuthUser | null = null;
let restored = false;

async function persistSession(): Promise<void> {
  if (accessToken && refreshToken && user) {
    await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    return;
  }
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export const mobileSession = {
  getAccessToken: () => accessToken,
  getUser: () => user,
  isLoggedIn: () => Boolean(accessToken && user),
  getRefreshToken: () => refreshToken,
  async restore(): Promise<void> {
    if (restored) {
      return;
    }
    try {
      accessToken = (await SecureStore.getItemAsync(ACCESS_KEY)) ?? null;
      refreshToken = (await SecureStore.getItemAsync(REFRESH_KEY)) ?? null;
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      user = userJson ? (JSON.parse(userJson) as MobileAuthUser) : null;
    } catch {
      accessToken = null;
      refreshToken = null;
      user = null;
    }
    restored = true;
  },
  async setSession(next: { accessToken: string; refreshToken: string; user: MobileAuthUser }) {
    accessToken = next.accessToken;
    refreshToken = next.refreshToken;
    user = next.user;
    await persistSession();
  },
  async clear() {
    accessToken = null;
    refreshToken = null;
    user = null;
    await persistSession();
  },
};
