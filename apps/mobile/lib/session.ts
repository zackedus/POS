import type { MobileAuthUser } from './api';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let user: MobileAuthUser | null = null;

export const mobileSession = {
  getAccessToken: () => accessToken,
  getUser: () => user,
  isLoggedIn: () => Boolean(accessToken && user),
  setSession: (next: { accessToken: string; refreshToken: string; user: MobileAuthUser }) => {
    accessToken = next.accessToken;
    refreshToken = next.refreshToken;
    user = next.user;
  },
  clear: () => {
    accessToken = null;
    refreshToken = null;
    user = null;
  },
  getRefreshToken: () => refreshToken,
};
