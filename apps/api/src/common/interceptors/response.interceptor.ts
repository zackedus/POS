import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiSuccessResponse } from '@barokah/shared';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile) {
          return data;
        }

        if (data !== null && typeof data === 'object' && 'success' in data) {
          return data;
        }

        const envelope: ApiSuccessResponse<unknown> = {
          success: true,
          data: data ?? null,
        };

        return envelope;
      }),
    );
  }
}
