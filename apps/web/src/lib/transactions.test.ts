import { describe, expect, it } from 'vitest';
import { getVoidErrorMessage } from './transactions';

describe('getVoidErrorMessage', () => {
  it('maps invalid credentials to Indonesian manager message', () => {
    expect(getVoidErrorMessage('INVALID_CREDENTIALS')).toMatch(/manager/i);
  });

  it('maps transaction already closed', () => {
    expect(getVoidErrorMessage('TRANSACTION_ALREADY_CLOSED')).toMatch(/void/i);
  });

  it('falls back to custom message', () => {
    expect(getVoidErrorMessage(undefined, 'Kustom')).toBe('Kustom');
  });
});
