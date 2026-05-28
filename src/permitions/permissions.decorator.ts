import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export const Permissions = (...permissions: string[]) => {
  console.log('DECORATOR EXECUTOU');
  console.log('Permissões recebidas:', permissions);

  return SetMetadata(PERMISSIONS_KEY, permissions);
};