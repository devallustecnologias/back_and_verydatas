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
exports.PlanController = void 0;
const common_1 = require("@nestjs/common");
const plan_service_1 = require("./plan.service");
const swagger_1 = require("@nestjs/swagger");
const create_plan_dto_1 = require("./dto/create-plan.dto");
const update_plan_dto_1 = require("./dto/update-plan.dto");
let PlanController = class PlanController {
    planService;
    constructor(planService) {
        this.planService = planService;
    }
    findAll(page, limit, search) {
        return this.planService.findAll(Number(page) || 1, Number(limit) || 10, search);
    }
    findOne(id) {
        return this.planService.findOne(Number(id));
    }
    create(dto) {
        return this.planService.create(dto);
    }
    update(id, dto) {
        return this.planService.update(Number(id), dto);
    }
    remove(id) {
        return this.planService.remove(Number(id));
    }
    assignPlanToUser(userId, planId) {
        return this.planService.assignPlanToUser(userId, Number(planId));
    }
};
exports.PlanController = PlanController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar planos' }),
    (0, swagger_1.ApiQuery)({
        name: 'page',
        required: false,
        example: 1,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        example: 10,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'search',
        required: false,
        example: 'pro',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de planos',
        schema: {
            example: {
                data: [
                    {
                        id: 1,
                        name: 'Plano Básico',
                        isSystem: true,
                        permissions: [
                            {
                                id: 1,
                                key: 'dashboard',
                                name: 'Dashboard',
                                creditCost: 0,
                            },
                        ],
                    },
                ],
                total: 1,
                page: 1,
                limit: 10,
                totalPages: 1,
            },
        },
    }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", void 0)
], PlanController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Buscar plano por ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Plano encontrado',
        schema: {
            example: {
                id: 1,
                name: 'Plano Básico',
                isSystem: true,
                permissions: [
                    { id: 1, key: 'dashboard', name: 'Dashboard' },
                ],
            },
        },
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Criar plano' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Plano criado',
        schema: {
            example: {
                id: 2,
                name: 'Plano Pro',
                isSystem: false,
                permissions: [
                    { id: 1, key: 'consulta.cpf', name: 'Consulta CPF' },
                    { id: 2, key: 'usuarios.create', name: 'Criar usuários' },
                ],
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_plan_dto_1.CreatePlanDto]),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar plano' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_plan_dto_1.UpdatePlanDto]),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Remover plano' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Plano removido com sucesso',
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], PlanController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':planId/assign/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Atribuir plano a um usuário' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Plano atribuído com sucesso',
    }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('planId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], PlanController.prototype, "assignPlanToUser", null);
exports.PlanController = PlanController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [plan_service_1.PlanService])
], PlanController);
//# sourceMappingURL=plan.controller.js.map