import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../entities/user/user.entity';
import { Permission } from 'src/entities/permission/permission.entity';
import { UserService } from 'src/user/user.service';
import { jwtConstants } from './jwt.constants';
import { generateSecret, generateURI, verify } from 'otplib';
import * as qrcode from 'qrcode';

@Injectable()
export class AuthService {

  constructor(
    private jwtService: JwtService,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,

    private readonly userService: UserService,
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

  async login(email: string, password: string) {
    let user: User | null;
    try {
      user = await this.userRepository.findOne({
        where: { email },
      });
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      throw new InternalServerErrorException('Erro ao realizar o login.');
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    let passwordMatch: boolean;
    try {
      passwordMatch = await bcrypt.compare(password, user.password);
    } catch (error) {
      console.error('Erro ao comparar senhas:', error);
      throw new InternalServerErrorException('Erro ao realizar o login.');
    }

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Se o usuário tem o 2FA ativado, não gera os tokens finais ainda.
    if (user.isTwoFactorAuthenticationEnabled) {
      return {
        require2FA: true,
        userId: user.uid,
        username: user.username,
        email: user.email,
      };
    }

    return this.generateTokens(user);
  }

  async generateTokens(user: User) {
    let permissoes: any[] = [];
    try {
      permissoes = await this.userService.getUserPermissions(user.uid);
    } catch {
      // usuário master ou sem plano não tem permissões, retorna vazio
      permissoes = [];
    }
    const payload = { sub: user.uid, username: user.username, role: user.role, permissoes };

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtConstants.secret,
      expiresIn: jwtConstants.expiresIn,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.uid, username: user.username, role: user.role },
      {
        secret: jwtConstants.refreshSecret,
        expiresIn: jwtConstants.refreshExpiresIn,
      },
    );

    await this.updateRefreshToken(user.uid, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        uid: user.uid,
        username: user.username,
        email: user.email,
        role: user.role,
        isTwoFactorAuthenticationEnabled: user.isTwoFactorAuthenticationEnabled,
      },
    };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(userId, {
      hashedRefreshToken,
    });
  }

  async revokeRefreshToken(userId: string) {
    await this.userRepository.update(userId, {
      hashedRefreshToken: null,
    });
  }

  async getAuthenticatedUserIfRefreshTokenMatches(userId: string, refreshToken: string) {
    const user = await this.userRepository.findOne({ where: { uid: userId } });
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const isRefreshTokenMatching = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!isRefreshTokenMatching) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return user;
  }

  async generate2FA(userId: string) {
    const user = await this.userRepository.findOne({ where: { uid: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return this.generateTwoFactorAuthenticationSecret(user);
  }

  async generateTwoFactorAuthenticationSecret(user: User) {
    const secret = generateSecret();
    const otpauthUrl = generateURI({
      secret,
      label: user.email,
      issuer: 'Veridata SaaS',
    });

    await this.userRepository.update(user.uid, {
      twoFactorAuthenticationSecret: secret,
    });

    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    return {
      secret,
      qrCodeDataUrl,
    };
  }

  async isTwoFactorAuthenticationCodeValid(twoFactorAuthenticationCode: string, user: User) {
    if (!user.twoFactorAuthenticationSecret) {
      return false;
    }
    return verify({
      token: twoFactorAuthenticationCode,
      secret: user.twoFactorAuthenticationSecret,
    });
  }

  async turnOnTwoFactorAuthentication(userId: string, code: string) {
    const user = await this.userRepository.findOne({ where: { uid: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const isValid = await this.isTwoFactorAuthenticationCodeValid(code, user);
    if (!isValid) {
      throw new UnauthorizedException('Código 2FA inválido');
    }

    await this.userRepository.update(userId, {
      isTwoFactorAuthenticationEnabled: true,
    });

    return { success: true };
  }

  async turnOffTwoFactorAuthentication(userId: string, code: string) {
    const user = await this.userRepository.findOne({ where: { uid: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const isValid = await this.isTwoFactorAuthenticationCodeValid(code, user);
    if (!isValid) {
      throw new UnauthorizedException('Código 2FA inválido');
    }

    await this.userRepository.update(userId, {
      isTwoFactorAuthenticationEnabled: false,
      twoFactorAuthenticationSecret: null,
    });

    return { success: true };
  }

  async authenticate2FA(userId: string, code: string) {
    const user = await this.userRepository.findOne({ where: { uid: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const isValid = await this.isTwoFactorAuthenticationCodeValid(code, user);
    if (!isValid) {
      throw new UnauthorizedException('Código 2FA inválido');
    }

    return this.generateTokens(user);
  }
}
