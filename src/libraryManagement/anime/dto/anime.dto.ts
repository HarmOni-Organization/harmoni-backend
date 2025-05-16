import { IsString, IsArray, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for getting anime by ID(s)
 */
export class GetAnimeDto {
  @ApiProperty({
    description: 'Array of anime IDs',
    type: [String],
    required: false,
    example: ['123', '456'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  ids?: string[];
}

/**
 * DTO for getting a series by ID
 */
export class GetSeriesDto {
  @ApiProperty({
    description: 'Series ID',
    type: String,
    required: true,
    example: 'series-123',
  })
  @IsString()
  id: string;
}
