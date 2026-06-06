import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@barokah/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthJwtPayload } from '../auth/auth.types';
import type { UploadedImageFile } from './upload.types';
import { UploadsService } from './uploads.service';

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('product-image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    }),
  )
  uploadProductImage(
    @CurrentUser() user: AuthJwtPayload,
    @UploadedFile() file: UploadedImageFile | undefined,
  ) {
    return this.uploadsService.saveProductImage(user, file);
  }
}
