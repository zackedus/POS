import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Server, Socket } from 'socket.io';
import type { AuthJwtPayload } from '../auth/auth.types';
import { RealtimeService } from './realtime.service';

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly realtime: RealtimeService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit(): void {
    if (!this.realtime.isEnabled()) {
      this.logger.log('Socket.io gateway disabled (SOCKET_ENABLED=false)');
      return;
    }
    this.realtime.registerEmitter(this.server);
    this.logger.log('Socket.io gateway ready on namespace /realtime');
  }

  async handleConnection(client: Socket): Promise<void> {
    if (!this.realtime.isEnabled()) {
      client.disconnect(true);
      return;
    }

    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined);
      if (!token?.trim()) {
        client.disconnect(true);
        return;
      }

      const payload = await this.jwt.verifyAsync<AuthJwtPayload>(token, {
        secret: this.config.get<string>('jwt.secret') ?? 'dev-secret-change-me',
      });
      if (!payload?.tenantId) {
        client.disconnect(true);
        return;
      }

      const outletId =
        (client.handshake.auth?.outletId as string | undefined) ??
        (client.handshake.query?.outletId as string | undefined);

      client.data.user = payload;

      if (outletId && (payload.role === 'OWNER' || payload.outletIds.includes(outletId))) {
        const room = this.realtime.outletRoom(payload.tenantId, outletId);
        await client.join(room);
        client.data.outletId = outletId;
      } else if (payload.outletIds.length === 1) {
        const room = this.realtime.outletRoom(payload.tenantId, payload.outletIds[0] as string);
        await client.join(room);
        client.data.outletId = payload.outletIds[0];
      }

      client.emit('realtime:connected', {
        tenantId: payload.tenantId,
        outletId: client.data.outletId ?? null,
      });
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }
}
