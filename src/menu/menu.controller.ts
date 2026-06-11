import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/entities/user/user.entity';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { SetPlanMenusDto } from './dto/set-plan-menus.dto';

@ApiTags('Menus')
@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // GET /menus/me — menus efetivos do usuário logado
  @Roles(UserRole.MASTER, UserRole.EMPRESA, UserRole.OPERADOR)
  @Get('menus/me')
  @ApiOperation({
    summary: 'Menus efetivos do usuário logado (plano ∩ árvore da empresa)',
  })
  getMyMenus(@Req() req: any) {
    return this.menuService.getMyMenus(req.user);
  }

  // GET /menus — árvore de menus (MASTER e EMPRESA)
  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Get('menus')
  @ApiOperation({ summary: 'Listar menus em árvore (top-level com children)' })
  findAll() {
    return this.menuService.findTree();
  }

  // POST /menus — criar menu ou submenu (MASTER apenas)
  @Roles(UserRole.MASTER)
  @Post('menus')
  @ApiOperation({ summary: 'Criar novo menu ou submenu' })
  create(@Body() dto: CreateMenuDto) {
    return this.menuService.create(dto);
  }

  // PUT /menus/:id — editar menu (MASTER apenas)
  @Roles(UserRole.MASTER)
  @Put('menus/:id')
  @ApiOperation({ summary: 'Atualizar menu' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMenuDto,
  ) {
    return this.menuService.update(id, dto);
  }

  // DELETE /menus/:id — soft-delete (MASTER apenas)
  @Roles(UserRole.MASTER)
  @Delete('menus/:id')
  @ApiOperation({ summary: 'Remover menu (soft-delete)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.remove(id);
  }

  // PUT /plans/:planId/menus — liberar menus de um plano (MASTER apenas)
  @Roles(UserRole.MASTER)
  @Put('plans/:planId/menus')
  @ApiOperation({ summary: 'Definir menus liberados para um plano' })
  setPlanMenus(
    @Param('planId', ParseIntPipe) planId: number,
    @Body() dto: SetPlanMenusDto,
  ) {
    return this.menuService.setPlanMenus(planId, dto.menuIds);
  }
}
