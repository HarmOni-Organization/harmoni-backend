import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class SearchMovieDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  names: string[];
}

export class TreeInputDto {
  @IsString()
  tree: string = '';
}
