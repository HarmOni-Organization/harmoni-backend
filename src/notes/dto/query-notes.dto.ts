import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Data Transfer Object for querying notes with filters
 */
export class QueryNotesDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsArray()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  tags?: string[];

  @IsString()
  @IsOptional()
  context?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  isPinned?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;
}
