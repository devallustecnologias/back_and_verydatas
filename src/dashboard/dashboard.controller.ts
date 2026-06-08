import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User } from 'src/auth/user.decorator';
import { UserRole } from 'src/entities/user/user.entity';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard/master
   * Visão consolidada de toda a plataforma.
   * Restrito a usuários com role=master.
   */
  @Get('master')
  @Roles(UserRole.MASTER)
  getMasterDashboard() {
    return this.dashboardService.getMasterDashboard();
  }

  /**
   * GET /dashboard/empresa/:companyId
   * Visão da empresa específica.
   * MASTER vê qualquer empresa; EMPRESA só vê a própria (tenant-check no service).
   */
  @Get('empresa/:companyId')
  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  getEmpresaDashboard(
    @Param('companyId', ParseIntPipe) companyId: number,
    @User() user: { userId: string; username: string; role: string; companyId?: number; permissions?: string[] },
  ) {
    return this.dashboardService.getEmpresaDashboard(companyId, user);
  }
}
