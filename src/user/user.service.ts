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

import { Company } from 'src/company/company.entity';
import { User, UserRole, UserStatus } from 'src/entities/user/user.entity';
import { CreateUserDto } from './dto/user-create.dto';
import { UpdateUserDto } from './dto/user-update.dto';
import { Plan } from 'src/entities/plan/plan.entity';
import { Permission } from 'src/entities/permission/permission.entity';
import { Department } from 'src/entities/department/department.entity';
import { Cargo } from 'src/entities/cargo/cargo.entity';

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
    ) { }

    private async hashPassword(password: string) {
        return bcrypt.hash(password, 10);
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
    ): Promise<User> {
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

        const password = await this.hashPassword(
            dto.password,
        );

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
        });

        return this.userRepo.save(user);
    }

    async createOperator(dto: CreateUserDto): Promise<User> {
        if (!dto.companyId) {
            throw new BadRequestException('Empresa é obrigatória');
        }

        const company = await this.findCompany(dto.companyId);

        if (company?.plan == null) {
            throw new BadRequestException('Empresa não possui plano definido');
        }

        await this.assertUserLimit(company!);

        const password = await this.hashPassword(dto.password);

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
        });

        return this.userRepo.save(user);
    }
    async findOne(uid: string): Promise<User> {
        const user = await this.userRepo.findOne({
            where: { uid },
            relations: ['company', 'plan'],
        });

        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        return user;
    }

    async update(uid: string, dto: UpdateUserDto): Promise<User> {
        const user = await this.findOne(uid);

        if (user.role === UserRole.MASTER) {
            throw new BadRequestException('Não é permitido editar usuário MASTER');
        }

        if (!user.plan) {
            throw new BadRequestException('Usuário não possui plano vinculado');
        }

        if (dto.companyId) {
            const company = await this.companyRepo.findOne({
                where: { id: dto.companyId },
            });

            if (!company) {
                throw new NotFoundException('Empresa não encontrada');
            }

            user.company = company;
        }

        const targetCompanyId = user.company?.id;
        if (targetCompanyId && (dto.departmentId || dto.cargoId)) {
            const { department, cargo } = await this.resolveDepartmentAndCargo(dto, targetCompanyId);
            if (department !== undefined) user.department = department;
            if (cargo !== undefined) user.cargo = cargo;
        }

        if (dto.permissionIds) {
            const permissions = await this.permissionRepo.find({
                where: {
                    id: In(dto.permissionIds),
                },
            });

            user.plan.permissions = permissions;

            await this.planRepo.save(user.plan);
        }

        if (dto.username) {
            user.username = dto.username;
        }

        if (dto.email) {
            user.email = dto.email;
        }

        if (dto.password) {
            user.password = await bcrypt.hash(dto.password, 10);
        }

        return this.userRepo.save(user);
    }

    async remove(uid: string): Promise<void> {
        const user = await this.findOne(uid);

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
    async getUserPermissions(userId: string): Promise<Permission[]> {
        const user = await this.userRepo.findOne({
            where: { uid: userId },
            relations: ['plan', 'plan.permissions'],
        });

        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        return user.plan?.permissions ?? [];
    }
    // user.service.ts

    async findAll(
        page = 1,
        limit = 10,
        search?: string,
        currentUser?: { role?: string; companyId?: number },
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

        // TENANT SCOPING: não-master vê só sua empresa
        if (currentUser && currentUser.role !== 'master' && currentUser.companyId) {
            query.andWhere('user.company_id = :companyId', {
                companyId: currentUser.companyId,
            });
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