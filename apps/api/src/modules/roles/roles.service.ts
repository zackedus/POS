import { Injectable } from '@nestjs/common';
import { getPermissionMatrixPayload, getRolesCatalog } from '@barokah/shared';

@Injectable()
export class RolesService {
  listRoles() {
    return {
      roles: getRolesCatalog(),
      matrix: getPermissionMatrixPayload(),
    };
  }
}
