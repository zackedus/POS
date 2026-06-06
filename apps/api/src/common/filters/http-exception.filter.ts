import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorCodes, type ApiErrorResponse, type ValidationErrorDetail } from '@barokah/shared';

interface ExceptionPayload {
  code?: string;
  message?: string | string[];
  details?: ValidationErrorDetail[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const payload = this.normalizePayload(raw, status);

      const body: ApiErrorResponse = {
        success: false,
        error: payload,
      };

      response.status(status).json(body);
      return;
    }

    this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : exception);

    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Terjadi kesalahan pada server.',
      },
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }

  private normalizePayload(raw: string | object, status: number): ApiErrorResponse['error'] {
    if (typeof raw === 'string') {
      return {
        code: this.defaultCodeForStatus(status),
        message: raw,
      };
    }

    const payload = raw as ExceptionPayload;
    let message = 'Terjadi kesalahan.';
    let details = payload.details;

    if (typeof payload.message === 'string') {
      message = payload.message;
    } else if (Array.isArray(payload.message)) {
      message = 'Data yang dikirim tidak valid.';
      details =
        details ??
        payload.message.map((msg) => ({
          field: 'unknown',
          message: msg,
        }));
    }

    return {
      code: payload.code ?? this.defaultCodeForStatus(status),
      message,
      ...(details?.length ? { details } : {}),
    };
  }

  private defaultCodeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCodes.INVALID_INPUT;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCodes.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCodes.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCodes.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCodes.CONFLICT;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCodes.VALIDATION_FAILED;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCodes.RATE_LIMIT_EXCEEDED;
      default:
        return ErrorCodes.INTERNAL_ERROR;
    }
  }
}
