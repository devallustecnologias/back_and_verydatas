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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const uuid_1 = require("uuid");
const company_entity_1 = require("../company/company.entity");
const user_entity_1 = require("../entities/user/user.entity");
const plan_entity_1 = require("../entities/plan/plan.entity");
let UserService = class UserService {
    userRepo;
    companyRepo;
    planRepo;
    constructor(userRepo, companyRepo, planRepo) {
        this.userRepo = userRepo;
        this.companyRepo = companyRepo;
        this.planRepo = planRepo;
    }
    async hashPassword(password) {
        return bcrypt.hash(password, 10);
    }
    async findCompany(companyId) {
        if (!companyId)
            return null;
        const company = await this.companyRepo.findOne({
            where: { id: companyId },
            relations: {
                plan: {
                    permissions: true,
                },
            },
        });
        if (!company) {
            throw new common_1.NotFoundException('Empresa não encontrada');
        }
        return company;
    }
    async createMaster(dto) {
        const password = await this.hashPassword(dto.password);
        const user = this.userRepo.create({
            uid: (0, uuid_1.v4)(),
            username: dto.username,
            email: dto.email,
            password,
            role: user_entity_1.UserRole.MASTER,
        });
        return this.userRepo.save(user);
    }
    async createAdmin(dto) {
        if (!dto.companyId) {
            throw new common_1.BadRequestException('Empresa é obrigatória');
        }
        const company = await this.findCompany(dto.companyId);
        if (company?.plan == null) {
            throw new common_1.BadRequestException('Empresa não possui plano definido');
        }
        const password = await this.hashPassword(dto.password);
        let plan = null;
        if (dto.permissionIds?.length) {
            const companyPermissionIds = company.plan?.permissions.map((p) => p.id) ?? [];
            const invalidPermissions = dto.permissionIds.filter((id) => !companyPermissionIds.includes(id));
            if (invalidPermissions.length > 0) {
                throw new common_1.BadRequestException('Permissões inválidas para esta empresa');
            }
            plan = this.planRepo.create({
                name: `custom-admin-${dto.username}`,
                isSystem: false,
                permissions: company.plan.permissions.filter((p) => dto.permissionIds.includes(p.id)),
            });
            plan = await this.planRepo.save(plan);
        }
        const user = this.userRepo.create({
            uid: (0, uuid_1.v4)(),
            username: dto.username,
            email: dto.email,
            password,
            role: user_entity_1.UserRole.EMPRESA,
            company: company ?? undefined,
            plan: plan ?? company.plan ?? null,
        });
        return this.userRepo.save(user);
    }
    async createOperator(dto) {
        if (!dto.companyId) {
            throw new common_1.BadRequestException('Empresa é obrigatória');
        }
        const company = await this.findCompany(dto.companyId);
        if (company?.plan == null) {
            throw new common_1.BadRequestException('Empresa não possui plano definido');
        }
        const password = await this.hashPassword(dto.password);
        let plan = null;
        if (dto.permissionIds?.length) {
            const companyPermissionIds = company.plan?.permissions.map(p => p.id) ?? [];
            const invalidPermissions = dto.permissionIds.filter((id) => !companyPermissionIds.includes(id));
            if (invalidPermissions.length > 0) {
                throw new common_1.BadRequestException('Permissões inválidas para esta empresa');
            }
            plan = this.planRepo.create({
                name: `custom-${dto.username}`,
                isSystem: false,
                permissions: company.plan.permissions.filter((p) => dto.permissionIds.includes(p.id)),
            });
            plan = await this.planRepo.save(plan);
        }
        const user = this.userRepo.create({
            uid: (0, uuid_1.v4)(),
            username: dto.username,
            email: dto.email,
            password,
            role: user_entity_1.UserRole.OPERADOR,
            company: company ?? undefined,
            plan,
        });
        return this.userRepo.save(user);
    }
    async findOne(uid) {
        const user = await this.userRepo.findOne({
            where: { uid },
            relations: ['company'],
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuário não encontrado');
        }
        return user;
    }
    async update(uid, dto) {
        const user = await this.findOne(uid);
        if (user.role === user_entity_1.UserRole.MASTER) {
            throw new common_1.BadRequestException('Não é permitido editar usuário MASTER');
        }
        let company = null;
        if (dto.companyId) {
            company = await this.companyRepo.findOne({
                where: { id: dto.companyId },
            });
            if (!company) {
                throw new common_1.NotFoundException('Empresa não encontrada');
            }
        }
        user.username = dto.username;
        user.email = dto.email;
        if (dto.password) {
            user.password = await bcrypt.hash(dto.password, 10);
        }
        if (dto.companyId) {
            user.company = company;
        }
        return this.userRepo.save(user);
    }
    async remove(uid) {
        const user = await this.findOne(uid);
        if (user.role === user_entity_1.UserRole.MASTER) {
            throw new common_1.BadRequestException('Não é permitido remover MASTER');
        }
        await this.userRepo.remove(user);
    }
    async getUserPermissions(userId) {
        const user = await this.userRepo.findOne({
            where: { uid: userId },
            relations: ['plan', 'plan.permissions'],
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuário não encontrado');
        }
        return user.plan?.permissions ?? [];
    }
    async findAll(page = 1, limit = 10, search) {
        const query = this.userRepo.createQueryBuilder('user');
        query
            .leftJoinAndSelect('user.company', 'company')
            .leftJoinAndSelect('user.plan', 'plan');
        if (search) {
            query.andWhere('LOWER(user.username) LIKE LOWER(:search)', {
                search: `%${search}%`,
            });
        }
        query
            .orderBy('user.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        const [users, total] = await query.getManyAndCount();
        return {
            data: users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findOneById(uid) {
        const user = await this.userRepo.findOne({
            where: { uid },
            relations: {
                company: {
                    plan: {
                        permissions: true,
                    },
                },
                plan: {
                    permissions: true,
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuário não encontrado');
        }
        return user;
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(company_entity_1.Company)),
    __param(2, (0, typeorm_1.InjectRepository)(plan_entity_1.Plan)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], UserService);
//# sourceMappingURL=user.service.js.map