import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

/**
 * Data Transfer Object for creating a new note
 */
export class CreateNoteDto {
  @IsString()
  content: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsString()
  @IsOptional()
  context?: string;

  @IsString()
  @IsOptional()
  clientId?: string;
}
