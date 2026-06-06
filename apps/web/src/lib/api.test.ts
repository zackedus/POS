import { describe, expect, it } from 'vitest';
import { ErrorCodes } from '@barokah/shared';
import {
  ApiRequestError,
  NETWORK_ERROR_MESSAGE,
  OFFLINE_ERROR_MESSAGE,
  RATE_LIMIT_ERROR_MESSAGE,
  isNetworkError,
  mapHttpStatusToUserMessage,
  toUserFacingError,
} from './api';

describe('api error helpers', () => {
  it('detects fetch network errors', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new Error('NetworkError when attempting to fetch resource.'))).toBe(true);
    expect(isNetworkError(new Error('Stok tidak mencukupi.'))).toBe(false);
  });

  it('maps network errors to Bahasa Indonesia server message', () => {
    expect(toUserFacingError(new TypeError('Failed to fetch'), 'Gagal.')).toBe(NETWORK_ERROR_MESSAGE);
    expect(toUserFacingError(new Error('Failed to fetch'), 'Gagal.')).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('preserves API error messages from envelope', () => {
    expect(toUserFacingError(new Error('Email atau password salah.'), 'Gagal.')).toBe(
      'Email atau password salah.',
    );
  });

  it('uses fallback for unknown errors', () => {
    expect(toUserFacingError('unknown', 'Terjadi kesalahan.')).toBe('Terjadi kesalahan.');
  });

  it('maps offline state to offline message when navigator is offline', () => {
    const original = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    expect(toUserFacingError(new Error('anything'), 'Gagal.')).toBe(OFFLINE_ERROR_MESSAGE);
    Object.defineProperty(navigator, 'onLine', { value: original, configurable: true });
  });

  it('maps HTTP 429 to Bahasa Indonesia rate limit message', () => {
    const mapped = mapHttpStatusToUserMessage(429);
    expect(mapped.message).toBe(RATE_LIMIT_ERROR_MESSAGE);
    expect(mapped.code).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED);

    const err = new ApiRequestError(RATE_LIMIT_ERROR_MESSAGE, ErrorCodes.RATE_LIMIT_EXCEEDED, 429);
    expect(toUserFacingError(err, 'Gagal.')).toBe(RATE_LIMIT_ERROR_MESSAGE);
  });
});
