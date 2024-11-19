import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, Validate } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string | null;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  username: string | null;

  @Validate(
    (dto: LoginDto) => !!(dto.email || dto.username),
    { message: 'Either email or username must be provided.' },
  )
  validateOneOfTwo: string; // Placeholder to trigger validation

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
