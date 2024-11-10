import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @IsString()
  firstName?: string;

  @IsString()
  lastName?: string;
}
