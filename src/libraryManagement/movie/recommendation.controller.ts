import {
  Controller,
  Get,
  Query,
  InternalServerErrorException,
  Req,
  Logger,
  HttpException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  GenreRecommendationDto,
  MovieRecommendationDto,
} from './dto/recommendation.dto';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RecommendationService } from './recommendation.service';

// Extended Request type that includes the user property
interface RequestWithUser extends Request {
  user: any;
}

@Controller('library/recommendations')
export class RecommendationController {
  private readonly RECOMMENDATION_API_URL: string;
  private readonly logger = new Logger(RecommendationController.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly recommendationService: RecommendationService,
  ) {
    this.RECOMMENDATION_API_URL = this.configService.get<string>(
      'HARMONI_RECOMMENDATION_API_URL',
      'http://167.86.104.161:8020',
    );
  }

  @Get('genre')
  async getGenreRecommendations(
    @Query() query: GenreRecommendationDto,
    @Req() request: RequestWithUser,
  ) {
    try {
      this.logger.debug(
        `Genre recommendation request: ${JSON.stringify(query)}`,
      );
      const { authorization: authToken } = request.headers;

      const result =
        await this.recommendationService.getGenreBasedRecommendations(
          query,
          authToken,
        );

      this.logger.debug(
        `Successfully returned ${result.total} recommendations`,
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch genre recommendations:', {
        message: error.message,
        status: error.status,
        query,
      });

      // Re-throw HttpExceptions from the service as-is
      if (error instanceof HttpException) {
        throw error;
      }

      // For other errors, throw as internal server error
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
      this.logger.debug(
        `User recommendation request: ${JSON.stringify(query)}`,
      );
      const { authorization: authToken } = request.headers;

      const result = await this.recommendationService.getUserRecommendations(
        request.user,
        query,
        authToken,
      );

      this.logger.debug(
        `Successfully returned ${result.total} recommendations`,
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch user recommendations:', {
        message: error.message,
        status: error.status,
        query,
      });

      // Re-throw HttpExceptions from the service as-is
      if (error instanceof HttpException) {
        throw error;
      }

      // For other errors, throw as internal server error
      throw new InternalServerErrorException(
        error.message || 'Failed to fetch user recommendations',
      );
    }
  }

  @Get('test')
  async testRecommendation() {
    try {
      this.logger.debug('Testing recommendation service...');
      const result = await this.recommendationService.testConnection();
      this.logger.debug(
        `Test result: ${result.success ? 'SUCCESS' : 'FAILED'}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Test recommendation failed: ${error.message}`);
      throw new InternalServerErrorException(
        error.message || 'Test recommendation failed',
      );
    }
  }

  @Get('debug')
  async getDebugInfo() {
    try {
      return {
        success: true,
        message: 'Debug information',
        data: {
          apiUrl: this.RECOMMENDATION_API_URL,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
        },
      };
    } catch (error) {
      this.logger.error('Failed to get debug info:', error);
      throw new InternalServerErrorException('Failed to get debug info');
    }
  }
}
