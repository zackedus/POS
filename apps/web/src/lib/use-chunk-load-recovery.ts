'use client';

import { useEffect } from 'react';
import { clearChunkReloadGuard, isChunkLoadError, tryRecoverFromChunkError } from './chunk-load-recovery';

/** Listen for chunk load failures and auto-reload once per scope. */
export function useChunkLoadRecovery(scope: string): void {
  useEffect(() => {
    clearChunkReloadGuard(scope);

    const onError = (event: ErrorEvent) => {
      if (!isChunkLoadError(event.error ?? event.message)) return;
      event.preventDefault();
      tryRecoverFromChunkError(scope);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkLoadError(event.reason)) return;
      event.preventDefault();
      tryRecoverFromChunkError(scope);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [scope]);
}
