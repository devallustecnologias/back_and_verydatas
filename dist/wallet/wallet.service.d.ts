import { Repository, DataSource } from 'typeorm';
import { Company } from 'src/company/company.entity';
import { User } from 'src/entities/user/user.entity';
import { Ledger } from 'src/ledger/ledger.entity';
import { CreateWalletDto } from './dto/wallet.dto';
import { Wallet } from 'src/ledger/walled.entity';
export declare class WalletService {
    private readonly walletRepo;
    private readonly companyRepo;
    private readonly userRepo;
    private readonly dataSource;
    constructor(walletRepo: Repository<Wallet>, companyRepo: Repository<Company>, userRepo: Repository<User>, dataSource: DataSource);
    createWallet(dto: CreateWalletDto): Promise<Wallet>;
    getBalance(walletId: string): Promise<number>;
    getLedger(walletId: string): Promise<Ledger[]>;
    transfer(fromWalletId: string, toWalletId: string, amount: number): Promise<{
        success: boolean;
        from: string;
        to: string;
        amount: number;
    }>;
}
