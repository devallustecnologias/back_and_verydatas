import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LocationService } from './location.service';
import { StateResponseDto } from './dto/state-response.dto';
import { CityResponseDto } from './dto/city-response.dto';

@ApiTags('Locations')
@Controller('locations')
export class LocationController {
  constructor(
    private readonly locationService: LocationService,
  ) {}

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