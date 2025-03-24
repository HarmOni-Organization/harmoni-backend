import {
  Controller,
  Get,
  Query,
  InternalServerErrorException,
  HttpStatus,
  HttpException,
  Req,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import {
  GenreRecommendationDto,
  MovieRecommendationDto,
} from './dto/recommendation.dto';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

// Extended Request type that includes the user property
interface RequestWithUser extends Request {
  user: any;
}

@Controller('recommendations')
export class RecommendationController {
  private readonly RECOMMENDATION_API_URL: string;
  private readonly logger = new Logger(RecommendationController.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.RECOMMENDATION_API_URL = this.configService.get<string>(
      'HARMONI_RECOMMENDATION_API_URL',
      'http://167.86.104.161',
    );
  }

  @Get('genre')
  async getGenreRecommendations(@Query() query: GenreRecommendationDto) {
    try {
      const { genre, topN = 30 } = query;

      const response = await firstValueFrom(
        this.httpService
          .get(`${this.RECOMMENDATION_API_URL}/genreBasedRecommendation`, {
            params: { genre, topN },
          })
          .pipe(
            catchError((error) => {
              console.error('Genre recommendation request failed:', error);
              throw new HttpException(
                'Recommendation service is currently unavailable',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
              );
            }),
          ),
      );

      return response.data;
    } catch (error) {
      console.error('Failed to fetch genre recommendations:', error);
      throw new InternalServerErrorException(
        error.message || 'Failed to fetch genre recommendations',
      );
    }
  }

  @Get('movie')
  async getUserRecommendations(
    @Req() request: RequestWithUser,
    @Query() query: MovieRecommendationDto,
  ) {
    try {
      const { movieId, topN = 24 } = query;

      // Debug user object structure
      this.logger.debug(`User object: ${JSON.stringify(request.user)}`);

      // Extract userId - Try different properties that might contain the user ID
      const userId =
        request.user?._id || request.user?.userId || request.user?.id;

      this.logger.debug(`Extracted userId: ${userId}`);

      if (!userId) {
        throw new HttpException(
          'User ID not found in request. Authentication required.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const response = await firstValueFrom(
        this.httpService
          .get(`${this.RECOMMENDATION_API_URL}/recommend`, {
            params: { userId, movieId, topN },
          })
          .pipe(
            catchError((error) => {
              console.error('User recommendation request failed:', error);
              throw new HttpException(
                'Recommendation service is currently unavailable',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
              );
            }),
          ),
      );

      return response.data;
    } catch (error) {
      console.error('Failed to fetch user recommendations:', error);
      throw new InternalServerErrorException(
        error.message || 'Failed to fetch user recommendations',
      );
    }
  }

  @Get('test')
  async testRecommendation() {
    try {
      this.logger.debug('Testing recommendation endpoint');
      return {
        success: true,
        message: 'Recommendation controller is working',
        api_url: this.RECOMMENDATION_API_URL,
      };
    } catch (error) {
      this.logger.error(`Test recommendation failed: ${error.message}`);
      throw new InternalServerErrorException(
        error.message || 'Test recommendation failed',
      );
    }
  }
}
