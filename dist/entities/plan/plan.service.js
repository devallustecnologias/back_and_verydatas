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
exports.PlanService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const plan_entity_1 = require("./plan.entity");
const typeorm_2 = require("typeorm");
const permission_entity_1 = require("../permission/permission.entity");
const user_entity_1 = require("../user/user.entity");
let PlanService = class PlanService {
    planRepo;
    permissionRepo;
    userRepo;
    constructor(planRepo, permissionRepo, userRepo) {
        this.planRepo = planRepo;
        this.permissionRepo = permissionRepo;
        this.userRepo = userRepo;
    }
    async findAll(page = 1, limit = 10, search) {
        const [data, total] = await this.planRepo.findAndCount({
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
            relations: ['permissions'],
        });
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findOne(id) {
        const plan = await this.planRepo.findOne({ where: { id } });
        if (!plan) {
            throw new common_1.NotFoundException('Plano não encontrado');
        }
        return plan;
    }
    async create(dto) {
        const permissions = await this.permissionRepo.find({
            where: {
                id: (0, typeorm_2.In)(dto.permissionIds),
            },
        });
        if (permissions.length !== dto.permissionIds.length) {
            throw new common_1.BadRequestException('Permissões inválidas');
        }
        const plan = this.planRepo.create({
            name: dto.name,
            isSystem: dto.isSystem ?? false,
            permissions,
        });
        return this.planRepo.save(plan);
    }
    async update(id, dto) {
        console.log(id, dto);
        const plan = await this.findOne(id);
        if (plan.isSystem) {
            throw new common_1.BadRequestException('Plano do sistema não pode ser editado');
        }
        const permissions = await this.permissionRepo.find({
            where: dto.permissionIds.map((id) => ({ id })),
        });
        if (permissions.length !== dto.permissionIds.length) {
            throw new common_1.BadRequestException('Permissões inválidas');
        }
        plan.name = dto.name;
        plan.permissions = permissions;
        return this.planRepo.save(plan);
    }
    async remove(id) {
        const plan = await this.findOne(id);
        await this.planRepo.remove(plan);
    }
    async assignPlanToUser(userId, planId) {
        const user = await this.userRepo.findOne({
            where: { uid: userId },
            relations: ['plan'],
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuário não encontrado');
        }
        const plan = await this.planRepo.findOne({
            where: { id: planId },
        });
        if (!plan) {
            throw new common_1.NotFoundException('Plano não encontrado');
        }
        user.plan = plan;
        await this.userRepo.save(user);
    }
};
exports.PlanService = PlanService;
exports.PlanService = PlanService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(plan_entity_1.Plan)),
    __param(1, (0, typeorm_1.InjectRepository)(permission_entity_1.Permission)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PlanService);
//# sourceMappingURL=plan.service.js.map