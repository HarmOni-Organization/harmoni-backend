import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username must not exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9._]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and periods',
  })
  @Matches(/^(?!.*[_.]{2})[a-zA-Z0-9._]+$/, {
    message: 'Username cannot contain consecutive underscores or periods',
  })
  @Matches(/^(?![_.])[a-zA-Z0-9._]+(?<![_.])$/, {
    message: 'Username cannot start or end with underscores or periods',
  })
  username: string;

  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(320, { message: 'Email must not exceed 320 characters' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(64, { message: 'Password must not exceed 64 characters' })
  // @Matches(/^\S*$/, { message: 'Password cannot contain spaces' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[ A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Password must include uppercase, lowercase, number, and special character',
  })
  password: string;

  @IsString({ message: 'First name must be a string' })
  firstName?: string;

  @IsString({ message: 'Last name must be a string' })
  lastName?: string;
}
