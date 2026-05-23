import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from './company.entity';
export declare class CompanyController {
    private readonly companyService;
    constructor(companyService: CompanyService);
    findCompaniesWithBalance(page?: string, limit?: string, search?: string): Promise<{
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
    findCreditDetails(userIdOrCompanyId: string, historyPage?: string, historyLimit?: string): Promise<{
        company: Company | null;
        user: import("../entities/user/user.entity").User | null;
        wallet: null;
        totalCredit: number;
        availableCredit: number;
        history: {
            data: never[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        totalDebit?: undefined;
    } | {
        company: Company | null;
        user: import("../entities/user/user.entity").User | null;
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
            data: import("../ledger/ledger.entity").Ledger[];
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
    getCompanyPermissions(id: number): Promise<import("../entities/permission/permission.entity").Permission[]>;
}
