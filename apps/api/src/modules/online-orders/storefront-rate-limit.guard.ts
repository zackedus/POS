import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { ErrorCodes } from '@barokah/shared';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

interface Bucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class StorefrontRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const tenantSlug = String(request.params.tenantSlug ?? 'unknown');
    const ip = this.resolveClientIp(request);
    const key = `${ip}:${tenantSlug}`;
    const now = Date.now();

    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }

    bucket.count += 1;
    if (bucket.count > MAX_REQUESTS) {
      throw new HttpException(
        {
          code: ErrorCodes.RATE_LIMIT_EXCEEDED,
          message: 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private resolveClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0]?.trim() ?? 'unknown';
    }
    return request.ip ?? 'unknown';
  }
}
