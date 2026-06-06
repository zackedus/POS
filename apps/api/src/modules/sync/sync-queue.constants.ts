export const SYNC_REPLAY_QUEUE_NAME = 'barokah-sync-replay';

export const SYNC_REPLAY_JOB_NAME = 'replay-outlet';

export type SyncReplayJobPayload = {
  tenantId: string;
  outletId: string;
  sub: string;
  email: string;
  role: string;
  outletIds: string[];
  limit: number;
};
