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
    // Use `passwordHash` instead of `password` here
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      return user;
    }
    return null;
  }

  async generateToken(user: any): Promise<string> {
    const payload = { userId: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }

  async registerUser(registerDto: RegisterDto): Promise<any> {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const newUser = await this.userService.createUser({
      ...registerDto,
      password: hashedPassword,
    });
    return newUser;
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
