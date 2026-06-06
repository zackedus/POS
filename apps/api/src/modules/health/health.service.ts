import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ErrorCodes } from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async check() {
    let database: 'up' | 'down' = 'down';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }

    const redis = await this.redisService.ping();

    const status =
      database === 'up' && (redis === 'up' || redis === 'disabled') ? 'ok' : 'degraded';

    if (database === 'down') {
      throw new ServiceUnavailableException({
        code: ErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE,
        message: 'Database tidak tersedia.',
        details: [{ field: 'database', message: 'Koneksi database gagal' }],
      });
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      services: {
        api: 'up',
        database,
        redis,
      },
    };
  }
}
