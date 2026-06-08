import { IsEnum } from 'class-validator';
import { UserStatus } from 'src/entities/user/user.entity';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;
}
