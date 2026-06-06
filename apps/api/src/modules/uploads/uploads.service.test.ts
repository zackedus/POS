import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import type { AuthJwtPayload } from '../auth/auth.types';
import { UploadsService } from './uploads.service';

function createUser(): AuthJwtPayload {
  return {
    sub: 'owner-1',
    email: 'owner@barokah.test',
    tenantId: 'tenant-1',
    role: 'OWNER',
    outletIds: ['outlet-1'],
  };
}

test('Uploads: rejects missing file', async () => {
  const service = new UploadsService();
  await assert.rejects(
    () => service.saveProductImage(createUser(), undefined),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      return true;
    },
  );
});

test('Uploads: rejects unsupported mime type', async () => {
  const service = new UploadsService();
  await assert.rejects(
    () =>
      service.saveProductImage(createUser(), {
        fieldname: 'file',
        originalname: 'doc.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 100,
        buffer: Buffer.from('test'),
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      return true;
    },
  );
});
