import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async use(req: any, res: any, next: () => void) {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new UnauthorizedException('Authorization header missing');

    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      req.user = await this.userService.findOneById(decoded.sub);
      next();
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
