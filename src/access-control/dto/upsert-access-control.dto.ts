import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IpMode } from 'src/entities/access-control/company-access-control.entity';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpsertAccessControlDto {
  @ApiProperty({ required: false, example: true })
  @IsBoolean()
  @IsOptional()
  scheduleEnabled?: boolean;

  @ApiProperty({
    required: false,
    example: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    description: 'Dias da semana permitidos: MON TUE WED THU FRI SAT SUN',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedDays?: string[];

  @ApiProperty({ required: false, example: '08:00' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime deve estar no formato HH:mm' })
  @IsOptional()
  startTime?: string;

  @ApiProperty({ required: false, example: '18:00' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'endTime deve estar no formato HH:mm' })
  @IsOptional()
  endTime?: string;

  @ApiProperty({ required: false, example: 'America/Sao_Paulo' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({ required: false, enum: IpMode, example: IpMode.ANY })
  @IsEnum(IpMode)
  @IsOptional()
  ipMode?: IpMode;

  @ApiProperty({ required: false, example: ['192.168.1.10', '10.0.0.5'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedIps?: string[];

  @ApiProperty({ required: false, description: 'Estado de seleção dos menus/ações da Árvore de Permissões' })
  @IsOptional()
  menuPermissions?: any;
}
