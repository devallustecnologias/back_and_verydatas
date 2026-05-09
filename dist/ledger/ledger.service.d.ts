import { Ledger } from './ledger.entity';
import { Repository } from 'typeorm';
import { Company } from '../company/company.entity';
import { User } from 'src/entities/user/user.entity';
import { CreateLedgerDto } from './dtos/create-ledger.dto';
import { Wallet } from './walled.entity';
export declare class LedgerService {
    private readonly ledgerRepo;
    private readonly companyRepo;
    private readonly userRepo;
    private readonly walletRepo;
    constructor(ledgerRepo: Repository<Ledger>, companyRepo: Repository<Company>, userRepo: Repository<User>, walletRepo: Repository<Wallet>);
    findAll(): Promise<Ledger[]>;
    findOne(id: number): Promise<Ledger>;
    create(dto: CreateLedgerDto): Promise<Ledger>;
    remove(id: number): Promise<void>;
}
