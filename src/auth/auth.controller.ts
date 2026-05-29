import {
  Body,
  Controller,
  Get,
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
import { JwtRefreshAuthGuard } from "./jwt-refresh-auth.guard";
import { User } from "../entities/user/user.entity";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // =========================
  // REGISTER
  // =========================
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
    @Body() data: { email: string; password: string }
  ): Promise<any> {
    if (!data.email || !data.password) {
      throw new BadRequestException("Email and password are required");
    }

    try {
      return await this.authService.login(data.email, data.password);
    } catch (error) {
      console.error('[AUTH] Erro no login:', error?.message || error);
      throw new UnauthorizedException("Invalid email or password");
    }
  }

  // =========================
  // ME
  // =========================
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get logged user" })
  @ApiResponse({ status: 200, type: User })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@Req() req: any): User {
    console.log(req.user)
    return req.user;
  }

  // =========================
  // REFRESH TOKEN & LOGOUT
  // =========================
  @ApiBearerAuth()
  @ApiOperation({ summary: "Refresh access token" })
  @UseGuards(JwtRefreshAuthGuard)
  @Post("refresh")
  async refresh(@Req() req: any) {
    const { userId, refreshToken } = req.user;
    const user = await this.authService.getAuthenticatedUserIfRefreshTokenMatches(userId, refreshToken);
    return this.authService.generateTokens(user);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout user and revoke refresh token" })
  @UseGuards(JwtAuthGuard)
  @Post("logout")
  async logout(@Req() req: any) {
    const userId = req.user.userId;
    await this.authService.revokeRefreshToken(userId);
    return { success: true };
  }

  // =========================
  // 2FA (TWO-FACTOR AUTHENTICATION)
  // =========================
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate 2FA secret and QR Code" })
  @UseGuards(JwtAuthGuard)
  @Post("2fa/generate")
  async generate2FA(@Req() req: any) {
    const userId = req.user.userId;
    return this.authService.generate2FA(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Turn on 2FA" })
  @UseGuards(JwtAuthGuard)
  @Post("2fa/turn-on")
  async turnOn2FA(@Req() req: any, @Body() body: { code: string }) {
    if (!body.code) {
      throw new BadRequestException("O código 2FA é obrigatório");
    }
    const userId = req.user.userId;
    return this.authService.turnOnTwoFactorAuthentication(userId, body.code);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Turn off 2FA" })
  @UseGuards(JwtAuthGuard)
  @Post("2fa/turn-off")
  async turnOff2FA(@Req() req: any, @Body() body: { code: string }) {
    if (!body.code) {
      throw new BadRequestException("O código 2FA é obrigatório");
    }
    const userId = req.user.userId;
    return this.authService.turnOffTwoFactorAuthentication(userId, body.code);
  }

  @ApiOperation({ summary: "Authenticate with 2FA to complete login" })
  @Post("2fa/authenticate")
  async authenticate2FA(@Body() body: { userId: string; code: string }) {
    if (!body.userId || !body.code) {
      throw new BadRequestException("O userId e o código 2FA são obrigatórios");
    }
    return this.authService.authenticate2FA(body.userId, body.code);
  }
}