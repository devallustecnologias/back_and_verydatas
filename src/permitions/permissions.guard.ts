import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { UserService } from 'src/user/user.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UserService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    console.log(
      'Permissões exigidas pela rota:',
      requiredPermissions,
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const userId = request.user?.userId;

    // console.log('UserId:', userId);

    const userPermissions =
      await this.usersService.getUserPermissions(userId);

    const userPermissionKeys = userPermissions.map(
      (permission) => permission.key,
    );

    console.log(
      'Keys do usuário:',
      userPermissionKeys,
    );

    const hasPermission = requiredPermissions.some(
      (permission) =>
        userPermissionKeys.includes(permission),
    );

    // console.log('Tem permissão?', hasPermission);

    if (!hasPermission) {
      throw new ForbiddenException(
        'Permissão insuficiente',
      );
    }

    return true;
  }
}