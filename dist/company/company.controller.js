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
exports.CompanyController = void 0;
const common_1 = require("@nestjs/common");
const company_service_1 = require("./company.service");
const create_company_dto_1 = require("./dto/create-company.dto");
const update_company_dto_1 = require("./dto/update-company.dto");
const swagger_1 = require("@nestjs/swagger");
let CompanyController = class CompanyController {
    companyService;
    constructor(companyService) {
        this.companyService = companyService;
    }
    async findUsersWithBalance(page = '1', limit = '10', search) {
        return this.companyService.findUsersWithBalance(Number(page), Number(limit), search);
    }
    async findCompaniesWithBalance(page = '1', limit = '10', search) {
        return this.companyService.findCompaniesWithBalance(Number(page), Number(limit), search);
    }
    findUserCreditDetails(userId, historyPage = '1', historyLimit = '10') {
        return this.companyService.findUserCreditDetails(userId, Number(historyPage), Number(historyLimit));
    }
    findCreditDetails(companyId, historyPage = '1', historyLimit = '10') {
        return this.companyService.findCreditDetailsCompany(companyId, Number(historyPage), Number(historyLimit));
    }
    findAll() {
        return this.companyService.findAll();
    }
    findOne(id) {
        return this.companyService.findOne(Number(id));
    }
    create(dto) {
        return this.companyService.create(dto);
    }
    update(id, dto) {
        return this.companyService.update(Number(id), dto);
    }
    remove(id) {
        return this.companyService.remove(Number(id));
    }
    getCompanyPermissions(id) {
        return this.companyService.getPermissions(Number(id));
    }
};
exports.CompanyController = CompanyController;
__decorate([
    (0, common_1.Get)('user/balances'),
    (0, swagger_1.ApiOperation)({
        summary: 'Lista usuários com saldo',
        description: 'Retorna usuários paginados junto com o saldo da carteira.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'page',
        required: false,
        type: Number,
        example: 1,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        type: Number,
        example: 10,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'search',
        required: false,
        type: String,
        example: 'Lucas',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista paginada de usuários com saldo',
        schema: {
            example: {
                data: [
                    {
                        uid: 'd4f64555-1eb2-457f-a9b7-bf56711ce65f',
                        username: 'Lucas',
                        email: 'lucas@email.com',
                        role: 'operador',
                        company: {
                            id: 1,
                            name: 'Minha Empresa LTDA',
                            domain: 'minhaempresa',
                        },
                        totalCredit: 1000,
                        availableCredit: 750,
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
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "findUsersWithBalance", null);
__decorate([
    (0, common_1.Get)('balances'),
    (0, swagger_1.ApiOperation)({
        summary: 'Lista empresas com saldo',
        description: 'Retorna empresas paginadas junto com o saldo da carteira.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'page',
        required: false,
        type: Number,
        example: 1,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        type: Number,
        example: 10,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'search',
        required: false,
        type: String,
        example: 'Microsoft',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista paginada de empresas com saldo',
    }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "findCompaniesWithBalance", null);
__decorate([
    (0, common_1.Get)('historic-user/:userId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Buscar histórico de créditos do usuário',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Detalhes da carteira do usuário com saldo e histórico paginado',
        schema: {
            example: {
                user: {
                    uid: '6e545637-9adf-4235-abda-0465765b8ea2',
                    username: 'afranio',
                    email: 'afranio@gmail.com',
                    role: 'operador',
                    company: {
                        id: 1,
                        name: 'Minha Empresa LTDA',
                        domain: 'minhaempresa',
                    },
                },
                wallet: {
                    id: '3d8d2d11-cf9d-4f2e-9c42-8cb0e5d51a22',
                    type: 'USER',
                    companyId: null,
                    userId: '6e545637-9adf-4235-abda-0465765b8ea2',
                },
                totalCredit: 1000,
                totalDebit: 200,
                availableCredit: 800,
                history: {
                    data: [
                        {
                            id: 12,
                            amount: 1000,
                            type: 'CREDIT',
                            description: 'Crédito recebido da empresa',
                            origin: 'TRANSFER',
                            referenceId: null,
                            createdAt: '2026-05-23T18:20:00.000Z',
                        },
                    ],
                    total: 1,
                    page: 1,
                    limit: 10,
                    totalPages: 1,
                },
            },
        },
    }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Query)('historyPage')),
    __param(2, (0, common_1.Query)('historyLimit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "findUserCreditDetails", null);
__decorate([
    (0, common_1.Get)('historic-company/:companyId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Buscar histórico de créditos da empresa',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Detalhes da carteira da empresa com saldo e histórico paginado',
        schema: {
            example: {
                company: {
                    id: 1,
                    name: 'Minha Empresa LTDA',
                    domain: 'minhaempresa',
                },
                wallet: {
                    id: '3d8d2d11-cf9d-4f2e-9c42-8cb0e5d51a22',
                    type: 'COMPANY',
                    companyId: 1,
                    userId: null,
                },
                totalCredit: 5000,
                totalDebit: 1200,
                availableCredit: 3800,
                history: {
                    data: [
                        {
                            id: 12,
                            amount: 1000,
                            type: 'CREDIT',
                            description: 'Crédito adicionado manualmente',
                            origin: 'AJUSTE',
                            referenceId: null,
                            createdAt: '2026-05-23T18:20:00.000Z',
                        },
                        {
                            id: 11,
                            amount: 200,
                            type: 'DEBIT',
                            description: 'Consumo da operação XYZ',
                            origin: 'CONSUMO',
                            referenceId: 'OP-9281',
                            createdAt: '2026-05-23T17:10:00.000Z',
                        },
                    ],
                    total: 2,
                    page: 1,
                    limit: 10,
                    totalPages: 1,
                },
            },
        },
    }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('historyPage')),
    __param(2, (0, common_1.Query)('historyLimit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "findCreditDetails", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar empresas' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de empresas',
        schema: {
            example: [
                {
                    id: 1,
                    name: 'Minha Empresa',
                    domain: 'minhaempresa',
                    logoUrl: null,
                    users: [],
                },
            ],
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Buscar empresa por ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Criar empresa' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Empresa criada',
        schema: {
            example: {
                id: 1,
                name: 'Minha Empresa',
                domain: 'minhaempresa',
                logoUrl: 'https://site.com/logo.png',
                users: [],
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_company_dto_1.CreateCompanyDto]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar empresa' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_company_dto_1.UpdateCompanyDto]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Remover empresa' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/permissions'),
    (0, swagger_1.ApiOperation)({ summary: 'Listar permissões da empresa' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Permissões da empresa',
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "getCompanyPermissions", null);
exports.CompanyController = CompanyController = __decorate([
    (0, swagger_1.ApiTags)('Companies'),
    (0, common_1.Controller)('companies'),
    __metadata("design:paramtypes", [company_service_1.CompanyService])
], CompanyController);
//# sourceMappingURL=company.controller.js.map