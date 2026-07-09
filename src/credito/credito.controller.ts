import {
  Body,
  Controller,
  ForbiddenException,
  Post,
} from '@nestjs/common';

import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreditoService } from './credito.service';
import { AddCreditsDto } from './dto/add.credito.dto';
import { AddCreditsToUserDto } from './dto/add-credits-to-user.dto';
import { TransferFilialDto } from './dto/transfer-filial.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/entities/user/user.entity';
import { User } from 'src/auth/user.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from 'src/company/company.entity';
import { Repository } from 'typeorm';


@ApiTags('Créditos')
@Controller('creditos')
export class CreditoController {
  constructor(
    private readonly creditoService: CreditoService,

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) { }

  /**
   * Valida que o chamador é Empresa Master (role 'empresa' sem parentCompany).
   * Role 'master' oficial sem companyId não pode usar esta rota (deve usar /add).
   */
  private async assertCallerIsMasterEmpresa(user: any): Promise<number> {
    if (!user?.companyId) {
      throw new ForbiddenException('Apenas a matriz pode transferir créditos');
    }

    const company = await this.companyRepo.findOne({
      where: { id: user.companyId },
      relations: ['parentCompany'],
    });

    if (!company || company.parentCompany != null) {
      throw new ForbiddenException('Apenas a matriz pode transferir créditos');
    }

    return company.id;
  }

  @Roles(UserRole.MASTER)
  @Post('add')
  @ApiOperation({
    summary:
      'Adicionar créditos para usuário ou empresa',
  })
  addCredits(@Body() dto: AddCreditsDto, @User() user: any) {
    return this.creditoService.addCredits(
      dto.userIdOrCompanyId,
      dto.amount,
      dto.description,
      user,
    );
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Post('estorno')
  @ApiOperation({ summary: 'Estornar creditos de usuario ou empresa' })
  estornar(@Body() dto: AddCreditsDto, @User() user: any) {
    return this.creditoService.estornarCredits(
      dto.userIdOrCompanyId,
      dto.amount,
      dto.description,
      user,
    );
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Post('add/user')
  addCreditsToUser(@Body() dto: AddCreditsToUserDto, @User() user: any) {
    return this.creditoService.addCreditUser(
      dto.companyId,
      dto.userId,
      dto.amount,
      dto.description,
      user,
    );
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Post('transfer-filial')
  @ApiOperation({ summary: 'Transferir créditos da Empresa Master para uma Filial' })
  async transferToFilial(@Body() dto: TransferFilialDto, @User() user: any) {
    const masterCompanyId = await this.assertCallerIsMasterEmpresa(user);

    return this.creditoService.transferToFilial(
      masterCompanyId,
      dto.filialCompanyId,
      dto.amount,
      dto.description,
      { userId: user.userId, username: user.username },
    );
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Post('transfer-filial/estorno')
  @ApiOperation({ summary: 'Estornar créditos de uma Filial de volta para a Empresa Master' })
  async reverseFilialTransfer(@Body() dto: TransferFilialDto, @User() user: any) {
    const masterCompanyId = await this.assertCallerIsMasterEmpresa(user);

    return this.creditoService.reverseFilialTransfer(
      masterCompanyId,
      dto.filialCompanyId,
      dto.amount,
      dto.description,
      { userId: user.userId, username: user.username },
    );
  }
}
