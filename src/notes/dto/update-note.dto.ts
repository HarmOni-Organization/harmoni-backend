import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
} from 'class-validator';

/**
 * Data Transfer Object for updating an existing note
 */
export class UpdateNoteDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsString()
  @IsOptional()
  context?: string;

  @IsEnum(['synced', 'pending', 'conflict'])
  @IsOptional()
  syncStatus?: string;

  @IsString()
  @IsOptional()
  clientId?: string;
}
