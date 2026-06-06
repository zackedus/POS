import { Body, Controller, Post } from '@nestjs/common';
import type { MidtransNotification } from './midtrans.service';
import { OnlineOrdersService } from './online-orders.service';

@Controller('webhooks/midtrans')
export class MidtransWebhookController {
  constructor(private readonly onlineOrdersService: OnlineOrdersService) {}

  @Post('online')
  handleOnline(@Body() notification: MidtransNotification) {
    return this.onlineOrdersService.handleMidtransWebhook(notification);
  }
}
