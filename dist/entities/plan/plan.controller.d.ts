import { PlanService } from './plan.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Plan } from './plan.entity';
export declare class PlanController {
    private readonly planService;
    constructor(planService: PlanService);
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
