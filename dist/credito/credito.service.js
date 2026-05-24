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
exports.CreditoService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const walled_entity_1 = require("../ledger/walled.entity");
const wallet_service_1 = require("../wallet/wallet.service");
const typeorm_2 = require("typeorm");
let CreditoService = class CreditoService {
    walletService;
    walletRepo;
    constructor(walletService, walletRepo) {
        this.walletService = walletService;
        this.walletRepo = walletRepo;
    }
    async addCredits(userIdOrCompanyId, amount, description) {
        if (amount <= 0) {
            throw new common_1.BadRequestException('Valor inválido');
        }
        const isCompany = !isNaN(Number(userIdOrCompanyId));
        let wallet = null;
        if (isCompany) {
            wallet = await this.walletRepo.findOneBy({
                companyId: Number(userIdOrCompanyId),
            });
        }
        else {
            wallet = await this.walletRepo.findOneBy({
                userId: userIdOrCompanyId,
            });
        }
        if (!wallet) {
            wallet = this.walletRepo.create({
                type: isCompany ? 'COMPANY' : 'USER',
                companyId: isCompany
                    ? Number(userIdOrCompanyId)
                    : undefined,
                userId: !isCompany
                    ? userIdOrCompanyId
                    : undefined,
            });
            wallet = await this.walletRepo.save(wallet);
        }
        return this.walletService.addCredits(wallet.id, amount, description);
    }
};
exports.CreditoService = CreditoService;
exports.CreditoService = CreditoService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(walled_entity_1.Wallet)),
    __metadata("design:paramtypes", [wallet_service_1.WalletService,
        typeorm_2.Repository])
], CreditoService);
//# sourceMappingURL=credito.service.js.map