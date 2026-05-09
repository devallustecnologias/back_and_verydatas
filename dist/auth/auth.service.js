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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const bcrypt = require("bcrypt");
const typeorm_2 = require("typeorm");
const uuid_1 = require("uuid");
const user_entity_1 = require("../entities/user/user.entity");
const permission_entity_1 = require("../entities/permission/permission.entity");
const user_service_1 = require("../user/user.service");
let AuthService = class AuthService {
    jwtService;
    userRepository;
    permissionsRepository;
    userService;
    constructor(jwtService, userRepository, permissionsRepository, userService) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.permissionsRepository = permissionsRepository;
        this.userService = userService;
    }
    async register(data) {
        let hashedPassword;
        try {
            hashedPassword = await bcrypt.hash(data.password, 10);
        }
        catch (err) {
            console.error('Erro ao gerar hash da senha:', err);
            throw new common_1.InternalServerErrorException('Erro interno ao criar a senha.');
        }
        const user = this.userRepository.create({
            ...data,
            password: hashedPassword,
            uid: (0, uuid_1.v4)(),
        });
        let userCreate;
        try {
            userCreate = await this.userRepository.save(user);
        }
        catch (err) {
            console.error('Erro ao salvar o usuário:', err);
            throw new common_1.InternalServerErrorException('Erro ao registrar o usuário.');
        }
        return userCreate;
    }
    async login(email, password) {
        let user;
        try {
            user = await this.userRepository.findOne({
                where: { email },
            });
        }
        catch (error) {
            console.error('Erro ao buscar usuário:', error);
            throw new common_1.InternalServerErrorException('Erro ao realizar o login.');
        }
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        let passwordMatch;
        try {
            passwordMatch = await bcrypt.compare(password, user.password);
        }
        catch (error) {
            console.error('Erro ao comparar senhas:', error);
            throw new common_1.InternalServerErrorException('Erro ao realizar o login.');
        }
        if (!passwordMatch) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const userWithPermissions = await this.userRepository.findOne({
            where: { uid: user.uid },
            relations: ['permissions'],
        });
        const permissoes = this.userService.getUserPermissions(user.uid);
        console.log('User with permissions:', userWithPermissions);
        const payload = { sub: user.uid, username: user.username, role: user.role, userWithPermissions };
        try {
            return { accessToken: this.jwtService.sign(payload) };
        }
        catch (error) {
            console.error('Erro ao gerar token:', error);
            throw new common_1.InternalServerErrorException('Erro ao realizar o login.');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(permission_entity_1.Permission)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        user_service_1.UserService])
], AuthService);
//# sourceMappingURL=auth.service.js.map