import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { randomUUID, createHash } from 'crypto';
import * as otplib from 'otplib';
import * as QRCode from 'qrcode';
import { User, UserRole, UserStatus } from '../entities/user/user.entity';
import { CompanyStatus } from '../company/company.entity';
import { OAuth2Client } from 'google-auth-library';
import { Permission } from 'src/entities/permission/permission.entity';
import { PermissionService } from 'src/entities/permission/permission.service';
import { UserService } from 'src/user/user.service';
import { CompanyAccessControl, IpMode } from 'src/entities/access-control/company-access-control.entity';
import { AuditService } from 'src/audit/audit.service';

/** Normaliza IPv6-mapped (::ffff:x.x.x.x) para o IPv4 puro */
function normalizeIp(raw: string): string {
  if (raw && raw.startsWith('::ffff:')) {
    return raw.slice(7);
  }
  return raw;
}

/** Retorna 'MON'|'TUE'|... para o dia da semana no timezone informado */
function currentDayInTimezone(timezone: string): string {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).formatToParts(new Date());
  const weekdayShort = parts.find(p => p.type === 'weekday')?.value ?? '';
  const idx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayShort);
  return idx >= 0 ? days[idx] : 'MON';
}

/** Retorna 'HH:mm' atual no timezone informado */
function currentTimeInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find(p => p.type === 'hour')?.value ?? '00';
  const minute = parts.find(p => p.type === 'minute')?.value ?? '00';
  // Intl pode retornar '24:xx' para meia-noite — normalizar
  const h = hour === '24' ? '00' : hour;
  return `${h.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

/** TTL do refresh token (config por env) */
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || '7d';
/** Janela de inatividade — mesma regra do jwt.strategy (30 min) */
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

@Injectable()
export class AuthService {

  constructor(
    private jwtService: JwtService,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
    @InjectRepository(CompanyAccessControl)
    private acRepository: Repository<CompanyAccessControl>,

    private readonly userService: UserService,
    private readonly auditService: AuditService,
  ) { }

  async register(data: {
    username: string;
    email: string;
    password: string;
    profile?: string;
    situacao?: string;
  }) {
    let hashedPassword: string;
    try {
      hashedPassword = await bcrypt.hash(data.password, 10);
    } catch (err) {
      console.error('Erro ao gerar hash da senha:', err);
      throw new InternalServerErrorException('Erro interno ao criar a senha.');
    }

    const user = this.userRepository.create({
      ...data,
      password: hashedPassword,
      uid: uuidv4(),
    });

    let userCreate;
    try {
      userCreate = await this.userRepository.save(user);
    } catch (err) {
      console.error('Erro ao salvar o usuário:', err);
      throw new InternalServerErrorException('Erro ao registrar o usuário.');
    }

    return userCreate;
  }

  /**
   * Gera sessão única + par de tokens (access + refresh com rotação).
   * Usado no login com senha e no login 2FA.
   */
  private async issueTokens(user: User, ip: string, detail: string) {
    const permissions = await this.userService.getUserPermissions(user.uid);

    // §15 — Login OK: zera contador de falhas e lockout; gera sessão única
    const sessionId = randomUUID();
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.currentSessionId = sessionId;
    user.lastActivityAt = new Date();

    const payload = {
      sub: user.uid,
      username: user.username,
      role: user.role,
      companyId: user.company?.id ?? null,
      permissions,
      sid: sessionId, // §15 — sessão única
    };

    let accessToken: string;
    let refreshToken: string;
    try {
      accessToken = this.jwtService.sign(payload);
      // jti aleatório: sem ele, dois refresh emitidos no mesmo segundo seriam
      // a MESMA string JWT (iat em segundos) e a rotação viraria no-op
      refreshToken = this.jwtService.sign(
        { sub: user.uid, sid: sessionId, type: 'refresh', jti: randomUUID() },
        { expiresIn: REFRESH_TTL },
      );
    } catch (error) {
      console.error('Erro ao gerar token:', error);
      throw new InternalServerErrorException('Erro ao realizar o login.');
    }

    // Rotação: só o último refresh emitido é válido
    user.refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.userRepository.save(user);

    // Auditoria: LOGIN (não bloqueia a resposta mesmo em falha)
    void this.auditService.log({
      action: 'LOGIN',
      userId: user.uid,
      username: user.username,
      companyId: user.company?.id ?? null,
      ip: normalizeIp(ip),
      detail,
    });

    return { accessToken, refreshToken };
  }

  async login(email: string, password: string, ip: string = '') {
    let user: User | null;
    try {
      user = await this.userRepository.findOne({
        where: { email },
        relations: ['company'],
      });
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      throw new InternalServerErrorException('Erro ao realizar o login.');
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // §15 — Lockout: verifica bloqueio ativo antes de qualquer validação
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Conta temporariamente bloqueada por tentativas de login');
    }

    let passwordMatch: boolean;
    try {
      passwordMatch = await bcrypt.compare(password, user.password);
    } catch (error) {
      console.error('Erro ao comparar senhas:', error);
      throw new InternalServerErrorException('Erro ao realizar o login.');
    }

    if (!passwordMatch) {
      // §15 — Lockout: incrementa contador; ao atingir 3, bloqueia 5 minutos
      user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
      if (user.failedLoginAttempts >= 3) {
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + 5);
        user.lockedUntil = lockedUntil;
        user.failedLoginAttempts = 0;
      }
      await this.userRepository.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Gate: status do usuário
    if (user.status !== UserStatus.ATIVO) {
      const msgMap: Record<string, string> = {
        [UserStatus.BLOQUEADO]: 'Usuário bloqueado',
        [UserStatus.SUSPENSO]: 'Usuário suspenso',
        [UserStatus.EXCLUIDO]: 'Usuário não encontrado',
      };
      throw new UnauthorizedException(msgMap[user.status] ?? 'Acesso negado');
    }

    // Gate: status da empresa (não bloqueia MASTER sem empresa)
    if (user.role !== UserRole.MASTER && user.company?.status === CompanyStatus.BLOQUEADA) {
      throw new UnauthorizedException('Empresa bloqueada');
    }

    // Gate: horário e IP por empresa (MASTER é isento)
    if (user.role !== UserRole.MASTER && user.company) {
      const ac = await this.acRepository.findOne({
        where: { company: { id: user.company.id } },
      });

      if (ac) {
        // Horário
        if (ac.scheduleEnabled) {
          const tz = ac.timezone || 'America/Sao_Paulo';
          const currentDay = currentDayInTimezone(tz);
          const currentTime = currentTimeInTimezone(tz);

          // allowedDays vazio = todos os dias permitidos (valida apenas a janela de horário)
          const dayAllowed =
            !ac.allowedDays?.length || ac.allowedDays.includes(currentDay);

          let timeAllowed = true;
          if (ac.startTime && ac.endTime) {
            timeAllowed =
              ac.startTime <= ac.endTime
                ? currentTime >= ac.startTime && currentTime <= ac.endTime
                : // janela cruza meia-noite (ex. 22:00–06:00)
                  currentTime >= ac.startTime || currentTime <= ac.endTime;
          }

          if (!dayAllowed || !timeAllowed) {
            throw new UnauthorizedException('Acesso fora do horário permitido');
          }
        }

        // IP
        if (ac.ipMode === IpMode.RESTRICTED) {
          const normalizedRequest = normalizeIp(ip);
          const allowed = (ac.allowedIps ?? []).map(normalizeIp);
          if (!allowed.includes(normalizedRequest)) {
            throw new UnauthorizedException('IP não autorizado');
          }
        }
      }
    }

    // 2FA habilitado: não cria sessão ainda — exige código TOTP em /auth/2fa/login
    if (user.twoFactorEnabled) {
      const twoFactorToken = this.jwtService.sign(
        { sub: user.uid, type: '2fa', jti: randomUUID() },
        { expiresIn: '5m' },
      );
      // Uso único: só o último twoFactorToken emitido vale na 2ª etapa
      user.twoFactorTokenHash = createHash('sha256')
        .update(twoFactorToken)
        .digest('hex');
      await this.userRepository.save(user);
      return { requires2fa: true, twoFactorToken };
    }

    return this.issueTokens(user, ip, `Login via email: ${user.email}`);
  }

  /** Segunda etapa do login com 2FA: valida o token temporário + código TOTP */
  async loginWith2fa(twoFactorToken: string, code: string, ip: string = '') {
    let payload: any;
    try {
      payload = this.jwtService.verify(twoFactorToken);
    } catch {
      throw new UnauthorizedException('Sessão de 2FA expirada — faça login novamente');
    }
    if (payload?.type !== '2fa') {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.userRepository.findOne({
      where: { uid: payload.sub },
      relations: ['company'],
    });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('Token inválido');
    }

    // Re-checa status (a janela de 5min pode cruzar um bloqueio)
    if (user.status !== UserStatus.ATIVO) {
      throw new UnauthorizedException('Acesso negado');
    }

    // Uso único: token precisa ser o último emitido e ainda não consumido
    const tokenHash = createHash('sha256').update(twoFactorToken).digest('hex');
    if (!user.twoFactorTokenHash || user.twoFactorTokenHash !== tokenHash) {
      throw new UnauthorizedException('Token inválido');
    }

    const verifyResult = otplib.verifySync({ token: code, secret: user.twoFactorSecret });
    if (!verifyResult.valid) {
      throw new UnauthorizedException('Código 2FA inválido');
    }
    // cast: o tipo união TOTP|HOTP esconde epoch, mas o verify TOTP sempre retorna
    this.assertTotpNotReplayed(
      user,
      Math.floor((verifyResult as { epoch: number }).epoch / 30),
    );

    user.twoFactorTokenHash = null; // consumido
    return this.issueTokens(user, ip, `Login via email + 2FA: ${user.email}`);
  }

  // §15 — Sessão única: limpa currentSessionId ao deslogar
  async logout(userId: string): Promise<void> {
    await this.userRepository.update(
      { uid: userId },
      { currentSessionId: null, refreshTokenHash: null },
    );
  }

  /** Troca refresh token válido por novo par access+refresh (rotação) */
  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
    if (payload?.type !== 'refresh') {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const user = await this.userRepository.findOne({
      where: { uid: payload.sub },
      relations: ['company'],
    });
    if (!user || user.status !== UserStatus.ATIVO) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    // §15 — Sessão única: refresh só vale para a sessão ativa
    if (!payload.sid || user.currentSessionId !== payload.sid) {
      throw new UnauthorizedException('Sessão encerrada: login em outro dispositivo');
    }

    // Rotação: precisa ser exatamente o último refresh emitido
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    if (!user.refreshTokenHash || user.refreshTokenHash !== hash) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    // §15 — Inatividade: refresh não ressuscita sessão parada há 30min+
    if (
      user.lastActivityAt != null &&
      Date.now() - user.lastActivityAt.getTime() > INACTIVITY_TIMEOUT_MS
    ) {
      throw new UnauthorizedException('Sessão expirada por inatividade');
    }

    const permissions = await this.userService.getUserPermissions(user.uid);
    const accessPayload = {
      sub: user.uid,
      username: user.username,
      role: user.role,
      companyId: user.company?.id ?? null,
      permissions,
      sid: payload.sid,
    };
    const accessToken = this.jwtService.sign(accessPayload);
    const newRefreshToken = this.jwtService.sign(
      { sub: user.uid, sid: payload.sid, type: 'refresh', jti: randomUUID() },
      { expiresIn: REFRESH_TTL },
    );

    user.refreshTokenHash = createHash('sha256').update(newRefreshToken).digest('hex');
    user.lastActivityAt = new Date();
    await this.userRepository.save(user);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { uid: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) throw new UnauthorizedException('Senha atual incorreta');

    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException(
        'A nova senha deve ter pelo menos 8 caracteres',
      );
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await this.userRepository.save(user);
  }

  /** Rejeita reuso do mesmo código TOTP (timeStep já aceito) — replay guard */
  private assertTotpNotReplayed(user: User, timeStep: number) {
    if (
      user.twoFactorLastTimeStep != null &&
      timeStep <= user.twoFactorLastTimeStep
    ) {
      throw new UnauthorizedException(
        'Código 2FA já utilizado — aguarde o próximo código',
      );
    }
    user.twoFactorLastTimeStep = timeStep;
  }

  /** Gera secret TOTP + QR — só ativa de fato no enable (após confirmar código) */
  async setup2fa(userId: string) {
    const user = await this.userRepository.findOne({ where: { uid: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA já está ativo nesta conta');
    }

    const secret = otplib.generateSecret();
    user.twoFactorSecret = secret;
    await this.userRepository.save(user);

    const otpauthUrl = otplib.generateURI({
      issuer: 'Verytas Data',
      label: user.email,
      secret,
    });
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { secret, otpauthUrl, qrDataUrl };
  }

  /** Confirma o código do app e liga o 2FA */
  async enable2fa(userId: string, code: string) {
    const user = await this.userRepository.findOne({ where: { uid: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!user.twoFactorSecret) {
      throw new BadRequestException('Execute o setup do 2FA antes de ativar');
    }

    const verifyResult = otplib.verifySync({ token: code, secret: user.twoFactorSecret });
    if (!verifyResult.valid) {
      throw new UnauthorizedException('Código 2FA inválido');
    }
    // cast: o tipo união TOTP|HOTP esconde epoch, mas o verify TOTP sempre retorna
    this.assertTotpNotReplayed(
      user,
      Math.floor((verifyResult as { epoch: number }).epoch / 30),
    );

    user.twoFactorEnabled = true;
    await this.userRepository.save(user);

    void this.auditService.log({
      action: '2FA_ENABLE',
      userId: user.uid,
      username: user.username,
      companyId: null,
      ip: null,
      detail: '2FA TOTP ativado',
    });
    return { success: true };
  }

  /** Desliga o 2FA (exige código válido) */
  async disable2fa(userId: string, code: string) {
    const user = await this.userRepository.findOne({ where: { uid: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA não está ativo nesta conta');
    }

    const verifyResult = otplib.verifySync({ token: code, secret: user.twoFactorSecret });
    if (!verifyResult.valid) {
      throw new UnauthorizedException('Código 2FA inválido');
    }
    // cast: o tipo união TOTP|HOTP esconde epoch, mas o verify TOTP sempre retorna
    this.assertTotpNotReplayed(
      user,
      Math.floor((verifyResult as { epoch: number }).epoch / 30),
    );

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await this.userRepository.save(user);

    void this.auditService.log({
      action: '2FA_DISABLE',
      userId: user.uid,
      username: user.username,
      companyId: null,
      ip: null,
      detail: '2FA TOTP desativado',
    });
    return { success: true };
  }
}
