import { IsBoolean, IsOptional, IsArray, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for getting series with optional detail level and filters
 */
export class GetSeriesDto {
  @ApiProperty({
    description: 'Whether to include detailed anime information',
    type: Boolean,
    required: false,
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  detailed?: boolean = false;

  @ApiProperty({
    description:
      'Specific anime ID arrays to include in the response (e.g., animeIds,adaptationIds)',
    type: [String],
    required: false,
    example: ['animeIds', 'characterIds'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  include?: string[];
}
