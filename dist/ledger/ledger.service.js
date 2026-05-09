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
exports.LedgerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ledger_entity_1 = require("./ledger.entity");
const typeorm_2 = require("typeorm");
const company_entity_1 = require("../company/company.entity");
const user_entity_1 = require("../entities/user/user.entity");
const walled_entity_1 = require("./walled.entity");
let LedgerService = class LedgerService {
    ledgerRepo;
    companyRepo;
    userRepo;
    walletRepo;
    constructor(ledgerRepo, companyRepo, userRepo, walletRepo) {
        this.ledgerRepo = ledgerRepo;
        this.companyRepo = companyRepo;
        this.userRepo = userRepo;
        this.walletRepo = walletRepo;
    }
    async findAll() {
        return this.ledgerRepo.find({
            relations: ['company', 'user'],
            order: { createdAt: 'DESC' },
        });
    }
    async findOne(id) {
        const ledger = await this.ledgerRepo.findOne({
            where: { id },
            relations: ['company', 'user'],
        });
        if (!ledger) {
            throw new common_1.NotFoundException('Registro não encontrado');
        }
        return ledger;
    }
    async create(dto) {
        if (dto.amount <= 0) {
            throw new common_1.BadRequestException('Valor deve ser maior que zero');
        }
        const wallet = await this.walletRepo.findOne({
            where: { id: dto.walletId },
        });
        if (!wallet) {
            throw new common_1.NotFoundException('Wallet não encontrada');
        }
        const ledger = this.ledgerRepo.create({
            amount: dto.amount,
            type: dto.type,
            description: dto.description,
            origin: dto.origin,
            referenceId: dto.referenceId,
            wallet,
        });
        return this.ledgerRepo.save(ledger);
    }
    async remove(id) {
        const ledger = await this.findOne(id);
        throw new common_1.BadRequestException('Não é permitido remover registros do ledger');
    }
};
exports.LedgerService = LedgerService;
exports.LedgerService = LedgerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ledger_entity_1.Ledger)),
    __param(1, (0, typeorm_1.InjectRepository)(company_entity_1.Company)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(walled_entity_1.Wallet)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], LedgerService);
//# sourceMappingURL=ledger.service.js.map