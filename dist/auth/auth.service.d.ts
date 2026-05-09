import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../entities/user/user.entity';
import { Permission } from 'src/entities/permission/permission.entity';
import { UserService } from 'src/user/user.service';
export declare class AuthService {
    private jwtService;
    private userRepository;
    private permissionsRepository;
    private readonly userService;
    constructor(jwtService: JwtService, userRepository: Repository<User>, permissionsRepository: Repository<Permission>, userService: UserService);
    register(data: {
        username: string;
        email: string;
        password: string;
        profile?: string;
        situacao?: string;
    }): Promise<any>;
    login(email: string, password: string): Promise<{
        accessToken: string;
    }>;
}
