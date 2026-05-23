import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/wallet.dto';
import { TransferWalletDto } from './dto/tranfer.dto';
import { AddCreditsWalletDto } from './dto/add.credit.wallet.dto';
export declare class WalletController {
    private readonly walletService;
    constructor(walletService: WalletService);
    create(dto: CreateWalletDto): Promise<import("../ledger/walled.entity").Wallet>;
    transfer(dto: TransferWalletDto): Promise<{
        success: boolean;
        from: string;
        to: string;
        amount: number;
    }>;
    addCredits(dto: AddCreditsWalletDto): Promise<{
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
    getBalance(id: string): Promise<number>;
    getLedger(id: string): Promise<import("../ledger/ledger.entity").Ledger[]>;
}
