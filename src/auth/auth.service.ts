import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterDto } from '../dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  // Validate the user's credentials
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findOneByEmail(email);
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      return user;
    }
    return null;
  }

    /**
   * Register a new user, hash their password, save to database, and return a token.
   * @param registerDto - Data Transfer Object containing user registration details.
   * @returns - An object containing user data and an authentication token.
   */
    async registerUser(registerDto: RegisterDto): Promise<{ user: any; token: string }> {
      try {
        // Check if the email or username already exists
        const existingUser = await this.userService.findOneByEmail(registerDto.email);
        if (existingUser) {
          throw new HttpException('Email already in use', HttpStatus.CONFLICT);
        }
  
        // Hash the password for secure storage
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
  
        // Create the user object with hashed password and generate userId
        const newUser = await this.userService.createUser({
          ...registerDto,
          password: hashedPassword,
        });
  
        // Generate a JWT token for the new user
        const token = this.generateToken(newUser);
  
        // Exclude sensitive information (passwordHash) from the returned user data
        const userData = {
          userId: newUser.userId,
          username: newUser.username,
          email: newUser.email,
          createdAt: newUser.createdAt,
        };
  
        return { user: userData, token };
      } catch (error) {
        // Enhanced error logging for debugging
        console.error("Registration Error:", error.message, {
          stack: error.stack,
          details: error,
        });
  
        // Return a generic error message for unexpected errors
        throw new HttpException(
          error.message || 'Registration failed due to a server error',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * Generate a JWT token for authentication.
     * @param user - The user object containing essential user information.
     * @returns - A JWT token.
     */
    public generateToken(user: any): string {
      const payload = { userId: user.userId, email: user.email };
      return this.jwtService.sign(payload);
    }
  
  
  async isTokenValid(token: string): Promise<boolean> {
    try {
      await this.jwtService.verifyAsync(token);
      return true;
    } catch {
      return false;
    }
  }

  async getUserFromToken(token: string): Promise<any> {
    const decoded = await this.jwtService.verifyAsync(token);
    return this.userService.findOneById(decoded.userId);
  }

  async invalidateToken(token: string): Promise<void> {
    // Add token to a denylist if required or handle client-side logout
  }

  async refreshAccessToken(refreshToken: string): Promise<string | null> {
    try {
      const decoded = await this.jwtService.verifyAsync(refreshToken);
      const user = await this.userService.findOneById(decoded.userId);
      if (user) {
        return this.generateToken(user);
      }
      return null;
    } catch {
      return null;
    }
  }

  async findUserByEmail(email: string): Promise<any> {
    return this.userService.findOneByEmail(email);
  }
}
