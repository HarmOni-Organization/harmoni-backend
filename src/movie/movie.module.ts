import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { MovieController } from './movie.controller';
import { RecommendationController } from './recommendation.controller';
import { CommonModule } from '../common/common.module';
import { AiModule } from 'src/ai/ai.module';
import { HttpModule } from '@nestjs/axios';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    CommonModule,
    AiModule,
    HttpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [MovieController, RecommendationController],
  providers: [AuthMiddleware],
})
export class MovieModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: 'recommendations/user', method: RequestMethod.GET });
  }
}
