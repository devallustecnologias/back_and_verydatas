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
exports.PermissionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const permission_entity_1 = require("./permission.entity");
const typeorm_2 = require("typeorm");
let PermissionService = class PermissionService {
    permissionRepo;
    constructor(permissionRepo) {
        this.permissionRepo = permissionRepo;
    }
    async findOne(id) {
        const permission = await this.permissionRepo.findOne({ where: { id } });
        if (!permission) {
            throw new common_1.NotFoundException('Permissão não encontrada');
        }
        return permission;
    }
    async create(dto) {
        const exists = await this.permissionRepo.findOne({
            where: { key: dto.key },
        });
        if (exists) {
            throw new common_1.BadRequestException('Permissão já existe');
        }
        const permission = this.permissionRepo.create(dto);
        return this.permissionRepo.save(permission);
    }
    async remove(id) {
        const permission = await this.findOne(id);
        await this.permissionRepo.remove(permission);
    }
    async findAll(page = 1, limit = 10, search) {
        const [data, total] = await this.permissionRepo.findAndCount({
            where: search
                ? {
                    name: (0, typeorm_2.ILike)(`%${search}%`),
                }
                : {},
            order: {
                id: 'DESC',
            },
            skip: (page - 1) * limit,
            take: limit,
        });
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async update(id, dto) {
        const permission = await this.findOne(id);
        if (dto.key) {
            const exists = await this.permissionRepo.findOne({
                where: {
                    key: dto.key,
                },
            });
            if (exists && exists.id !== id) {
                throw new common_1.BadRequestException('Permissão já existe');
            }
        }
        Object.assign(permission, dto);
        return this.permissionRepo.save(permission);
    }
};
exports.PermissionService = PermissionService;
exports.PermissionService = PermissionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(permission_entity_1.Permission)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PermissionService);
//# sourceMappingURL=permission.service.js.map