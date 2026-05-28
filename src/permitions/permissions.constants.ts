export const PERMISSIONS = {
  PLAN: {
    CREATE: 'plans.create',
    READ: 'plans.read',
    UPDATE: 'plans.update',
    DELETE: 'plans.delete',
  },

  USER: {
    CREATE: 'cadastro.usuario',
    READ: 'users.read',
    UPDATE: 'usuarios.update',
    DELETE: 'users.delete',
  },
} as const;