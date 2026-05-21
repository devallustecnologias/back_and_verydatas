import { Company } from './company.entity';
import { Repository } from 'typeorm';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Plan } from 'src/entities/plan/plan.entity';
import { Wallet } from 'src/ledger/walled.entity';
import { Ledger } from 'src/ledger/ledger.entity';
export declare class CompanyService {
    private readonly companyRepo;
    private readonly planRepo;
    private readonly walletRepo;
    private readonly ledgerRepo;
    constructor(companyRepo: Repository<Company>, planRepo: Repository<Plan>, walletRepo: Repository<Wallet>, ledgerRepo: Repository<Ledger>);
    findCompaniesWithBalance(): Promise<{
        id: number;
        name: string;
        domain: string;
        logoUrl: string | undefined;
        balance: number;
    }[]>;
    findAll(): Promise<Company[]>;
    findOne(id: number): Promise<Company>;
    create(dto: CreateCompanyDto): Promise<Company>;
    update(id: number, dto: UpdateCompanyDto): Promise<Company>;
    remove(id: number): Promise<void>;
    getPermissions(companyId: number): Promise<import("../entities/permission/permission.entity").Permission[]>;
}
