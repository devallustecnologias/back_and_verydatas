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