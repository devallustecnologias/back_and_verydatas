import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from './entities/user/user.entity';
class GoogleLoginDto {
  /**
   * @example "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2..."
   */
  credential: string;
}


@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService
  ) { }

  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully', type: User })
  @ApiResponse({ status: 400, description: 'Bad Request: Validation errors or user already exists' })
  @ApiResponse({ status: 401, description: 'Not authorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiBody({
    description: "Payload containing user information for registration.",
    schema: {
      example: {
        username: "Lucas",
        email: "lucas@email.com",
        password: "password123",
      }
    }
  })
  @Post('register')
  async register(
    @Body() data: { username: string; email: string; password: string}
  ): Promise<User> {
    try {
      return await this.authService.register(data);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @ApiOperation({ summary: 'Login' })
  @ApiResponse({ status: 200, description: 'User logged in successfully', schema: {
      example: {
        "access_token": "string"
      }
    } })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiBody({
    description: "Payload containing user information for authentication",
    examples: {
      "application/json": {
        value: {
          email: "lucas@email.com",
          password: "password"
        }
      }
    }
  })
  @Post('login')
  async login(@Body() data: { email: string; password: string }): Promise<any> {
    try {
      return await this.authService.login(data.email, data.password);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @ApiOperation({ summary: 'Get user information' })
  @ApiResponse({ status: 200, description: 'User information retrieved successfully', type: User })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any): User {
    return req.user;
  }

    @Post('google')
  @ApiBody({ type: GoogleLoginDto })
  googleLogin(@Body('credential') credential: string) {
    return this.authService.googleLogin(credential);
  }
}
