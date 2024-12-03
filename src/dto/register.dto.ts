import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username must not exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, periods, and hyphens',
  })
  @Matches(/^(?!.*[_.-]{2})[a-zA-Z0-9._-]+$/, {
    message: 'Username cannot contain consecutive underscores, periods, or hyphens',
  })
  @Matches(/^(?![_.-])[a-zA-Z0-9._-]+(?<![_.-])$/, {
    message: 'Username cannot start or end with underscores, periods, or hyphens',
  })  
  username: string;

  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(320, { message: 'Email must not exceed 320 characters' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(64, { message: 'Password must not exceed 64 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[\]{};:'",.<>\/?\\|`~])[A-Za-z\d!@#$%^&*()\-_=+[\]{};:'",.<>\/?\\|`~\s]{8,}$/, {
    message: 'Password must include uppercase, lowercase, number, special character, and can contain spaces',
  })
  
  password: string;
}
