import { Wallet } from 'src/ledger/walled.entity';
import { WalletService } from 'src/wallet/wallet.service';
import { Repository } from 'typeorm';
export declare class CreditoService {
    private readonly walletService;
    private readonly walletRepo;
    constructor(walletService: WalletService, walletRepo: Repository<Wallet>);
    addCredits(userIdOrCompanyId: string, amount: number, description?: string): Promise<{
        success: boolean;
        walletId: string;
        amount: number;
        ledger: {
            wallet: Wallet;
            amount: number;
            type: import("../ledger/ledger.entity").LedgerType.CREDIT;
            origin: import("../ledger/ledger.entity").LedgerOrigin.AJUSTE;
            description: string;
        } & import("../ledger/ledger.entity").Ledger;
    }>;
}
