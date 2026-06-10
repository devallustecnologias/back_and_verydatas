import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from 'src/entities/audit/audit-log.entity';

export interface AuditLogInput {
  action: string;
  userId?: string | null;
  username?: string | null;
  companyId?: number | null;
  ip?: string | null;
  detail?: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  /**
   * Registra um evento de auditoria.
   * Nunca lança exceção — log NÃO pode quebrar a request.
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      const entry = this.auditRepo.create({
        action: input.action,
        userId: input.userId ?? null,
        username: input.username ?? null,
        companyId: input.companyId ?? null,
        ip: input.ip ?? null,
        detail: input.detail ?? null,
      });
      await this.auditRepo.save(entry);
    } catch (err) {
      console.error('[AuditService] Falha ao persistir log de auditoria:', err);
    }
  }

  /**
   * Busca paginada de logs.
   * MASTER: vê todos.
   * EMPRESA: vê apenas os da própria companyId.
   */
  async findAll(params: {
    page: number;
    limit: number;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
    currentUser: { role: string; companyId?: number | null };
  }) {
    const { page, limit, action, userId, from, to, currentUser } = params;

    const query = this.auditRepo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC');

    // Tenant scoping
    if (currentUser.role !== 'master') {
      if (!currentUser.companyId) {
        // OPERADOR ou sem empresa — retorna vazio (guard já bloqueia, mas camada defensiva)
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      query.andWhere('log.companyId = :companyId', {
        companyId: currentUser.companyId,
      });
    }

    if (action) {
      query.andWhere('log.action = :action', { action });
    }

    if (userId) {
      query.andWhere('log.userId = :userId', { userId });
    }

    if (from) {
      query.andWhere('log.createdAt >= :from', { from: new Date(from) });
    }

    if (to) {
      // inclusivo: até o final do dia informado
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query.andWhere('log.createdAt <= :to', { to: toDate });
    }

    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
