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
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const company_entity_1 = require("../company/company.entity");
const user_entity_1 = require("../entities/user/user.entity");
const ledger_entity_1 = require("../ledger/ledger.entity");
const walled_entity_1 = require("../ledger/walled.entity");
let WalletService = class WalletService {
    walletRepo;
    companyRepo;
    userRepo;
    dataSource;
    constructor(walletRepo, companyRepo, userRepo, dataSource) {
        this.walletRepo = walletRepo;
        this.companyRepo = companyRepo;
        this.userRepo = userRepo;
        this.dataSource = dataSource;
    }
    async createWallet(dto) {
        let company = null;
        let user = null;
        if (dto.companyId) {
            company = await this.companyRepo.findOneBy({ id: dto.companyId });
            if (!company) {
                throw new common_1.NotFoundException('Empresa não encontrada');
            }
            const exists = await this.walletRepo.findOneBy({
                companyId: dto.companyId,
            });
            if (exists) {
                throw new common_1.BadRequestException('Empresa já possui wallet');
            }
        }
        if (dto.userId) {
            user = await this.userRepo.findOneBy({ uid: dto.userId });
            if (!user) {
                throw new common_1.NotFoundException('Usuário não encontrado');
            }
            const exists = await this.walletRepo.findOneBy({
                userId: dto.userId,
            });
            if (exists) {
                throw new common_1.BadRequestException('Usuário já possui wallet');
            }
        }
        if ((company && user) || (!company && !user)) {
            throw new common_1.BadRequestException('Wallet deve ser de empresa OU usuário');
        }
        const wallet = this.walletRepo.create({
            type: company ? 'COMPANY' : 'USER',
            companyId: company?.id,
            userId: user?.uid,
        });
        return this.walletRepo.save(wallet);
    }
    async getBalance(walletId) {
        const result = await this.walletRepo.manager
            .getRepository(ledger_entity_1.Ledger)
            .createQueryBuilder('l')
            .select(`
        COALESCE(SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount ELSE 0 END), 0)
        -
        COALESCE(SUM(CASE WHEN l.type = 'DEBIT' THEN l.amount ELSE 0 END), 0)
      `, 'balance')
            .where('l.walletId = :walletId', { walletId })
            .getRawOne();
        return Number(result.balance || 0);
    }
    async getLedger(walletId) {
        return this.walletRepo.manager.getRepository(ledger_entity_1.Ledger).find({
            where: { wallet: { id: walletId } },
            order: { createdAt: 'DESC' },
        });
    }
    async transfer(fromWalletId, toWalletId, amount) {
        if (amount <= 0) {
            throw new common_1.BadRequestException('Valor inválido');
        }
        return this.dataSource.transaction(async (manager) => {
            const walletRepo = manager.getRepository(walled_entity_1.Wallet);
            const ledgerRepo = manager.getRepository(ledger_entity_1.Ledger);
            const fromWallet = await walletRepo.findOneBy({
                id: fromWalletId,
            });
            const toWallet = await walletRepo.findOneBy({
                id: toWalletId,
            });
            if (!fromWallet || !toWallet) {
                throw new common_1.NotFoundException('Wallet não encontrada');
            }
            const balanceResult = await ledgerRepo
                .createQueryBuilder('l')
                .select(`
          COALESCE(SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount ELSE 0 END), 0)
          -
          COALESCE(SUM(CASE WHEN l.type = 'DEBIT' THEN l.amount ELSE 0 END), 0)
        `, 'balance')
                .where('l.walletId = :id', { id: fromWalletId })
                .getRawOne();
            const balance = Number(balanceResult.balance || 0);
            if (balance < amount) {
                throw new common_1.BadRequestException('Saldo insuficiente');
            }
            await ledgerRepo.save({
                wallet: fromWallet,
                amount,
                type: ledger_entity_1.LedgerType.DEBIT,
                origin: ledger_entity_1.LedgerOrigin.TRANSFER,
                description: `Transferência enviada para ${toWalletId}`,
            });
            await ledgerRepo.save({
                wallet: toWallet,
                amount,
                type: ledger_entity_1.LedgerType.CREDIT,
                origin: ledger_entity_1.LedgerOrigin.TRANSFER,
                description: `Transferência recebida de ${fromWalletId}`,
            });
            return {
                success: true,
                from: fromWalletId,
                to: toWalletId,
                amount,
            };
        });
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(walled_entity_1.Wallet)),
    __param(1, (0, typeorm_1.InjectRepository)(company_entity_1.Company)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], WalletService);
//# sourceMappingURL=wallet.service.js.map