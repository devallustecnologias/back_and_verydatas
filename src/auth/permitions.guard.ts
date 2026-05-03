import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
    if (!requiredPermissions) {
      return true; 
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.profile || !user.profile.permissions) {
      throw new ForbiddenException('Usuário sem perfil ou permissões');
    }

    const hasPermission = requiredPermissions.some(permission => user.profile.permissions.includes(permission));
    console.log(user.profile.permissions)
    if (!hasPermission) {
      throw new ForbiddenException('Acesso negado: Permissão insuficiente');
    }

    return true;
  }
}
