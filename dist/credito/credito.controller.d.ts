import { CreditoService } from './credito.service';
import { AddCreditsDto } from './dto/add.credito.dto';
export declare class CreditoController {
    private readonly creditoService;
    constructor(creditoService: CreditoService);
    addCredits(dto: AddCreditsDto): Promise<{
        success: boolean;
        walletId: string;
        amount: number;
        ledger: {
            wallet: import("../ledger/walled.entity").Wallet;
            amount: number;
            type: import("../ledger/ledger.entity").LedgerType.CREDIT;
            origin: import("../ledger/ledger.entity").LedgerOrigin.AJUSTE;
            description: string;
        } & import("../ledger/ledger.entity").Ledger;
    }>;
}
