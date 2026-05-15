import { PermissionService } from './permission.service';
import { Permission } from './permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
export declare class PermissionController {
    private readonly permissionService;
    constructor(permissionService: PermissionService);
    findAll(page?: number, limit?: number, search?: string): Promise<{
        data: Permission[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: number): Promise<Permission>;
    create(dto: CreatePermissionDto): Promise<Permission>;
    remove(id: number): Promise<void>;
    update(id: number, dto: UpdatePermissionDto): Promise<Permission>;
}
