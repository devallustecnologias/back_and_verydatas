import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/wallet.dto';
import { TransferWalletDto } from './dto/tranfer.dto';
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
    getBalance(id: string): Promise<number>;
    getLedger(id: string): Promise<import("../ledger/ledger.entity").Ledger[]>;
}
