import { IsOptional, IsString, IsArray } from 'class-validator';

export class CreatePageTokenDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedOrigins?: string[];
}
