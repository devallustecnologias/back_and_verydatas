import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

/** Normaliza IPv6-mapped (::ffff:x.x.x.x) para IPv4 puro */
function normalizeIp(raw: string | undefined): string | null {
  if (!raw) return null;
  return raw.startsWith('::ffff:') ? raw.slice(7) : raw;
}

/** Mapeia segmento de rota para uma ação amigável de auditoria */
function deriveAction(method: string, url: string): string {
  const path = url.split('?')[0].toLowerCase();

  if (path.includes('/auth/change-password')) return 'PASSWORD_CHANGE';
  if (path.includes('/creditos/estorno')) return 'CREDIT_ESTORNO';
  if (path.includes('/creditos')) return 'CREDIT_ADD';
  if (path.includes('/menus')) return 'MENU_CHANGE';
  if (path.includes('/permissions') || path.includes('/permissoes')) return 'PERMISSION_CHANGE';
  if (path.includes('/users') || path.includes('/usuarios')) return 'USER_CHANGE';
  if (path.includes('/planos') || path.includes('/plans')) return 'PLAN_CHANGE';
  if (path.includes('/companies') || path.includes('/empresas')) return 'COMPANY_CHANGE';

  // Fallback: method + path normalizado
  return `${method} ${path}`;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method ?? '';
    const url: string = req.url ?? req.path ?? '';

    // Só intercepta métodos mutantes
    if (!MUTATING_METHODS.has(method)) {
      return next.handle();
    }

    // Não duplicar /auth/login e /auth/logout (já logados explicitamente no AuthController/AuthService)
    const pathLower = url.split('?')[0].toLowerCase();
    if (pathLower.endsWith('/auth/login') || pathLower.endsWith('/auth/logout')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        // Loga apenas após conclusão bem-sucedida (no tap — erros não chegam aqui)
        try {
          const user = req.user;

          // Rotas sem usuário autenticado (públicas) — não logar
          if (!user) return;

          const action = deriveAction(method, url);
          const ip = normalizeIp(req.ip ?? req.connection?.remoteAddress);

          void this.auditService.log({
            action,
            userId: user.userId ?? user.sub ?? null,
            username: user.username ?? null,
            companyId: user.companyId ?? null,
            ip,
            detail: `${method} ${url}`,
          });
        } catch (err) {
          console.error('[AuditInterceptor] Erro ao extrair dados do log:', err);
        }
      }),
    );
  }
}
