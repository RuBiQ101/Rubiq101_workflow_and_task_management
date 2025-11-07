import { IsString, IsIn } from 'class-validator';

export class ChangeRoleDto {
  @IsString()
  @IsIn(['owner', 'admin', 'member', 'guest'])
  roleKey: string;
}
