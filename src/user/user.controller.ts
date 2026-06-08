import { Controller, Post, Body, Put, Patch, Param, Delete, Get, UseGuards, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CreateUserDto } from './dto/user-create.dto';
import { UpdateUserDto } from './dto/user-update.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/auth/user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/entities/user/user.entity';

@ApiTags('Users')
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Roles(UserRole.MASTER, UserRole.EMPRESA)
    @Get("all")
    @ApiOperation({ summary: 'Listar usuários com paginação' })

    @ApiQuery({
        name: 'search',
        required: false,
        type: String,
    })

    findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe)
        page: number,

        @Query('limit', new DefaultValuePipe(10), ParseIntPipe)
        limit: number,

        @Query('search')
        search?: string,

        @User() user?: any,
    ) {
        return this.userService.findAll(
            page,
            limit,
            search,
            user,
        );
    }

    @Roles(UserRole.MASTER)
    @Post('master')
    @ApiOperation({ summary: 'Criar usuário MASTER' })
    @ApiResponse({
        status: 201,
        description: 'Master criado',
        schema: {
            example: {
                uid: 'uuid',
                username: 'root',
                email: 'root@system.com',
                role: 'master',
            },
        },
    })
    createMaster(@Body() dto: CreateUserDto) {
        return this.userService.createMaster(dto);
    }

    @Roles(UserRole.MASTER)
    @Post('admin')
    @ApiOperation({ summary: 'Criar admin da empresa' })
    createAdmin(@Body() dto: CreateUserDto) {
        return this.userService.createAdmin(dto);
    }

    @Roles(UserRole.MASTER, UserRole.EMPRESA)
    @Post('operator')
    @ApiOperation({ summary: 'Criar operador' })
    createOperator(@Body() dto: CreateUserDto) {
        return this.userService.createOperator(dto);
    }

    @Roles(UserRole.MASTER, UserRole.EMPRESA)
    @Put(':uid')
    @ApiOperation({ summary: 'Atualizar usuário' })
    update(
        @Param('uid') uid: string,
        @Body() dto: UpdateUserDto,
    ) {
        return this.userService.update(uid, dto);
    }

    @Roles(UserRole.MASTER, UserRole.EMPRESA)
    @Get(':uid')
    @ApiOperation({ summary: 'Buscar usuário por UID' })
    findOne(
        @Param('uid') uid: string,
    ) {
        return this.userService.findOne(uid);
    }

    @Roles(UserRole.MASTER, UserRole.EMPRESA)
    @Patch(':uid/status')
    @ApiOperation({ summary: 'Alterar status do usuário (ATIVO/BLOQUEADO/SUSPENSO)' })
    updateStatus(
        @Param('uid') uid: string,
        @Body() dto: UpdateUserStatusDto,
        @User() user: any,
    ) {
        return this.userService.updateStatus(uid, dto.status, user);
    }

    @Roles(UserRole.MASTER, UserRole.EMPRESA)
    @Delete(':uid')
    @ApiOperation({ summary: 'Remover usuário' })
    remove(@Param('uid') uid: string) {
        return this.userService.remove(uid);
    }

    @Roles(UserRole.MASTER, UserRole.EMPRESA)
    @Get(':userId/permissions')
    @ApiOperation({ summary: 'Listar permissões do usuário' })
    getUserPermissions(@Param('userId') userId: string, @User() user: any) {
        console.log("User do interceptor:", user)
        return this.userService.getUserPermissions(userId);
    }
}
