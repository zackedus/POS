import * as SecureStore from 'expo-secure-store';

const SHIFT_ID_KEY = 'barokah_mobile_shift_id';
const SHIFT_OPENING_KEY = 'barokah_mobile_shift_opening';
const SHIFT_OPENED_AT_KEY = 'barokah_mobile_shift_opened_at';

export interface MobileShiftState {
  shiftId: string;
  openingCash: number;
  openedAt: string;
}

export const mobileShiftStore = {
  async get(): Promise<MobileShiftState | null> {
    try {
      const shiftId = await SecureStore.getItemAsync(SHIFT_ID_KEY);
      const openingRaw = await SecureStore.getItemAsync(SHIFT_OPENING_KEY);
      const openedAt = await SecureStore.getItemAsync(SHIFT_OPENED_AT_KEY);
      if (!shiftId || !openingRaw || !openedAt) {
        return null;
      }
      return {
        shiftId,
        openingCash: Number(openingRaw),
        openedAt,
      };
    } catch {
      return null;
    }
  },
  async set(state: MobileShiftState): Promise<void> {
    await SecureStore.setItemAsync(SHIFT_ID_KEY, state.shiftId);
    await SecureStore.setItemAsync(SHIFT_OPENING_KEY, String(state.openingCash));
    await SecureStore.setItemAsync(SHIFT_OPENED_AT_KEY, state.openedAt);
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(SHIFT_ID_KEY);
    await SecureStore.deleteItemAsync(SHIFT_OPENING_KEY);
    await SecureStore.deleteItemAsync(SHIFT_OPENED_AT_KEY);
  },
};
