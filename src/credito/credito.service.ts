import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Wallet } from 'src/ledger/walled.entity';
import { User } from 'src/entities/user/user.entity';
import { Company } from 'src/company/company.entity';
import { Ledger, LedgerType, LedgerOrigin } from 'src/ledger/ledger.entity';

import { WalletService } from 'src/wallet/wallet.service';

import { DataSource, Repository } from 'typeorm';

interface CurrentUser {
    userId: string;
    username: string;
    role: string;
    companyId?: number;
    permissions?: string[];
}

@Injectable()
export class CreditoService {
    constructor(
        private readonly walletService: WalletService,

        @InjectRepository(Wallet)
        private readonly walletRepo: Repository<Wallet>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        @InjectRepository(Company)
        private readonly companyRepo: Repository<Company>,

        private readonly dataSource: DataSource,
    ) { }

    /**
     * Valida parentesco inline (sem depender de CompanyService — evita circular import).
     */
    private async assertIsFilialOf(masterCompanyId: number, filialCompanyId: number): Promise<void> {
        const filial = await this.companyRepo.findOne({
            where: { id: filialCompanyId },
            relations: ['parentCompany'],
        });

        if (!filial) {
            throw new NotFoundException('Filial não encontrada');
        }

        if (filial.parentCompany?.id !== masterCompanyId) {
            throw new ForbiddenException('Empresa alvo não é filial desta empresa');
        }
    }

    /**
     * Garante/cria wallet COMPANY e retorna o registro.
     */
    private async ensureCompanyWallet(companyId: number): Promise<Wallet> {
        let wallet = await this.walletRepo.findOne({
            where: { type: 'COMPANY', companyId },
        });

        if (!wallet) {
            wallet = this.walletRepo.create({ type: 'COMPANY', companyId });
            wallet = await this.walletRepo.save(wallet);
        }

        return wallet;
    }

    /**
     * Calcula saldo de uma wallet (SUM CREDIT - SUM DEBIT) usando o ledgerRepo dentro de uma transação.
     */
    private async getWalletBalance(walletId: string, ledgerRepo: Repository<Ledger>): Promise<number> {
        const raw = await ledgerRepo
            .createQueryBuilder('l')
            .select(
                `COALESCE(SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount WHEN l.type = 'DEBIT' THEN -l.amount ELSE 0 END), 0)`,
                'balance',
            )
            .where('l.walletId = :walletId', { walletId })
            .getRawOne<{ balance: string }>();

        return Number(raw?.balance ?? 0);
    }

    /**
     * Transfere créditos da Empresa Master para uma de suas Filiais (soma-zero).
     */
    async transferToFilial(
        masterCompanyId: number,
        filialCompanyId: number,
        amount: number,
        description?: string,
        actor?: { userId: string; username?: string },
    ): Promise<{ masterBalance: number; filialBalance: number }> {
        if (amount <= 0) {
            throw new BadRequestException('Valor inválido');
        }

        if (masterCompanyId === filialCompanyId) {
            throw new BadRequestException('Não é possível transferir para si mesma');
        }

        await this.assertIsFilialOf(masterCompanyId, filialCompanyId);

        // Garantir que ambas as wallets existam antes da transação
        const masterWallet = await this.ensureCompanyWallet(masterCompanyId);
        const filialWallet = await this.ensureCompanyWallet(filialCompanyId);

        return this.dataSource.transaction(async (manager) => {
            const walletRepo = manager.getRepository(Wallet);
            const ledgerRepo = manager.getRepository(Ledger);

            // Re-busca dentro da transação para consistência
            const mWallet = await walletRepo.findOne({ where: { id: masterWallet.id } });
            const fWallet = await walletRepo.findOne({ where: { id: filialWallet.id } });

            if (!mWallet || !fWallet) {
                throw new NotFoundException('Wallet não encontrada');
            }

            const masterBalance = await this.getWalletBalance(mWallet.id, ledgerRepo);

            if (masterBalance < amount) {
                throw new BadRequestException('Saldo insuficiente para transferência');
            }

            // DEBIT master
            await ledgerRepo.save({
                wallet: mWallet,
                amount,
                type: LedgerType.DEBIT,
                origin: LedgerOrigin.TRANSFER,
                description: description ?? `Transferência p/ filial #${filialCompanyId}`,
                performedById: actor?.userId,
                performedByName: actor?.username,
            });

            // CREDIT filial
            await ledgerRepo.save({
                wallet: fWallet,
                amount,
                type: LedgerType.CREDIT,
                origin: LedgerOrigin.TRANSFER,
                description: description ?? `Recebido da matriz #${masterCompanyId}`,
                performedById: actor?.userId,
                performedByName: actor?.username,
            });

            const newMasterBalance = await this.getWalletBalance(mWallet.id, ledgerRepo);
            const newFilialBalance = await this.getWalletBalance(fWallet.id, ledgerRepo);

            return { masterBalance: newMasterBalance, filialBalance: newFilialBalance };
        });
    }

