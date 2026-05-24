import { Company } from './company.entity';
import { Repository } from 'typeorm';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Plan } from 'src/entities/plan/plan.entity';
import { Wallet } from 'src/ledger/walled.entity';
import { Ledger } from 'src/ledger/ledger.entity';
import { User } from 'src/entities/user/user.entity';
export declare class CompanyService {
    private readonly companyRepo;
    private readonly planRepo;
    private readonly walletRepo;
    private readonly ledgerRepo;
    private readonly userRepo;
    constructor(companyRepo: Repository<Company>, planRepo: Repository<Plan>, walletRepo: Repository<Wallet>, ledgerRepo: Repository<Ledger>, userRepo: Repository<User>);
    findCompaniesWithBalance(page?: number, limit?: number, search?: string): Promise<{
        data: {
            id: number;
            name: string;
            domain: string;
            totalCredit: number;
            availableCredit: number;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findUsersWithBalance(page?: number, limit?: number, search?: string): Promise<{
        data: {
            uid: string;
            username: string;
            email: string;
            role: import("src/entities/user/user.entity").UserRole;
            company: {
                id: number;
                name: string;
                domain: string;
            } | null;
            totalCredit: number;
            availableCredit: number;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findCreditDetailsCompany(companyId: string, historyPage?: number, historyLimit?: number): Promise<{
        company: Company | null;
        wallet: null;
        totalCredit: number;
        totalDebit: number;
        availableCredit: number;
        history: {
            data: never[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    } | {
        company: Company | null;
        wallet: {
            id: string;
            type: "COMPANY" | "USER";
            companyId: number | undefined;
            userId: string | undefined;
        };
        totalCredit: number;
        totalDebit: number;
        availableCredit: number;
        history: {
            data: Ledger[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findUserCreditDetails(userId: string, historyPage?: number, historyLimit?: number): Promise<{
        user: User | null;
        wallet: null;
        totalCredit: number;
        totalDebit: number;
        availableCredit: number;
        history: {
            data: never[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    } | {
        user: User | null;
        wallet: {
            id: string;
            type: "COMPANY" | "USER";
            companyId: number | undefined;
            userId: string | undefined;
        };
        totalCredit: number;
        totalDebit: number;
        availableCredit: number;
        history: {
            data: Ledger[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findAll(): Promise<Company[]>;
    findOne(id: number): Promise<Company>;
    create(dto: CreateCompanyDto): Promise<Company>;
    update(id: number, dto: UpdateCompanyDto): Promise<Company>;
    remove(id: number): Promise<void>;
    getPermissions(companyId: number): Promise<import("../entities/permission/permission.entity").Permission[]>;
}
