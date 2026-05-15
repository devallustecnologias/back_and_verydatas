import { Permission } from './permission.entity';
import { Repository } from 'typeorm';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
export declare class PermissionService {
    private readonly permissionRepo;
    constructor(permissionRepo: Repository<Permission>);
    findOne(id: number): Promise<Permission>;
    create(dto: CreatePermissionDto): Promise<Permission>;
    remove(id: number): Promise<void>;
    findAll(page?: number, limit?: number, search?: string): Promise<{
        data: Permission[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    update(id: number, dto: UpdatePermissionDto): Promise<Permission>;
}
