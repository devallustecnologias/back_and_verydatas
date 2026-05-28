import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LocationService } from './location.service';
import { StateResponseDto } from './dto/state-response.dto';
import { CityResponseDto } from './dto/city-response.dto';
import { Permissions } from 'src/permitions/permissions.decorator';
import { PERMISSIONS } from 'src/permitions/permissions.constants';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/permitions/permissions.guard';
import { User } from 'src/auth/user.decorator';

@ApiBearerAuth()
@ApiTags('Locations')
@Controller('locations')
export class LocationController {
  constructor(
    private readonly locationService: LocationService,
  ) { }


  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    PERMISSIONS.PLAN.CREATE,
    PERMISSIONS.USER.UPDATE
  )
  @Get('testar')
  getTest(@User() user: any) {
    console.log("Passou")
  }

  @Get('states')
  @ApiOperation({ summary: 'Listar estados do Brasil' })
  @ApiResponse({
    status: 200,
    description: 'Lista de estados brasileiros',
    type: [StateResponseDto],
  })
  getStates(): StateResponseDto[] {
    return this.locationService.getStates();
  }

  @Get('cities/:uf')
  @ApiOperation({ summary: 'Listar cidades por UF' })
  @ApiParam({
    name: 'uf',
    example: 'MG',
    description: 'Sigla do estado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de cidades do estado informado',
    type: [CityResponseDto],
  })
  getCities(
    @Param('uf') uf: string,
  ): CityResponseDto[] {
    return this.locationService.getCities(
      uf.toUpperCase(),
    );
  }
}