    /**
     * Estorna créditos da Filial de volta para a Empresa Master (soma-zero reverso).
     */
    async reverseFilialTransfer(
        masterCompanyId: number,
        filialCompanyId: number,
        amount: number,
        description?: string,
        actor?: { userId: string; username?: string },
    ): Promise<{ masterBalance: number; filialBalance: number }> {
        if (amount <= 0) {
            throw new BadRequestException('Valor inválido');
        }

        if (masterCompanyId === filialCompanyId) {
            throw new BadRequestException('Não é possível estornar para si mesma');
        }

        await this.assertIsFilialOf(masterCompanyId, filialCompanyId);

        const masterWallet = await this.ensureCompanyWallet(masterCompanyId);
        const filialWallet = await this.ensureCompanyWallet(filialCompanyId);

        return this.dataSource.transaction(async (manager) => {
            const walletRepo = manager.getRepository(Wallet);
            const ledgerRepo = manager.getRepository(Ledger);

            const mWallet = await walletRepo.findOne({ where: { id: masterWallet.id } });
            const fWallet = await walletRepo.findOne({ where: { id: filialWallet.id } });

            if (!mWallet || !fWallet) {
                throw new NotFoundException('Wallet não encontrada');
            }

            const filialBalance = await this.getWalletBalance(fWallet.id, ledgerRepo);

            if (filialBalance < amount) {
                throw new BadRequestException('Saldo insuficiente para estorno');
            }

            // DEBIT filial
            await ledgerRepo.save({
                wallet: fWallet,
                amount,
                type: LedgerType.DEBIT,
                origin: LedgerOrigin.ESTORNO,
                description: description ?? `Estorno p/ matriz #${masterCompanyId}`,
                performedById: actor?.userId,
                performedByName: actor?.username,
            });

            // CREDIT master
            await ledgerRepo.save({
                wallet: mWallet,
                amount,
                type: LedgerType.CREDIT,
                origin: LedgerOrigin.ESTORNO,
                description: description ?? `Estorno recebido da filial #${filialCompanyId}`,
                performedById: actor?.userId,
                performedByName: actor?.username,
            });

            const newMasterBalance = await this.getWalletBalance(mWallet.id, ledgerRepo);
            const newFilialBalance = await this.getWalletBalance(fWallet.id, ledgerRepo);

            return { masterBalance: newMasterBalance, filialBalance: newFilialBalance };
        });
    }

    async addCredits(
        userIdOrCompanyId: string,
        amount: number,
        description?: string,
        currentUser?: CurrentUser,
    ) {
        if (amount <= 0) {
            throw new BadRequestException('Valor inválido');
        }

        const isCompany = !isNaN(Number(userIdOrCompanyId));

        let wallet: Wallet | null = null;

        if (isCompany) {
            wallet = await this.walletRepo.findOneBy({
                companyId: Number(userIdOrCompanyId),
            });
        } else {
            wallet = await this.walletRepo.findOneBy({
                userId: userIdOrCompanyId,
            });
        }

        if (!wallet) {
            wallet = this.walletRepo.create({
                type: isCompany ? 'COMPANY' : 'USER',

                companyId: isCompany
                    ? Number(userIdOrCompanyId)
                    : undefined,

                userId: !isCompany
                    ? userIdOrCompanyId
                    : undefined,
            });

            wallet = await this.walletRepo.save(wallet);
        }

        const actor = currentUser
            ? { userId: currentUser.userId, username: currentUser.username }
            : undefined;

        return this.walletService.addCredits(
            wallet.id,
            amount,
            description,
            actor,
        );
    }

    async estornarCredits(
        userIdOrCompanyId: string,
        amount: number,
        description?: string,
        currentUser?: CurrentUser,
    ) {
        if (amount <= 0) {
            throw new BadRequestException('Valor invalido');
        }

        // motivo (description) é opcional no estorno

        const isCompany = !isNaN(Number(userIdOrCompanyId));

        // Tenant scope check for non-master
        if (currentUser && currentUser.role !== 'master') {
            if (isCompany) {
                // Target is a companyId — must match caller's company
                if (Number(userIdOrCompanyId) !== currentUser.companyId) {
                    throw new ForbiddenException('Acesso negado: alvo de outra empresa');
                }
            } else {
                // Target is a userId — load user and check their company
                const targetUser = await this.userRepo.findOne({
                    where: { uid: userIdOrCompanyId },
                    relations: ['company'],
                });
                if (!targetUser || targetUser.company?.id !== currentUser.companyId) {
                    throw new ForbiddenException('Acesso negado: alvo de outra empresa');
                }
            }
        }

        const wallet = isCompany
            ? await this.walletRepo.findOneBy({ companyId: Number(userIdOrCompanyId) })
            : await this.walletRepo.findOneBy({ userId: userIdOrCompanyId });

        if (!wallet) {
            throw new BadRequestException('Carteira nao encontrada para estorno');
        }

        const actor = currentUser
            ? { userId: currentUser.userId, username: currentUser.username }
            : undefined;

        return this.walletService.estornarCredits(wallet.id, amount, description, actor);
    }

    async addCreditUser(
        companyId: number,
        userId: string,
        amount: number,
        description?: string,
        currentUser?: CurrentUser,
    ) {
        // Tenant scope check for non-master
        if (currentUser && currentUser.role !== 'master') {
            // Source company must be caller's own company
            if (companyId !== currentUser.companyId) {
                throw new ForbiddenException('Acesso negado: empresa de origem de outra empresa');
            }
            // Target user must belong to caller's company
            const targetUser = await this.userRepo.findOne({
                where: { uid: userId },
                relations: ['company'],
            });
            if (!targetUser || targetUser.company?.id !== currentUser.companyId) {
                throw new ForbiddenException('Acesso negado: usuário alvo de outra empresa');
            }
        }

        const actor = currentUser
            ? { userId: currentUser.userId, username: currentUser.username }
            : undefined;

        return this.walletService.addCreditUser(companyId, userId, amount, description, actor);
    }
}
