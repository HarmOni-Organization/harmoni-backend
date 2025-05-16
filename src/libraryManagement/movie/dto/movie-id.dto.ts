import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class MovieIdDto {
  @IsInt({ message: 'Movie ID must be an integer' })
  @IsPositive({ message: 'Movie ID must be positive' })
  @Type(() => Number)
  id: number;
}
