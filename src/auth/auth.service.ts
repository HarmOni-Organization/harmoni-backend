import {
  Injectable,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterDto } from '../dto';
import * as bcrypt from 'bcrypt';
import { ERROR_MESSAGES } from 'src/constants';

@Injectable()
export class AuthService {
  // TODO change the token invalidate to a Token Expiry Adjustment:
  private invalidatedTokens: Set<string> = new Set(); // Store invalidated tokens in memory

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  /**
   * Registers a new user by hashing their password, saving to the database,
   * and generating a JWT token.
   * @param registerDto - Registration data from the client.
   * @returns User data and JWT token.
   */
  async registerUser(registerDto: RegisterDto): Promise<{ user: any; token: string }> {
    const existingUser = await this.userService.findOneByEmail(registerDto.email);
    if (existingUser) {
      throw new HttpException('Email is already in use', HttpStatus.CONFLICT);
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10); // Hash password
    const newUser = await this.userService.createUser({
      ...registerDto,
      password: hashedPassword,
    });

    const token = this.generateToken(newUser); // Generate JWT token
    return { user: this.getPublicUser(newUser), token }; // Return user data and token
  }

  /**
   * Validates user credentials (email/username and password).
   * @param emailOrUsername - User's email or username.
   * @param password - User's password.
   * @returns The authenticated user object.
   */
  async validateUser(emailOrUsername: string, password: string) {
    const user = await this.userService.findByEmailOrUsername(emailOrUsername);
    if (!user) throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash); // Compare password
    if (!isPasswordValid) throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);

    return user;
  }

  /**
   * Logs in a user and generates a JWT token.
   * @param user - Authenticated user object.
   * @returns JWT token and user data.
   */
  login(user: any) {
    return {
      accessToken: this.generateToken(user),
      user: this.getPublicUser(user),
    };
  }


  /**
   * Invalidates a JWT token by adding it to the blacklist.
   * This token will no longer be considered valid for future requests.
   * @param token - The JWT token to invalidate.
   */
  async invalidateToken(token: string): Promise<void> {
    if (!token) {
      throw new HttpException('Token is required for logout', HttpStatus.BAD_REQUEST);
    }
    try {
      await this.jwtService.verifyAsync(token); // Verify token before blacklisting
      this.invalidatedTokens.add(token); // Add token to blacklist
      console.log(`Token invalidated: ${token}`);
    } catch (error) {
      console.error(`Error invalidating token: ${error.message}`);
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * Checks if a token has been invalidated.
   * @param token - The JWT token to check.
   * @returns `true` if the token is valid; `false` if invalidated.
   */
  async isTokenValid(token: string): Promise<boolean> {
    if (this.invalidatedTokens.has(token)) {
      return false; // Token is in the blacklist
    }
    try {
      await this.jwtService.verifyAsync(token); // Verify token signature
      return true;
    } catch {
      return false;
    }
  }

/**
   * Retrieves a user from a valid JWT token.
   * Improved error handling to ensure successful retrieval of user details.
   * @param token - The JWT token.
   * @returns The user object corresponding to the token.
   */
  async getUserFromToken(token: string): Promise<any> {
    try {
      
      if (!token) {
        throw new UnauthorizedException('Token is missing');
      }
      // Check if the token has been invalidated
      if (this.invalidatedTokens.has(token)) {
        throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
      }

      // Decode and verify the token
      const decoded = await this.jwtService.verifyAsync(token);
      
      const user = await this.userService.findOneById(decoded.userId);
      
      // Check if user exists
      if (!user) {
        throw new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      // Return the user data
      return {
        userId: user.userId,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      };
    } catch (error) {
      console.error('Error getting user from token:', error.message);
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
    }
  }

  /**
   * Refreshes a user's access token using a refresh token.
   * Improved error handling and proper verification.
   * @param refreshToken - The refresh token provided by the user.
   * @returns A new JWT access token, or throws an error if the refresh token is invalid.
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token is missing');
      }

      // Verify refresh token validity
      const decoded = await this.jwtService.verifyAsync(refreshToken);

      // Fetch user using decoded data
      const user = await this.userService.findOneById(decoded.userId);
      if (!user) {
        throw new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      // Generate a new access token for the user
      return this.generateToken(user);
    } catch (error) {
      console.error('Error refreshing access token:', error.message);
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
    }
  }

  /**
   * Generates a JWT token for the authenticated user.
   * @param user - The user object.
   * @returns A signed JWT token.
   */
  private generateToken(user: any): string {
    try {
      const payload = { userId: user.userId, email: user.email, username: user.username };
      return this.jwtService.sign(payload);
    } catch (error) {
      console.error('Error generating token:', error.message);
      throw new InternalServerErrorException('Failed to generate token');
    }
  }

  /**
   * Extracts public user information for responses.
   * @param user - The user object.
   * @returns Public-facing user data.
   */
  private getPublicUser(user: any): any {
    return {
      userId: user.userId,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}
