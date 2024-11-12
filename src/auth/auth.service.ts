import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterDto, LoginDto } from '../dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  /**
   * Registers a new user, hashes their password, and returns user data with a token.
   */
  async registerUser(registerDto: RegisterDto): Promise<{ user: any; token: string }> {
    const existingUser = await this.userService.findOneByEmail(registerDto.email);
    if (existingUser) {
      throw new HttpException('Email is already in use', HttpStatus.CONFLICT);
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const newUser = await this.userService.createUser({
      ...registerDto,
      password: hashedPassword,
    });

    const token = this.generateToken(newUser);
    const userData = {
      userId: newUser.userId,
      username: newUser.username,
      email: newUser.email,
      createdAt: newUser.createdAt,
    };

    return { user: userData, token };
  }

  /**
   * Logs in an existing user and returns user data with a token.
   */
  async loginUser(loginDto: LoginDto): Promise<{ user: any; token: string }> {
    const user = await this.userService.findOneByEmail(loginDto.email);
    if (!user || !(await bcrypt.compare(loginDto.password, user.passwordHash))) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    const token = this.generateToken(user);
    const userData = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    };

    return { user: userData, token };
  }

  /**
   * Generates a JWT token for the authenticated user.
   */
  private generateToken(user: any): string {
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
    // Handle token invalidation logic here, if needed
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
}
