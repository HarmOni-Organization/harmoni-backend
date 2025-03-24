import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GenreRecommendationDto {
  @IsString()
  genre: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topN?: number;
}

export class UserRecommendationDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  movieId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topN?: number;
}

export class MovieRecommendationDto {
  @IsOptional()
  @IsString()
  movieId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topN?: number;
}
