import { describe, expect, it } from 'vitest';
import { outletDisplayLabel, resolveSelectedOutletId } from './outlet-selection';

describe('resolveSelectedOutletId', () => {
  it('returns sole outlet when user has one', () => {
    expect(resolveSelectedOutletId(['out-a'], null)).toBe('out-a');
    expect(resolveSelectedOutletId(['out-a'], 'out-b')).toBe('out-a');
  });

  it('returns stored id when valid for multi-outlet', () => {
    expect(resolveSelectedOutletId(['out-a', 'out-b'], 'out-b')).toBe('out-b');
  });

  it('returns null when multi-outlet and no valid stored id', () => {
    expect(resolveSelectedOutletId(['out-a', 'out-b'], null)).toBeNull();
    expect(resolveSelectedOutletId(['out-a', 'out-b'], 'out-x')).toBeNull();
  });
});

describe('outletDisplayLabel', () => {
  it('includes branch index and id suffix', () => {
    expect(outletDisplayLabel('abcdef123456', 0)).toMatch(/Cabang 1/);
    expect(outletDisplayLabel('abcdef123456', 1)).toMatch(/Cabang 2/);
  });
});
