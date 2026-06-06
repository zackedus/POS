import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ConnectionOptions } from 'bullmq';

type RedisConnectionConfig = {
  host: string;
  port: number;
  password?: string;
  username?: string;
  maxRetriesPerRequest: null;
};

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private pingClient: { ping: () => Promise<string>; quit: () => Promise<string> } | null = null;
  private cachedConfig: RedisConnectionConfig | null | undefined;

  constructor(private readonly config: ConfigService) {}

  getConnectionOptions(): ConnectionOptions | null {
    const parsed = this.resolveConfig();
    return parsed as ConnectionOptions | null;
  }

  async ping(): Promise<'up' | 'down' | 'disabled'> {
    const disabled = this.config.get<boolean>('redis.disabled', { infer: true });
    if (disabled) {
      return 'disabled';
    }

    const options = this.resolveConfig();
    if (!options) {
      return 'disabled';
    }

    try {
      const client = await this.getPingClient(options);
      const result = await client.ping();
      return result === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }

  async onModuleDestroy() {
    if (this.pingClient) {
      await this.pingClient.quit().catch(() => undefined);
      this.pingClient = null;
    }
  }

  private resolveConfig(): RedisConnectionConfig | null {
    if (this.cachedConfig !== undefined) {
      return this.cachedConfig;
    }

    const disabled = this.config.get<boolean>('redis.disabled', { infer: true });
    if (disabled) {
      this.cachedConfig = null;
      return null;
    }

    const url = this.config.get<string>('redis.url', { infer: true });
    if (!url) {
      this.logger.warn('REDIS_URL tidak diset — BullMQ sync memakai inline fallback.');
      this.cachedConfig = null;
      return null;
    }

    this.cachedConfig = this.parseRedisUrl(url);
    return this.cachedConfig;
  }

  private async getPingClient(options: RedisConnectionConfig) {
    if (!this.pingClient) {
      const { default: Redis } = await import('ioredis');
      this.pingClient = new Redis(options);
    }
    return this.pingClient;
  }

  private parseRedisUrl(url: string): RedisConnectionConfig {
    const parsed = new URL(url);
    const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;
    const username = parsed.username ? decodeURIComponent(parsed.username) : undefined;

    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      ...(username ? { username } : {}),
      ...(password ? { password } : {}),
      maxRetriesPerRequest: null,
    };
  }
}
