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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ledger = exports.LedgerOrigin = exports.LedgerType = void 0;
const typeorm_1 = require("typeorm");
const walled_entity_1 = require("./walled.entity");
var LedgerType;
(function (LedgerType) {
    LedgerType["CREDIT"] = "CREDIT";
    LedgerType["DEBIT"] = "DEBIT";
})(LedgerType || (exports.LedgerType = LedgerType = {}));
var LedgerOrigin;
(function (LedgerOrigin) {
    LedgerOrigin["TRANSFER"] = "TRANSFER";
    LedgerOrigin["CONSUMO"] = "CONSUMO";
    LedgerOrigin["AJUSTE"] = "AJUSTE";
})(LedgerOrigin || (exports.LedgerOrigin = LedgerOrigin = {}));
let Ledger = class Ledger {
    id;
    amount;
    type;
    description;
    origin;
    referenceId;
    wallet;
    createdAt;
};
exports.Ledger = Ledger;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Ledger.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('int'),
    __metadata("design:type", Number)
], Ledger.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: LedgerType }),
    __metadata("design:type", String)
], Ledger.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Ledger.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: LedgerOrigin, nullable: true }),
    __metadata("design:type", String)
], Ledger.prototype, "origin", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Ledger.prototype, "referenceId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => walled_entity_1.Wallet),
    __metadata("design:type", walled_entity_1.Wallet)
], Ledger.prototype, "wallet", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Ledger.prototype, "createdAt", void 0);
exports.Ledger = Ledger = __decorate([
    (0, typeorm_1.Entity)()
], Ledger);
//# sourceMappingURL=ledger.entity.js.map