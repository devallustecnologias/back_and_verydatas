import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from './entities/user/user.entity';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {

    private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(
    private jwtService: JwtService,
    @InjectRepository(User) private userRepository: Repository<User>,
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
      if (err.code === '23505') {
        throw new InternalServerErrorException('Email já cadastrado.');
      }
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

    const payload = { sub: user.uid, username: user.username };
    try {
      return { accessToken: this.jwtService.sign(payload) };
    } catch (error) {
      console.error('Erro ao gerar token:', error);
      throw new InternalServerErrorException('Erro ao realizar o login.');
    }
  }

    async googleLogin(credential: string) {
    let ticket;
    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: "76258390090-0blp9d4bhj7d65b6ugbmhdh72mtivgug.apps.googleusercontent.com",
      });
    } catch (err) {
      console.error('Erro ao verificar token do Google:', err);
      throw new InternalServerErrorException('Token inválido.');
    }

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    if (!email) {
      throw new InternalServerErrorException('Email não encontrado no Google.');
    }

    // Verifica se o usuário já existe
    let user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Cria usuário novo
      user = this.userRepository.create({
        email,
        username: name,
        // profile: picture,
        uid: uuidv4(),
        password: uuidv4(), // Sem senha
      });

      try {
        user = await this.userRepository.save(user);
      } catch (err) {
        console.error('Erro ao criar usuário Google:', err);
        throw new InternalServerErrorException('Erro ao registrar usuário Google.');
      }
    }
    const payloadToSign = { sub: user.uid, username: user.username };
    // Gera JWT interno da sua aplicação
    return { access_token: this.jwtService.sign(payloadToSign), uid: user.uid };
  }
}
