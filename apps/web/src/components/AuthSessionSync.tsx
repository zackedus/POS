'use client';

import { useEffect } from 'react';
import { syncAuthSessionFromStorage } from '@/lib/auth';

/** Sync auth presence cookie from localStorage on client boot (middleware hardening). */
export function AuthSessionSync() {
  useEffect(() => {
    syncAuthSessionFromStorage();
  }, []);

  return null;
}
