import { IsString, IsInt, IsPositive, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class GenreRecommendationDto {
  @IsString()
  genre: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  topN?: number;
}

export class MovieRecommendationDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  movieId: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  topN?: number;
}
