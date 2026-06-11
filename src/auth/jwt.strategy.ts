import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../entities/user/user.entity';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

/** 30 minutos em milissegundos */
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

/** Throttle de escrita no lastActivityAt: só atualiza se passaram mais de 60s */
const ACTIVITY_WRITE_THROTTLE_MS = 60 * 1000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: any) {
    // Tokens especiais (type 'refresh'/'2fa') NÃO valem como access token —
    // sem esta checagem, um twoFactorToken passaria em rotas protegidas
    if (payload.type) {
      throw new UnauthorizedException();
    }

    // §15 — Carrega user do banco para validações em tempo-real
    const user = await this.userRepository.findOne({
      where: { uid: payload.sub },
    });

    if (!user || user.deletedAt != null) {
      throw new UnauthorizedException();
    }

    // §15 — Status: derruba banido/bloqueado/suspenso imediatamente
    if (user.status !== UserStatus.ATIVO) {
      throw new UnauthorizedException('Acesso negado');
    }

    // §15 — Sessão única: token com sid precisa bater com a sessão ativa.
    // currentSessionId null = sem sessão ativa (logout) → token com sid é rejeitado.
    // Tokens antigos sem sid (pré-feature) continuam válidos até expirarem.
    if (payload.sid != null && user.currentSessionId !== payload.sid) {
      throw new UnauthorizedException('Sessão encerrada: login em outro dispositivo');
    }

    // §15 — Inatividade (gracioso): só verifica se lastActivityAt já existe
    const now = new Date();
    if (user.lastActivityAt != null) {
      const elapsed = now.getTime() - user.lastActivityAt.getTime();
      if (elapsed > INACTIVITY_TIMEOUT_MS) {
        throw new UnauthorizedException('Sessão expirada por inatividade');
      }
    }

    // §15 — Atualiza lastActivityAt com throttle (evita 1 write por request)
    const shouldWrite =
      user.lastActivityAt == null ||
      now.getTime() - user.lastActivityAt.getTime() > ACTIVITY_WRITE_THROTTLE_MS;

    if (shouldWrite) {
      // fire-and-forget — não bloqueia a resposta
      void this.userRepository.update({ uid: user.uid }, { lastActivityAt: now });
    }

    // Mantém exatamente o mesmo shape de req.user que o código existente espera
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      companyId: payload.companyId,
      permissions: payload.permissions,
      mustChangePassword: user.mustChangePassword ?? false,
      twoFactorEnabled: user.twoFactorEnabled ?? false,
    };
  }
}
