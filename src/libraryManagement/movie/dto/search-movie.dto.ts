import { IsArray, IsString, IsOptional } from 'class-validator';

export class SearchMovieDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  names: string[];
}

export class TreeInputDto {
  @IsString()
  @IsOptional()
  tree?: string;
}
