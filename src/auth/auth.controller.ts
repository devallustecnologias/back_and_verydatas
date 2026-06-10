import {
  Body,
  Controller,
  Get,
  Ip,
  Post,
  Req,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";

import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";

import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { User, UserRole } from "../entities/user/user.entity";
import { Public } from "./decorators/public.decorator";
import { Roles } from "./decorators/roles.decorator";
import { AuditService } from "src/audit/audit.service";
import { User as UserDecorator } from "./user.decorator";

/** Normaliza IPv6-mapped (::ffff:x.x.x.x) para IPv4 puro */
function normalizeIp(raw: string | undefined): string | null {
  if (!raw) return null;
  return raw.startsWith('::ffff:') ? raw.slice(7) : raw;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  // =========================
  // REGISTER
  // =========================
  // register cria usuário com role arbitrária (inclui master) → restrito a MASTER.
  // Primeiro master = seed/insert no banco (bootstrap). Login é a única rota @Public.
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({ status: 201, description: "User created", type: User })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["username", "email", "password", "role"],
      properties: {
        username: { type: "string", example: "Lucas" },
        email: { type: "string", example: "lucas@email.com" },
        password: { type: "string", example: "123456" },
        role: {
          type: "string",
          enum: ["master", "empresa", "operador"],
          example: "operador",
        },
      },
    },
  })
  @Post("register")
  async register(
    @Body()
    data: {
      username: string;
      email: string;
      password: string;
      role: "master" | "empresa" | "operador";
    }
  ): Promise<User> {
    if (!data.username || !data.email || !data.password || !data.role) {
      throw new BadRequestException("Missing required fields");
    }

    try {
      return await this.authService.register(data);
    } catch (error) {
      throw new BadRequestException(
        error || "User already exists or invalid data"
      );
    }
  }

  // =========================
  // LOGIN
  // =========================
  @Public()
  @ApiOperation({ summary: "Login user" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    schema: {
      example: {
        access_token: "jwt_token_here",
      },
    },
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", example: "lucas@email.com" },
        password: { type: "string", example: "123456" },
      },
    },
  })
  @Post("login")
  async login(
    @Body() data: { email: string; password: string },
    @Ip() ip: string,
  ): Promise<any> {
    if (!data.email || !data.password) {
      throw new BadRequestException("Email and password are required");
    }

    try {
      return await this.authService.login(data.email, data.password, ip);
    } catch (error) {
      console.log(error)
      throw error;
    }
  }

  // =========================
  // LOGOUT
  // =========================
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout — registra evento de auditoria (JWT stateless)',
  })
  @ApiResponse({ status: 200, schema: { example: { success: true } } })
  @Post('logout')
  async logout(@Ip() ip: string, @UserDecorator() user: any) {
    // §15 — Sessão única: invalida currentSessionId no banco
    const userId = user?.userId ?? user?.sub ?? null;
    if (userId) {
      void this.authService.logout(userId);
    }
    void this.auditService.log({
      action: 'LOGOUT',
      userId,
      username: user?.username ?? null,
      companyId: user?.companyId ?? null,
      ip: normalizeIp(ip),
      detail: 'Logout',
    });
    return { success: true };
  }

  // =========================
  // CHANGE PASSWORD
  // =========================
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trocar a própria senha' })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true } },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('change-password')
  async changePassword(
    @Body()
    body: { currentPassword: string; newPassword: string },
    @UserDecorator() user: any,
  ) {
    if (!body?.currentPassword || !body?.newPassword) {
      throw new BadRequestException(
        'currentPassword e newPassword são obrigatórios',
      );
    }
    await this.authService.changePassword(
      user.userId ?? user.sub,
      body.currentPassword,
      body.newPassword,
    );
    return { success: true };
  }

  // =========================
  // ME
  // =========================
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get logged user" })
  @ApiResponse({ status: 200, type: User })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Get("me")
  me(@Req() req: any): User {
    console.log(req.user)
    return req.user;
  }
}
