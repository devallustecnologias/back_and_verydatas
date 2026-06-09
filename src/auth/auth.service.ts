import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { randomUUID } from 'crypto';
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
      // §15 — Lockout: incrementa contador; ao atingir 20, bloqueia 5 minutos
      user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
      if (user.failedLoginAttempts >= 20) {
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
        if (ac.scheduleEnabled && ac.allowedDays?.length) {
          const tz = ac.timezone || 'America/Sao_Paulo';
          const currentDay = currentDayInTimezone(tz);
          const currentTime = currentTimeInTimezone(tz);

          const dayAllowed = ac.allowedDays.includes(currentDay);
          let timeAllowed = true;
          if (ac.startTime && ac.endTime) {
            timeAllowed = currentTime >= ac.startTime && currentTime <= ac.endTime;
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

    const permissions = await this.userService.getUserPermissions(user.uid);
    console.log('User with permissions:', permissions);

    // §15 — Login OK: zera contador de falhas e lockout; gera sessão única
    const sessionId = randomUUID();
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.currentSessionId = sessionId;
    user.lastActivityAt = new Date();
    await this.userRepository.save(user);

    const payload = {
      sub: user.uid,
      username: user.username,
      role: user.role,
      companyId: user.company?.id ?? null,
      permissions,
      sid: sessionId, // §15 — sessão única
    };

    let token: string;
    try {
      token = this.jwtService.sign(payload);
    } catch (error) {
      console.error('Erro ao gerar token:', error);
      throw new InternalServerErrorException('Erro ao realizar o login.');
    }

    // Auditoria: LOGIN (não bloqueia a resposta mesmo em falha)
    void this.auditService.log({
      action: 'LOGIN',
      userId: user.uid,
      username: user.username,
      companyId: user.company?.id ?? null,
      ip: normalizeIp(ip),
      detail: `Login via email: ${user.email}`,
    });

    return { accessToken: token };
  }

  // §15 — Sessão única: limpa currentSessionId ao deslogar
  async logout(userId: string): Promise<void> {
    await this.userRepository.update({ uid: userId }, { currentSessionId: null });
  }
}
