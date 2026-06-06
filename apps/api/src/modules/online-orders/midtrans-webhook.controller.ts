import { Body, Controller, Get, Post } from '@nestjs/common';
import type { MidtransNotification } from './midtrans.service';
import { MidtransService } from './midtrans.service';
import { OnlineOrdersService } from './online-orders.service';

@Controller('webhooks/midtrans')
export class MidtransWebhookController {
  constructor(
    private readonly onlineOrdersService: OnlineOrdersService,
    private readonly midtransService: MidtransService,
  ) {}

  @Get('online/health')
  webhookHealth() {
    return {
      status: 'ok',
      ...this.midtransService.getWebhookHealth(),
    };
  }

  @Post('online')
  handleOnline(@Body() notification: MidtransNotification) {
    return this.onlineOrdersService.handleMidtransWebhook(notification);
  }
}
