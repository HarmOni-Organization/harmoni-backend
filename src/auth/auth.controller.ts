import { Controller, Post, Get, Body, Req, Res, HttpStatus, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from '../dto';
import { Response, Request } from 'express';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';
import { ErrorHandlingInterceptor } from './interceptors/error-handling.interceptor';

@Controller('auth')
@UseInterceptors(RateLimitInterceptor, ErrorHandlingInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid credentials' });
    }
    const token = this.authService.generateToken(user);
    return res.status(HttpStatus.OK).json({ accessToken: token });
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res() res: Response) {
    try {
      const { user, token } = await this.authService.registerUser(registerDto);
      return res.status(HttpStatus.CREATED).json({ accessToken:token, userData:user });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Registration failed',
      });
    }
  }

  @Get('verify-token')
  async verifyToken(@Req() req: Request, @Res() res: Response) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !(await this.authService.isTokenValid(token))) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid token' });
    }
    const userInfo = await this.authService.getUserFromToken(token);
    return res.status(HttpStatus.OK).json({ user: userInfo });
  }

  @Get('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const token = req.headers.authorization?.split(' ')[1];
    await this.authService.invalidateToken(token);
    return res.status(HttpStatus.OK).json({ message: 'Logged out successfully' });
  }

  @Get('refresh-token')
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.headers.authorization?.split(' ')[1];
    const newAccessToken = await this.authService.refreshAccessToken(refreshToken);
    if (!newAccessToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid refresh token' });
    }
    return res.status(HttpStatus.OK).json({ accessToken: newAccessToken });
  }
}
