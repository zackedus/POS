import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OnlineOrderRealtimePayload {
  orderId: string;
  orderNo: string;
  outletId: string;
  tenantId: string;
  status?: string;
}

export interface StockChangeRealtimePayload {
  tenantId: string;
  outletId: string;
  productId: string;
  quantity: number;
  type: string;
}

export type RealtimeEmitter = {
  to: (room: string) => { emit: (event: string, payload: unknown) => void };
};

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private emitter: RealtimeEmitter | null = null;

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return this.config.get<string>('SOCKET_ENABLED') !== 'false';
  }

  registerEmitter(emitter: RealtimeEmitter): void {
    this.emitter = emitter;
  }

  outletRoom(tenantId: string, outletId: string): string {
    return `tenant:${tenantId}:outlet:${outletId}`;
  }

  emitOnlineOrderPaid(payload: OnlineOrderRealtimePayload): void {
    this.emit('online-order:paid', payload);
  }

  emitOnlineOrderUpdated(payload: OnlineOrderRealtimePayload): void {
    this.emit('online-order:updated', payload);
  }

  emitStockChanged(payload: StockChangeRealtimePayload): void {
    this.emitStock('stock:changed', payload);
  }

  private emitStock(event: string, payload: StockChangeRealtimePayload): void {
    if (!this.isEnabled()) {
      return;
    }
    if (!this.emitter) {
      this.logger.debug(`Realtime emitter not ready — skipped ${event}`);
      return;
    }
    const room = this.outletRoom(payload.tenantId, payload.outletId);
    this.emitter.to(room).emit(event, {
      productId: payload.productId,
      outletId: payload.outletId,
      quantity: payload.quantity,
      type: payload.type,
    });
  }

  private emit(event: string, payload: OnlineOrderRealtimePayload): void {
    if (!this.isEnabled()) {
      return;
    }
    if (!this.emitter) {
      this.logger.debug(`Realtime emitter not ready — skipped ${event}`);
      return;
    }
    const room = this.outletRoom(payload.tenantId, payload.outletId);
    this.emitter.to(room).emit(event, {
      orderId: payload.orderId,
      orderNo: payload.orderNo,
      outletId: payload.outletId,
      status: payload.status,
    });
  }
}
