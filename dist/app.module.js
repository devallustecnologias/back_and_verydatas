"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const wallet_module_1 = require("./wallet/wallet.module");
const ledger_module_1 = require("./ledger/ledger.module");
const company_module_1 = require("./company/company.module");
const permission_module_1 = require("./entities/permission/permission.module");
const plan_module_1 = require("./entities/plan/plan.module");
const user_module_1 = require("./user/user.module");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("./auth/auth.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            wallet_module_1.WalletModule,
            ledger_module_1.LedgerModule,
            company_module_1.CompanyModule,
            permission_module_1.PermissionModule,
            plan_module_1.PlanModule,
            user_module_1.UserModule,
            auth_module_1.AuthModule,
            config_1.ConfigModule.forRoot({
                isGlobal: true
            }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'mysql',
                driver: require('mysql2'),
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '', 10) || 3306,
                username: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'test',
                autoLoadEntities: true,
                synchronize: true,
            }),
        ],
        controllers: [],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map