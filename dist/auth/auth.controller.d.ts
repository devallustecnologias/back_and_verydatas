import { AuthService } from "./auth.service";
import { User } from "../entities/user/user.entity";
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(data: {
        username: string;
        email: string;
        password: string;
        role: "master" | "empresa" | "operador";
    }): Promise<User>;
    login(data: {
        email: string;
        password: string;
    }): Promise<any>;
    me(req: any): User;
}
