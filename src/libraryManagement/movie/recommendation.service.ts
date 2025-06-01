import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom, of } from 'rxjs';
import {
  GenreRecommendationDto,
  MovieRecommendationDto,
} from './dto/recommendation.dto';

export interface RecommendationResponse {
  success: boolean;
  data: any[];
  message?: string;
  total?: number;
}

export interface UserProfile {
  _id?: string;
  userId?: string;
  id?: string;
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly RECOMMENDATION_API_URL: string;
  private readonly INTERNAL_API_KEY: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.RECOMMENDATION_API_URL = this.configService.get<string>(
      'HARMONI_RECOMMENDATION_API_URL',
      'http://167.86.104.161',
    );
    this.INTERNAL_API_KEY = this.configService.get<string>(
      'X_INTERNAL_KEY',
      'shared-internal-key-with-server-a',
    );

    // Log configuration for debugging
    this.logger.debug(`Recommendation API URL: ${this.RECOMMENDATION_API_URL}`);
    this.logger.debug(
      `Internal API Key: ${this.INTERNAL_API_KEY ? '[REDACTED]' : 'NOT SET'}`,
    );
  }

  /**
   * Get movie recommendations based on genre
   */
  async getGenreBasedRecommendations(
    params: GenreRecommendationDto,
    authToken?: string,
  ): Promise<RecommendationResponse> {
    try {
      const { genre, topN = 50 } = params;

      this.logger.debug(
        `Fetching genre-based recommendations for: ${genre}, topN: ${topN}`,
      );
      this.logger.debug(`Using API URL: ${this.RECOMMENDATION_API_URL}`);

      const requestConfig = {
        params: { genre, topN },
        headers: {
          'X-Internal-Key': this.INTERNAL_API_KEY,
          ...(authToken && { Authorization: authToken }),
        },
        timeout: 10000, // 10 second timeout
      };

      this.logger.debug(
        'Request config:',
        JSON.stringify(requestConfig, null, 2),
      );

      const response = await firstValueFrom(
        this.httpService
          .get(
            `${this.RECOMMENDATION_API_URL}:8020/api/v1/movies/genre-based`,
            requestConfig,
          )
          .pipe(
            catchError((error) => {
              this.logger.error('Genre recommendation request failed:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                config: {
                  url: error.config?.url,
                  method: error.config?.method,
                  timeout: error.config?.timeout,
                },
              });

              // Check specific error types
              if (error.code === 'ECONNREFUSED') {
                throw new HttpException(
                  'Recommendation service is not running or not accessible',
                  HttpStatus.SERVICE_UNAVAILABLE,
                );
              }

              if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
                throw new HttpException(
                  'Recommendation service connection timeout',
                  HttpStatus.REQUEST_TIMEOUT,
                );
              }

              throw new HttpException(
                `Recommendation service error: ${error.message}`,
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
              );
            }),
          ),
      );

      this.logger.debug(
        `Successfully received ${response.data?.length || 0} recommendations`,
      );

      return {
        success: true,
        data: response.data || [],
        total: response.data?.length || 0,
      };
    } catch (error) {
      this.logger.error('Failed to fetch genre recommendations:', error);
      throw error;
    }
  }

  /**
   * Get personalized movie recommendations for a user
   */
  async getUserRecommendations(
    user: UserProfile,
    params: MovieRecommendationDto,
    authToken?: string,
  ): Promise<RecommendationResponse> {
    try {
      const { movieId, topN = 24 } = params;

      // Extract userId from user object
      const userId = user._id || user.userId || user.id;

      if (!userId) {
        throw new HttpException(
          'User ID not found. Authentication required.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      this.logger.debug(
        `Fetching user recommendations for userId: ${userId}, movieId: ${movieId}, topN: ${topN}`,
      );

      const requestConfig = {
        params: { userId, movieId, topN },
        headers: {
          'X-Internal-Key': this.INTERNAL_API_KEY,
          ...(authToken && { Authorization: authToken }),
        },
        timeout: 10000, // 10 second timeout
      };

      const response = await firstValueFrom(
        this.httpService
          .get(
            `${this.RECOMMENDATION_API_URL}:8020/api/v1/movies/recommend`,
            requestConfig,
          )
          .pipe(
            catchError((error) => {
              this.logger.error('User recommendation request failed:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
              });

              if (error.code === 'ECONNREFUSED') {
                throw new HttpException(
                  'Recommendation service is not running or not accessible',
                  HttpStatus.SERVICE_UNAVAILABLE,
                );
              }

              if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
                throw new HttpException(
                  'Recommendation service connection timeout',
                  HttpStatus.REQUEST_TIMEOUT,
                );
              }

              throw new HttpException(
                `Recommendation service error: ${error.message}`,
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
              );
            }),
          ),
      );

      return {
        success: true,
        data: response.data || [],
        total: response.data?.length || 0,
      };
    } catch (error) {
      this.logger.error('Failed to fetch user recommendations:', error);
      throw error;
    }
  }

  /**
   * Test the recommendation service connection
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    apiUrl: string;
    details?: any;
  }> {
    try {
      this.logger.debug('Testing recommendation service connection');
      this.logger.debug(`Testing URL: ${this.RECOMMENDATION_API_URL}/health`);

      // Try to ping the recommendation service
      const response = await firstValueFrom(
        this.httpService
          .get(`${this.RECOMMENDATION_API_URL}:8020/api/v1/health`, {
            headers: {
              'X-Internal-Key': this.INTERNAL_API_KEY,
            },
            timeout: 5000,
          })
          .pipe(
            catchError((error) => {
              this.logger.warn('Health check failed:', {
                message: error.message,
                code: error.code,
                status: error.response?.status,
              });
              return of({
                data: {
                  status: 'error',
                  error: error.message,
                  code: error.code,
                },
              });
            }),
          ),
      );

      if (response.data?.status === 'error') {
        return {
          success: false,
          message: `Recommendation service is not accessible: ${response.data.error}`,
          apiUrl: this.RECOMMENDATION_API_URL,
          details: response.data,
        };
      }

      return {
        success: true,
        message: 'Recommendation service is accessible',
        apiUrl: this.RECOMMENDATION_API_URL,
        details: response.data,
      };
    } catch (error) {
      this.logger.error('Recommendation service test failed:', error);
      return {
        success: false,
        message: `Recommendation service is not accessible: ${error.message}`,
        apiUrl: this.RECOMMENDATION_API_URL,
        details: { error: error.message },
      };
    }
  }
}
