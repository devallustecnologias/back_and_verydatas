"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerModule = void 0;
const typeorm_1 = require("@nestjs/typeorm");
const ledger_controller_1 = require("./ledger.controller");
const ledger_service_1 = require("./ledger.service");
const common_1 = require("@nestjs/common");
const ledger_entity_1 = require("./ledger.entity");
const company_entity_1 = require("../company/company.entity");
const user_entity_1 = require("../entities/user/user.entity");
const walled_entity_1 = require("./walled.entity");
let LedgerModule = class LedgerModule {
};
exports.LedgerModule = LedgerModule;
exports.LedgerModule = LedgerModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([ledger_entity_1.Ledger, company_entity_1.Company, user_entity_1.User, walled_entity_1.Wallet]),],
        controllers: [
            ledger_controller_1.LedgerController,
        ],
        providers: [
            ledger_service_1.LedgerService,
        ],
    })
], LedgerModule);
//# sourceMappingURL=ledger.module.js.map