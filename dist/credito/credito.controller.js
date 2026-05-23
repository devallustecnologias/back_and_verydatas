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
exports.CreditoController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const credito_service_1 = require("./credito.service");
const add_credito_dto_1 = require("./dto/add.credito.dto");
let CreditoController = class CreditoController {
    creditoService;
    constructor(creditoService) {
        this.creditoService = creditoService;
    }
    addCredits(dto) {
        return this.creditoService.addCredits(dto.userIdOrCompanyId, dto.amount, dto.description);
    }
};
exports.CreditoController = CreditoController;
__decorate([
    (0, common_1.Post)('add'),
    (0, swagger_1.ApiOperation)({
        summary: 'Adicionar créditos para usuário ou empresa',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [add_credito_dto_1.AddCreditsDto]),
    __metadata("design:returntype", void 0)
], CreditoController.prototype, "addCredits", null);
exports.CreditoController = CreditoController = __decorate([
    (0, swagger_1.ApiTags)('Créditos'),
    (0, common_1.Controller)('creditos'),
    __metadata("design:paramtypes", [credito_service_1.CreditoService])
], CreditoController);
//# sourceMappingURL=credito.controller.js.map