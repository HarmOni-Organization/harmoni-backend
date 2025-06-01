import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class RecommendationService {
  private readonly RECOMMENDATION_API_URL: string;
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.RECOMMENDATION_API_URL = this.configService.get<string>(
      'HARMONI_RECOMMENDATION_API_URL',
      'http://167.86.104.161',
    );
  }

  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, any>,
    headers: Record<string, string>,
  ): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get(`${this.RECOMMENDATION_API_URL}${endpoint}`, {
            params,
            headers,
          })
          .pipe(
            catchError((error) => {
              this.logger.error(`API request failed: ${error.message}`);
              throw new HttpException(
                'Recommendation service is currently unavailable',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
              );
            }),
          ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch data: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to fetch data',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getGenreRecommendations(
    genre: string,
    topN: number,
    authHeader: string,
    internalKey: string,
  ) {
    return this.makeRequest(
      '/api/v1/movies/genre-based',
      { genre, topN },
      {
        Authorization: authHeader,
        'X-Internal-Key': internalKey,
      },
    );
  }

  async getUserRecommendations(
    userId: string,
    movieId: string,
    topN: number,
    authHeader: string,
    internalKey: string,
  ) {
    return this.makeRequest(
      '/api/v1/movies/recommend',
      { userId, movieId, topN },
      {
        Authorization: authHeader,
        'X-Internal-Key': internalKey,
      },
    );
  }
  async getPosterMovie(
    posterPath: string,
    movieId: string,
    authHeader: string,
    internalKey: string,
  ) {
    return this.makeRequest(
      '/api/v1/movies/poster',
      { posterPath, movieId },
      {
        Authorization: authHeader,
        'X-Internal-Key': internalKey,
      },
    );
  }

  async testAuth(authHeader: string, internalKey: string) {
    return this.makeRequest(
      '/auth-test',
      {},
      {
        Authorization: authHeader,
        'X-Internal-Key': internalKey,
      },
    );
  }
}
