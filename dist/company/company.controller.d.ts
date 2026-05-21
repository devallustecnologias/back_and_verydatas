import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from './company.entity';
export declare class CompanyController {
    private readonly companyService;
    constructor(companyService: CompanyService);
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
    getCompanyPermissions(id: number): Promise<import("../entities/permission/permission.entity").Permission[]>;
}
