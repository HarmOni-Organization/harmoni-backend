import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength, Validate } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Email or username is required' })
  @IsString()
  @Matches(/^[a-zA-Z0-9._]+$|^[\w.%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/, {
    message: 'Provide a valid email or username',
  })
  emailOrUsername: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}
