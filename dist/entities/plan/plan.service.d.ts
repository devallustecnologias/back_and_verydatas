import { Plan } from './plan.entity';
import { Repository } from 'typeorm';
import { Permission } from '../permission/permission.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { User } from '../user/user.entity';
export declare class PlanService {
    private readonly planRepo;
    private readonly permissionRepo;
    private readonly userRepo;
    constructor(planRepo: Repository<Plan>, permissionRepo: Repository<Permission>, userRepo: Repository<User>);
    findAll(page?: number, limit?: number, search?: string): Promise<{
        data: Plan[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: number): Promise<Plan>;
    create(dto: CreatePlanDto): Promise<Plan>;
    update(id: number, dto: UpdatePlanDto): Promise<Plan>;
    remove(id: number): Promise<void>;
    assignPlanToUser(userId: string, planId: number): Promise<void>;
}
