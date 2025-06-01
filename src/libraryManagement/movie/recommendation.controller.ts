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
import {
  GenreRecommendationDto,
  MoviePosterDto,
  MovieRecommendationDto,
} from './dto/recommendation.dto';
import { Request } from 'express';
import { RecommendationService } from './recommendation.service';

// Extended Request type that includes the user property
interface RequestWithUser extends Request {
  user: any;
}

@Controller('library/recommendations')
export class RecommendationController {
  private readonly logger = new Logger(RecommendationController.name);

  constructor(private readonly recommendationService: RecommendationService) {}

  private getHeaderValue(header: string | string[] | undefined): string {
    if (!header) return '';
    return Array.isArray(header) ? header[0] : header;
  }

  @Get('genre')
  async getGenreRecommendations(
    @Req() request: RequestWithUser,
    @Query() query: GenreRecommendationDto,
  ) {
    try {
      const { genre, topN = 30 } = query;
      const headers = request.headers;
      // Get the authorization token and internal key from the request headers
      const authHeader = this.getHeaderValue(headers.authorization);
      const internalKey = this.getHeaderValue(headers['x-internal-key']);

      if (!authHeader) {
        throw new HttpException(
          'Authentication token is required',
          HttpStatus.UNAUTHORIZED,
        );
      }

      return await this.recommendationService.getGenreRecommendations(
        genre,
        topN,
        authHeader,
        internalKey,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch genre recommendations: ${error.message}`,
        error,
      );
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

      // Get the authorization token from the request headers
      const headers = request.headers;
      const authHeader = this.getHeaderValue(headers.authorization);
      const internalKey = this.getHeaderValue(headers['x-internal-key']);

      if (!authHeader) {
        throw new HttpException(
          'Authentication token is required',
          HttpStatus.UNAUTHORIZED,
        );
      }

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

      return await this.recommendationService.getUserRecommendations(
        userId.toString(),
        movieId.toString(),
        topN,
        authHeader,
        internalKey,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch user recommendations: ${error.message}`,
        error,
      );
      throw new InternalServerErrorException(
        error.message || 'Failed to fetch user recommendations',
      );
    }
  }

  @Get('test')
  async testRecommendation(@Req() request: RequestWithUser) {
    try {
      this.logger.debug('Testing recommendation endpoint');

      // Get the authorization token from the request headers
      const authHeader = this.getHeaderValue(request.headers.authorization);
      const internalKey = this.getHeaderValue(
        request.headers['x-internal-key'],
      );

      if (!authHeader) {
        throw new HttpException(
          'Authentication token is required',
          HttpStatus.UNAUTHORIZED,
        );
      }

      return await this.recommendationService.testAuth(authHeader, internalKey);
    } catch (error) {
      this.logger.error(`Test recommendation failed: ${error.message}`);
      throw new InternalServerErrorException(
        error.message || 'Test recommendation failed',
      );
    }
  }

  @Get('poster')
  async getPosterMovie(
    @Req() request: RequestWithUser,
    @Query() query: MoviePosterDto,
  ) {
    try {
      const { posterPath, movieId } = query;

      const authHeader = this.getHeaderValue(request.headers.authorization);
      const internalKey = this.getHeaderValue(
        request.headers['x-internal-key'],
      );

      if (!authHeader) {
        throw new HttpException(
          'Authentication token is required',
          HttpStatus.UNAUTHORIZED,
        );
      }

      return await this.recommendationService.getPosterMovie(
        posterPath,
        movieId,
        authHeader,
        internalKey,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch poster movie: ${error.message}`,
        error,
      );
      throw new InternalServerErrorException(
        error.message || 'Failed to fetch poster movie',
      );
    }
  }
}
