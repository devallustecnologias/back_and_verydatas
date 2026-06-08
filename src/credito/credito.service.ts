import {
    Injectable,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Wallet } from 'src/ledger/walled.entity';
import { User } from 'src/entities/user/user.entity';

import { WalletService } from 'src/wallet/wallet.service';

import { Repository } from 'typeorm';

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
    ) { }

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

        // §6 motivo obrigatório no estorno
        if (!description || description.trim() === '') {
            throw new BadRequestException('Motivo obrigatório para estorno');
        }

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
