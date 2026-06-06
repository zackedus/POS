import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearChunkReloadGuard,
  isChunkLoadError,
  tryRecoverFromChunkError,
} from './chunk-load-recovery';

describe('chunk-load-recovery', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('detects ChunkLoadError by name and message', () => {
    expect(isChunkLoadError(new Error('Loading chunk app/login/page failed'))).toBe(true);
    const err = new Error('missing');
    err.name = 'ChunkLoadError';
    expect(isChunkLoadError(err)).toBe(true);
    expect(isChunkLoadError(new Error('network timeout'))).toBe(false);
  });

  it('reloads once per scope', () => {
    const reload = vi.fn();
    const store: Record<string, string> = {};
    vi.stubGlobal('location', { reload });
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((key) => delete store[key]);
      },
    });

    expect(tryRecoverFromChunkError('login')).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
    expect(tryRecoverFromChunkError('login')).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('clears reload guard', () => {
    sessionStorage.setItem('barokah_chunk_reload_login', '1');
    clearChunkReloadGuard('login');
    expect(sessionStorage.getItem('barokah_chunk_reload_login')).toBeNull();
  });
});
