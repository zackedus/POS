import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { API_ROUTE_PREFIX } from '@barokah/shared';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { validationExceptionFactory } from './common/pipes/validation-exception.factory';

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.close(() => resolve(true));
      });

    tester.listen(port, '127.0.0.1');
  });
}

async function resolveApiPort(basePort: number, attempts: number): Promise<number> {
  for (let offset = 0; offset < attempts; offset += 1) {
    const candidatePort = basePort + offset;
    if (await isPortAvailable(candidatePort)) {
      return candidatePort;
    }
  }

  throw new Error(
    `No available API port found between ${basePort} and ${basePort + attempts - 1}`,
  );
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: `/${API_ROUTE_PREFIX}/static/uploads/`,
  });

  app.setGlobalPrefix(API_ROUTE_PREFIX);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.enableCors();
  app.useWebSocketAdapter(new IoAdapter(app));

  const configuredPort = parseInt(process.env.API_PORT ?? '3000', 10);
  const allowPortFallback = (process.env.API_PORT_FALLBACK ?? 'true') === 'true';
  const port = allowPortFallback
    ? await resolveApiPort(configuredPort, 30)
    : configuredPort;

  if (port !== configuredPort) {
    console.warn(
      `API_PORT ${configuredPort} sedang dipakai. API otomatis pindah ke port ${port}.`,
    );
  }

  await app.listen(port);
  console.log(`Barokah POS API running on http://localhost:${port}`);
}

bootstrap();
