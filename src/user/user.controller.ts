import { Controller, Post, Body, Put, Param, Delete, Get, UseGuards, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CreateUserDto } from './dto/user-create.dto';
import { UpdateUserDto } from './dto/user-update.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/auth/user.decorator';

@ApiTags('Users')
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

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
    ) {
        return this.userService.findAll(
            page,
            limit,
            search,
        );
    }

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

    @Post('admin')
    @ApiOperation({ summary: 'Criar admin da empresa' })
    createAdmin(@Body() dto: CreateUserDto) {
        return this.userService.createAdmin(dto);
    }

    @Post('operator')
    @ApiOperation({ summary: 'Criar operador' })
    createOperator(@Body() dto: CreateUserDto) {
        return this.userService.createOperator(dto);
    }

    @Put(':uid')
    @ApiOperation({ summary: 'Atualizar usuário' })
    update(
        @Param('uid') uid: string,
        @Body() dto: UpdateUserDto,
    ) {
        return this.userService.update(uid, dto);
    }

    @Get(':uid')
    @ApiOperation({ summary: 'Buscar usuário por UID' })
    findOne(
        @Param('uid') uid: string,
    ) {
        return this.userService.findOne(uid);
    }
    
    @Delete(':uid')
    @ApiOperation({ summary: 'Remover usuário' })
    remove(@Param('uid') uid: string) {
        return this.userService.remove(uid);
    }

    @Get(':userId/permissions')
    @ApiOperation({ summary: 'Listar permissões do usuário' })
    getUserPermissions(@Param('userId') userId: string, @User() user: any) {
        console.log("User do interceptor:", user)
        return this.userService.getUserPermissions(userId);
    }
}
