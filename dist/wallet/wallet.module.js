"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletModule = void 0;
const typeorm_1 = require("@nestjs/typeorm");
const company_entity_1 = require("../company/company.entity");
const permission_entity_1 = require("../entities/permission/permission.entity");
const plan_entity_1 = require("../entities/plan/plan.entity");
const user_entity_1 = require("../entities/user/user.entity");
const wallet_controller_1 = require("./wallet.controller");
const wallet_service_1 = require("./wallet.service");
const common_1 = require("@nestjs/common");
const walled_entity_1 = require("../ledger/walled.entity");
let WalletModule = class WalletModule {
};
exports.WalletModule = WalletModule;
exports.WalletModule = WalletModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, plan_entity_1.Plan, permission_entity_1.Permission, company_entity_1.Company, walled_entity_1.Wallet]),],
        controllers: [
            wallet_controller_1.WalletController,
        ],
        providers: [
            wallet_service_1.WalletService,
        ],
    })
], WalletModule);
//# sourceMappingURL=wallet.module.js.map