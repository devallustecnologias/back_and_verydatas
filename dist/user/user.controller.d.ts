import { UserService } from './user.service';
import { CreateUserDto } from './dto/user-create.dto';
import { UpdateUserDto } from './dto/user-update.dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    createMaster(dto: CreateUserDto): Promise<import("../entities/user/user.entity").User>;
    createAdmin(dto: CreateUserDto): Promise<import("../entities/user/user.entity").User>;
    createOperator(dto: CreateUserDto): Promise<import("../entities/user/user.entity").User>;
    update(uid: string, dto: UpdateUserDto): Promise<import("../entities/user/user.entity").User>;
    remove(uid: string): Promise<void>;
    getUserPermissions(userId: string): Promise<import("../entities/permission/permission.entity").Permission[]>;
}
