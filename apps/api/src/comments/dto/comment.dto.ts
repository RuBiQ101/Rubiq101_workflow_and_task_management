// src/comments/dto/comment.dto.ts
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string; // for nested/threaded comments
}

export class UpdateCommentDto {
  @IsString()
  content: string;
}
