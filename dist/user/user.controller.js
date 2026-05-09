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
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const user_service_1 = require("./user.service");
const swagger_1 = require("@nestjs/swagger");
const user_create_dto_1 = require("./dto/user-create.dto");
const user_update_dto_1 = require("./dto/user-update.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let UserController = class UserController {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    createMaster(dto) {
        return this.userService.createMaster(dto);
    }
    createAdmin(dto) {
        return this.userService.createAdmin(dto);
    }
    createOperator(dto) {
        return this.userService.createOperator(dto);
    }
    update(uid, dto) {
        return this.userService.update(uid, dto);
    }
    remove(uid) {
        return this.userService.remove(uid);
    }
    getUserPermissions(userId) {
        return this.userService.getUserPermissions(userId);
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Post)('master'),
    (0, swagger_1.ApiOperation)({ summary: 'Criar usuário MASTER' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Master criado',
        schema: {
            example: {
                uid: 'uuid',
                username: 'root',
                email: 'root@system.com',
                role: 'master',
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_create_dto_1.CreateUserDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "createMaster", null);
__decorate([
    (0, common_1.Post)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Criar admin da empresa' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_create_dto_1.CreateUserDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "createAdmin", null);
__decorate([
    (0, common_1.Post)('operator'),
    (0, swagger_1.ApiOperation)({ summary: 'Criar operador' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_create_dto_1.CreateUserDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "createOperator", null);
__decorate([
    (0, common_1.Put)(':uid'),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar usuário' }),
    __param(0, (0, common_1.Param)('uid')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_update_dto_1.UpdateUserDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':uid'),
    (0, swagger_1.ApiOperation)({ summary: 'Remover usuário' }),
    __param(0, (0, common_1.Param)('uid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "remove", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':userId/permissions'),
    (0, swagger_1.ApiOperation)({ summary: 'Listar permissões do usuário' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "getUserPermissions", null);
exports.UserController = UserController = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [user_service_1.UserService])
], UserController);
//# sourceMappingURL=user.controller.js.map