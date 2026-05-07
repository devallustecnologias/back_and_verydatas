import { Repository } from 'typeorm';
import { Company } from 'src/company/company.entity';
import { User } from 'src/entities/user/user.entity';
import { CreateUserDto } from './dto/user-create.dto';
import { UpdateUserDto } from './dto/user-update.dto';
import { Plan } from 'src/entities/plan/plan.entity';
import { Permission } from 'src/entities/permission/permission.entity';
export declare class UserService {
    private readonly userRepo;
    private readonly companyRepo;
    private readonly planRepo;
    constructor(userRepo: Repository<User>, companyRepo: Repository<Company>, planRepo: Repository<Plan>);
    private hashPassword;
    private findCompany;
    createMaster(dto: CreateUserDto): Promise<User>;
    createAdmin(dto: CreateUserDto): Promise<User>;
    createOperator(dto: CreateUserDto): Promise<User>;
    findOne(uid: string): Promise<User>;
    update(uid: string, dto: UpdateUserDto): Promise<User>;
    remove(uid: string): Promise<void>;
    getUserPermissions(userId: string): Promise<Permission[]>;
}
