import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

/**
 * Refresh Token DTO
 * Validates the refresh token request
 */
export class RefreshTokenDto {
  @IsNotEmpty({ message: 'Refresh token is required' })
  @IsString({ message: 'Refresh token must be a string' })
  refreshToken: string;

  @IsOptional()
  @IsString({ message: 'Device info must be a string if provided' })
  deviceInfo?: string;
}
