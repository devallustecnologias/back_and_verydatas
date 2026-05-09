"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const user_entity_1 = require("../entities/user/user.entity");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async register(data) {
        try {
            return await this.authService.register(data);
        }
        catch (error) {
            throw new common_1.BadRequestException("User already exists");
        }
    }
    async login(data) {
        try {
            return await this.authService.login(data.email, data.password);
        }
        catch (error) {
            throw new common_1.BadRequestException("Invalid credentials");
        }
    }
    me(req) {
        console.log(req.user);
        return req.user;
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new user' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User created successfully', type: user_entity_1.User }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad Request: Validation errors or user already exists' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Not authorized' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    (0, swagger_1.ApiBody)({
        description: "Payload containing user information for registration.",
        schema: {
            type: "object",
            properties: {
                username: { type: "string", example: "Lucas" },
                email: { type: "string", example: "lucas@email.com" },
                password: { type: "string", example: "password123" },
                role: {
                    type: "string",
                    enum: ["master", "empresa", "operador"],
                    example: "operador"
                }
            }
        }
    }),
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Login' }),
    (0, swagger_1.ApiResponse)({
        status: 200, description: 'User logged in successfully', schema: {
            example: {
                "access_token": "string"
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid credentials' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    (0, swagger_1.ApiBody)({
        description: "Payload containing user information for authentication",
        examples: {
            "application/json": {
                value: {
                    email: "lucas@email.com",
                    password: "password"
                }
            }
        }
    }),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get user information' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User information retrieved successfully', type: user_entity_1.User }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized: Missing or invalid token' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", user_entity_1.User)
], AuthController.prototype, "me", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)("auth"),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map