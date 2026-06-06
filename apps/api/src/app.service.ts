import { Injectable } from '@nestjs/common';
import { APP_NAME, APP_VERSION } from '@barokah/shared';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: `${APP_NAME} API`,
      version: APP_VERSION,
      docs: '/api/v1',
    };
  }
}
