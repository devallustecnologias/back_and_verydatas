import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { randomInt } from 'crypto';

import { Company } from 'src/company/company.entity';
import { User, UserRole, UserStatus } from 'src/entities/user/user.entity';
import { CreateUserDto } from './dto/user-create.dto';
import { UpdateUserDto } from './dto/user-update.dto';
import { Plan } from 'src/entities/plan/plan.entity';
import { Permission } from 'src/entities/permission/permission.entity';
import { Department } from 'src/entities/department/department.entity';
import { Cargo } from 'src/entities/cargo/cargo.entity';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        @InjectRepository(Company)
        private readonly companyRepo: Repository<Company>,

        @InjectRepository(Plan)
        private readonly planRepo: Repository<Plan>,

        @InjectRepository(Permission)
        private readonly permissionRepo: Repository<Permission>,

        @InjectRepository(Department)
        private readonly departmentRepo: Repository<Department>,

        @InjectRepository(Cargo)
        private readonly cargoRepo: Repository<Cargo>,

        private readonly mailService: MailService,
    ) { }

    private async hashPassword(password: string) {
        return bcrypt.hash(password, 10);
    }

    private generateStrongPassword(): string {
        const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const lower = 'abcdefghijkmnopqrstuvwxyz';
        const digits = '23456789';
        const all = upper + lower + digits + '@#$';
        const pick = (set: string) => set[randomInt(set.length)];
        const base = [pick(upper), pick(lower), pick(digits)];
        for (let i = base.length; i < 12; i++) base.push(pick(all));
        // Embaralha com Fisher-Yates
        for (let i = base.length - 1; i > 0; i--) {
            const j = randomInt(i + 1);
            [base[i], base[j]] = [base[j], base[i]];
        }
        return base.join('');
    }

    private async findCompany(companyId?: number) {
        if (!companyId) return null;

        const company = await this.companyRepo.findOne({
            where: { id: companyId },
            relations: {
                plan: {
                    permissions: true,
                },
            },
        });

        if (!company) {
            throw new NotFoundException('Empresa não encontrada');
        }

        return company;
    }

    private async resolveDepartmentAndCargo(
        dto: { departmentId?: number; cargoId?: number },
        companyId: number,
    ): Promise<{ department?: Department; cargo?: Cargo }> {
        let department: Department | undefined;
        let cargo: Cargo | undefined;

        if (dto.departmentId) {
            const dep = await this.departmentRepo.findOne({
                where: { id: dto.departmentId },
                relations: ['company'],
            });
            if (!dep) {
                throw new NotFoundException('Departamento não encontrado');
            }
            if (dep.company.id !== companyId) {
                throw new BadRequestException('Departamento não pertence à empresa do usuário');
            }
            department = dep;
        }

        if (dto.cargoId) {
            const car = await this.cargoRepo.findOne({
                where: { id: dto.cargoId },
                relations: ['company', 'department'],
            });
            if (!car) {
                throw new NotFoundException('Cargo não encontrado');
            }
            if (car.company.id !== companyId) {
                throw new BadRequestException('Cargo não pertence à empresa do usuário');
            }
            cargo = car;
        }

        return { department, cargo };
    }

    async createMaster(
        dto: CreateUserDto,
    ): Promise<User> {
        if (!dto.password) {
            throw new BadRequestException('Master deve ter senha definida');
        }
        const password = await this.hashPassword(
            dto.password,
        );

        const user = this.userRepo.create({
            uid: uuidv4(),
            username: dto.username,
            email: dto.email,
            password,
            cpf: dto.cpf,
            whatsapp: dto.whatsapp,
            role: UserRole.MASTER,
        });

        return this.userRepo.save(user);
    }

    private async assertUserLimit(company: { id: number; plan?: { userLimit: number } | null }): Promise<void> {
        const plan = company.plan;
        if (!plan || plan.userLimit <= 0) {
            return; // sem limite configurado
        }

        // conta usuários ativos (não-EXCLUIDO e não soft-deleted) da empresa
        const activeCount = await this.userRepo
            .createQueryBuilder('u')
            .where('u.company_id = :companyId', { companyId: company.id })
            .andWhere('u.status != :excluido', { excluido: UserStatus.EXCLUIDO })
            .andWhere('u.deleted_at IS NULL')
            .getCount();

        if (activeCount >= plan.userLimit) {
            throw new BadRequestException('Limite de usuários do plano atingido');
        }
    }

    async createAdmin(
        dto: CreateUserDto,
    ): Promise<any> {
        if (!dto.companyId) {
            throw new BadRequestException(
                'Empresa é obrigatória',
            );
        }

        const company = await this.findCompany(
            dto.companyId,
        );

        if (company?.plan == null) {
            throw new BadRequestException(
                'Empresa não possui plano definido',
            );
        }

        await this.assertUserLimit(company!);

        const plainPassword = dto.password || this.generateStrongPassword();
        const autoGenerated = !dto.password;
        const password = await this.hashPassword(plainPassword);

        let plan: Plan | null = null;

        // se veio plano customizado
        if (dto.permissionIds?.length) {
            const companyPermissionIds =
                company.plan?.permissions.map(
                    p => p.id,
                ) ?? [];

            // valida se permissões estão dentro da empresa
            const invalidPermissions =
                dto.permissionIds.filter(
                    id =>
                        !companyPermissionIds.includes(id),
                );

            if (invalidPermissions.length > 0) {
                throw new BadRequestException(
                    'Permissões inválidas para esta empresa',
                );
            }

            // monta plano customizado
            plan = this.planRepo.create({
                name: `custom-admin-${dto.username}`,
                isSystem: false,
                permissions:
                    company.plan!.permissions.filter(p =>
                        dto.permissionIds!.includes(p.id),
                    ),
            });

            plan = await this.planRepo.save(plan);
        }

        const { department, cargo } = await this.resolveDepartmentAndCargo(dto, company!.id);

        const user = this.userRepo.create({
            uid: uuidv4(),
            username: dto.username,
            email: dto.email,
            password,
            cpf: dto.cpf,
            whatsapp: dto.whatsapp,
            role: UserRole.EMPRESA,
            company: company ?? undefined,
            plan:
                plan ??
                company.plan ??
                null,
            department: department ?? null,
            cargo: cargo ?? null,
            mustChangePassword: autoGenerated,
        });

        const saved = await this.userRepo.save(user);

        let emailSent = false;
        if (autoGenerated) {
            emailSent = await this.mailService.sendPasswordEmail(
                saved.email,
                saved.username,
                plainPassword,
            );
        }

        // nunca devolver o hash; senha gerada só é exposta quando o e-mail não saiu
        const { password: _omit, ...safe } = saved as any;
        return {
            ...safe,
            ...(autoGenerated ? { emailSent } : {}),
            ...(autoGenerated && !emailSent ? { generatedPassword: plainPassword } : {}),
        };
    }

    async createOperator(dto: CreateUserDto, currentUser?: { role?: string; companyId?: number }): Promise<any> {
        if (currentUser?.role === 'empresa') {
            if (currentUser.companyId == null) {
                throw new ForbiddenException('Conta sem empresa vinculada');
            }
            if (dto.companyId != null && dto.companyId !== currentUser.companyId) {
                throw new ForbiddenException('Não é permitido criar usuário em outra empresa');
            }
            dto.companyId = currentUser.companyId;
        }

        if (!dto.companyId) {
            throw new BadRequestException('Empresa é obrigatória');
        }

        const company = await this.findCompany(dto.companyId);

        if (company?.plan == null) {
            throw new BadRequestException('Empresa não possui plano definido');
        }

        await this.assertUserLimit(company!);

        const plainPassword = dto.password || this.generateStrongPassword();
        const autoGenerated = !dto.password;
        const password = await this.hashPassword(plainPassword);

        let plan: Plan | null = null;

        // se veio plano customizado
        if (dto.permissionIds?.length) {
            const companyPermissionIds =
                company.plan?.permissions.map(p => p.id) ?? [];

            // valida se permissões estão dentro da empresa
            const invalidPermissions = dto.permissionIds.filter(
                (id) => !companyPermissionIds.includes(id),
            );

            if (invalidPermissions.length > 0) {
                throw new BadRequestException(
                    'Permissões inválidas para esta empresa',
                );
            }

            // monta plano customizado
            plan = this.planRepo.create({
                name: `custom-${dto.username}`,
                isSystem: false, //aqu apenas para diferenciar dos planos do sistema definido pelo master para nao ser listado
                permissions: company.plan!.permissions.filter((p) =>
                    dto.permissionIds!.includes(p.id),
                ),
            });

            plan = await this.planRepo.save(plan);
        }
        const { department, cargo } = await this.resolveDepartmentAndCargo(dto, company!.id);

        const user = this.userRepo.create({
            uid: uuidv4(),
            username: dto.username,
            email: dto.email,
            password,
            cpf: dto.cpf,
            whatsapp: dto.whatsapp,
            role: UserRole.OPERADOR,
            company: company ?? undefined,
            plan,
            department: department ?? null,
            cargo: cargo ?? null,
            mustChangePassword: autoGenerated,
        });

        const saved = await this.userRepo.save(user);

        let emailSent = false;
        if (autoGenerated) {
            emailSent = await this.mailService.sendPasswordEmail(
                saved.email,
                saved.username,
                plainPassword,
            );
        }

        // nunca devolver o hash; senha gerada só é exposta quando o e-mail não saiu
        const { password: _omit, ...safe } = saved as any;
        return {
            ...safe,
            ...(autoGenerated ? { emailSent } : {}),
            ...(autoGenerated && !emailSent ? { generatedPassword: plainPassword } : {}),
        };
    }
    async findOne(uid: string, currentUser?: { role?: string; userId?: string; companyId?: number }): Promise<User> {
        // §11 operador só pode ver o próprio registro
        if (currentUser && currentUser.role === 'operador' && uid !== currentUser.userId) {
            throw new ForbiddenException('Acesso negado: operador só pode visualizar o próprio perfil');
        }

        const user = await this.userRepo.findOne({
            where: { uid },
            relations: ['company', 'plan'],
        });

        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        // Empresa só pode ver usuários da própria empresa
        if (currentUser?.role === 'empresa') {
            if (currentUser.companyId == null || user.company?.id !== currentUser.companyId) {
                throw new ForbiddenException('Acesso negado: usuário pertence a outra empresa');
            }
        }

        return user;
    }

    async update(uid: string, dto: UpdateUserDto, currentUser?: { role?: string; companyId?: number }): Promise<User> {
        const user = await this.userRepo.findOne({
            where: { uid },
            relations: ['company', 'plan'],
        });

        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        // Tenant check: não-master só pode editar usuários da própria empresa
        if (currentUser && currentUser.role !== 'master') {
            if (currentUser.companyId == null || user.company?.id !== currentUser.companyId) {
                throw new ForbiddenException('Acesso negado: usuário pertence a outra empresa');
            }
        }

        // Validar se está tentando mover para outra empresa
        if (currentUser && currentUser.role !== 'master' && dto.companyId != null && dto.companyId !== currentUser.companyId) {
            throw new ForbiddenException('Apenas master pode mover usuário de empresa');
        }

        if (user.role === UserRole.MASTER) {
            throw new BadRequestException('Não é permitido editar usuário MASTER');
        }

        if (!user.plan) {
            throw new BadRequestException('Usuário não possui plano vinculado');
        }

        if (dto.companyId) {
            // Se mudar de empresa, carregar com relations e validar limite
            if (user.company?.id !== dto.companyId) {
                const company = await this.findCompany(dto.companyId);
                await this.assertUserLimit(company!);
                user.company = company;
            } else {
                // Mesma empresa, busca simples
                const company = await this.companyRepo.findOne({
                    where: { id: dto.companyId },
                });

                if (!company) {
                    throw new NotFoundException('Empresa não encontrada');
                }

                user.company = company;
            }
        }

        const targetCompanyId = user.company?.id;
        if (targetCompanyId && (dto.departmentId || dto.cargoId)) {
            const { department, cargo } = await this.resolveDepartmentAndCargo(dto, targetCompanyId);
            if (department !== undefined) user.department = department;
            if (cargo !== undefined) user.cargo = cargo;
        }

        if (dto.permissionIds) {
            const permissions = dto.permissionIds.length
                ? await this.permissionRepo.find({
                    where: { id: In(dto.permissionIds) },
                })
                : [];

            if (permissions.length !== dto.permissionIds.length) {
                throw new BadRequestException('Permissões inválidas');
            }

            // Não-master: permissões devem estar contidas no plano da empresa do usuário
            if (currentUser && currentUser.role !== 'master' && user.company) {
                const companyWithPlan = await this.findCompany(user.company.id);
                const allowedIds =
                    companyWithPlan?.plan?.permissions.map(p => p.id) ?? [];
                const outside = dto.permissionIds.filter(
                    id => !allowedIds.includes(id),
                );
                if (outside.length > 0) {
                    throw new BadRequestException(
                        'Permissões inválidas para esta empresa',
                    );
                }
            }

            // Plano compartilhado (da empresa ou do sistema): mutar afetaria todos os
            // usuários que o compartilham — cria wrapper custom individual no lugar
            const isSharedPlan =
                user.plan.isSystem || !user.plan.name.startsWith('custom-');

            if (isSharedPlan) {
                const customPlan = this.planRepo.create({
                    name: `custom-${user.username}-${user.uid.slice(0, 8)}`,
                    isSystem: false,
                    permissions,
                });
                user.plan = await this.planRepo.save(customPlan);
            } else {
                user.plan.permissions = permissions;
                await this.planRepo.save(user.plan);
            }
        }

        if (dto.username) {
            user.username = dto.username;
        }

        if (dto.email) {
            user.email = dto.email;
        }

        if (dto.cpf !== undefined) {
            user.cpf = dto.cpf;
        }

        if (dto.whatsapp !== undefined) {
            user.whatsapp = dto.whatsapp;
        }

        if (dto.password) {
            user.password = await bcrypt.hash(dto.password, 10);
        }

        return this.userRepo.save(user);
    }

    async remove(uid: string, currentUser?: { role?: string; companyId?: number }): Promise<void> {
        const user = await this.userRepo.findOne({
            where: { uid },
            relations: ['company'],
        });

        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        // Tenant check: não-master só pode remover usuários da própria empresa
        if (currentUser && currentUser.role !== 'master') {
            if (currentUser.companyId == null || user.company?.id !== currentUser.companyId) {
                throw new ForbiddenException('Acesso negado: usuário pertence a outra empresa');
            }
        }

        if (user.role === UserRole.MASTER) {
            throw new BadRequestException('Não é permitido remover MASTER');
        }

        user.status = UserStatus.EXCLUIDO;
        await this.userRepo.save(user);
        await this.userRepo.softRemove(user);
    }

    async updateStatus(
        uid: string,
        status: UserStatus,
        currentUser: { role?: string; companyId?: number },
    ): Promise<User> {
        if (status === UserStatus.EXCLUIDO) {
            throw new BadRequestException(
                'Use DELETE para excluir usuários. Este endpoint aceita apenas ATIVO, BLOQUEADO ou SUSPENSO.',
            );
        }

        const user = await this.userRepo.findOne({
            where: { uid },
            relations: ['company'],
        });

        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        if (user.role === UserRole.MASTER) {
            throw new BadRequestException('Não é permitido alterar o status de usuário MASTER');
        }

        if (currentUser.role !== UserRole.MASTER) {
            if (
                currentUser.companyId == null ||
                user.company?.id !== currentUser.companyId
            ) {
                throw new ForbiddenException('Acesso negado: usuário pertence a outra empresa');
            }
        }

        user.status = status;
        return this.userRepo.save(user);
    }
    async getUserPermissions(userId: string, currentUser?: { role?: string; userId?: string; companyId?: number }): Promise<Permission[]> {
        const user = await this.userRepo.findOne({
            where: { uid: userId },
            relations: ['plan', 'plan.permissions', 'company'],
        });

        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        // Operador só pode ver suas próprias permissões
        if (currentUser?.role === 'operador' && userId !== currentUser.userId) {
            throw new ForbiddenException('Acesso negado: operador só pode visualizar suas próprias permissões');
        }

        // Empresa só pode ver permissões de usuários da própria empresa
        if (currentUser?.role === 'empresa') {
            if (currentUser.companyId == null || user.company?.id !== currentUser.companyId) {
                throw new ForbiddenException('Acesso negado: usuário pertence a outra empresa');
            }
        }

        return user.plan?.permissions ?? [];
    }
    // user.service.ts

    async findAll(
        page = 1,
        limit = 10,
        search?: string,
        currentUser?: { role?: string; companyId?: number; userId?: string },
    ) {
        const query =
            this.userRepo.createQueryBuilder(
                'user',
            );

        query
            .leftJoinAndSelect(
                'user.company',
                'company',
            )
            .leftJoinAndSelect(
                'user.plan',
                'plan',
            );

        // TENANT SCOPING: não-master vê só sua empresa; operador vê só a si mesmo
        if (currentUser && currentUser.role === 'operador') {
            query.andWhere('user.uid = :uid', { uid: currentUser.userId });
        } else if (currentUser && currentUser.role !== 'master') {
            if (currentUser.companyId == null) {
                query.andWhere('1 = 0'); // fail-closed: conta não-master sem empresa não vê nada
            } else {
                query.andWhere('user.company_id = :companyId', {
                    companyId: currentUser.companyId,
                });
            }
        }

        // BUSCA POR NOME
        if (search) {
            query.andWhere(
                'LOWER(user.username) LIKE LOWER(:search)',
                {
                    search: `%${search}%`,
                },
            );
        }

        // PAGINAÇÃO
        query
            .orderBy(
                'user.createdAt',
                'DESC',
            )
            .skip((page - 1) * limit)
            .take(limit);

        const [users, total] =
            await query.getManyAndCount();

        return {
            data: users,
            total,
            page,
            limit,
            totalPages: Math.ceil(
                total / limit,
            ),
        };
    }
    async findOneById(uid: string): Promise<User> {
        const user = await this.userRepo.findOne({
            where: { uid },
            relations: {
                company: {
                    plan: {
                        permissions: true,
                    },
                },
                plan: {
                    permissions: true,
                },
            },
        });

        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        return user;
    }
}