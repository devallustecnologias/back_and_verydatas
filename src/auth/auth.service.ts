import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../entities/user/user.entity';
import { OAuth2Client } from 'google-auth-library';
import { Permission } from 'src/entities/permission/permission.entity';
import { PermissionService } from 'src/entities/permission/permission.service';
import { UserService } from 'src/user/user.service';

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
    const userWithPermissions = await this.userRepository.findOne({
      where: { uid: user.uid },
      relations: ['permissions'],
    });

    const permissoes =  this.userService.getUserPermissions(user.uid);
    console.log('User with permissions:', userWithPermissions);

    const payload = { sub: user.uid, username: user.username, role: user.role, userWithPermissions };
    try {
      return { accessToken: this.jwtService.sign(payload) };
    } catch (error) {
      console.error('Erro ao gerar token:', error);
      throw new InternalServerErrorException('Erro ao realizar o login.');
    }
  }
}
