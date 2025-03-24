import { IsNumber, IsNotEmpty } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class MovieIdDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  id: number;
}
