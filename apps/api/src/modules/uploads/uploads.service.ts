import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ErrorCodes } from '@barokah/shared';
import type { AuthJwtPayload } from '../auth/auth.types';
import type { UploadedImageFile } from './upload.types';

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const MAX_BYTES = 2 * 1024 * 1024;

@Injectable()
export class UploadsService {
  private readonly uploadsRoot = join(process.cwd(), 'uploads');

  async saveProductImage(
    user: AuthJwtPayload,
    file: UploadedImageFile | undefined,
  ): Promise<{ url: string; filename: string }> {
    if (!file) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'File gambar wajib diunggah.',
      });
    }

    if (file.size > MAX_BYTES) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Ukuran gambar maksimal 2 MB.',
      });
    }

    const extension = ALLOWED_MIME[file.mimetype];
    if (!extension) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Format gambar harus JPEG, PNG, WebP, atau GIF.',
      });
    }

    const tenantDir = join(this.uploadsRoot, user.tenantId);
    await mkdir(tenantDir, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    const absolutePath = join(tenantDir, filename);
    await writeFile(absolutePath, file.buffer);

    const url = `/api/v1/static/uploads/${user.tenantId}/${filename}`;

    return { url, filename };
  }
}
