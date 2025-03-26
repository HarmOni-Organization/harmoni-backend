import { Test, TestingModule } from '@nestjs/testing';
import { MovieController } from './movie.controller';
import { AiService } from 'src/ai/ai.service';
import { TmdbService } from 'src/common/services/tmdb.service';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

// Use interfaces instead of importing the actual services
interface MockTmdbService {
  searchMoviesByNames: jest.Mock;
  getMovieById: jest.Mock;
}

interface MockAiService {
  extractMovieAnimeNames: jest.Mock;
}

describe('MovieController', () => {
  let controller: MovieController;
  let tmdbService: MockTmdbService;

  beforeEach(async () => {
    // Create mock services
    const mockTmdbService: MockTmdbService = {
      searchMoviesByNames: jest.fn(),
      getMovieById: jest.fn(),
    };

    const mockAiService: MockAiService = {
      extractMovieAnimeNames: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovieController],
      providers: [
        { provide: TmdbService, useValue: mockTmdbService },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    controller = module.get<MovieController>(MovieController);
    tmdbService = module.get(TmdbService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMovieById', () => {
    it('should return movie when movie exists', async () => {
      const movieId = 123;
      const mockMovie = {
        id: movieId,
        title: 'Test Movie',
        overview: 'Test Overview',
      };

      tmdbService.getMovieById.mockResolvedValue(mockMovie);

      const result = await controller.getMovieById({ id: movieId });

      expect(result).toEqual(mockMovie);
      expect(tmdbService.getMovieById).toHaveBeenCalledWith(movieId);
    });

    it('should throw NotFoundException when movie does not exist', async () => {
      const movieId = 999;

      tmdbService.getMovieById.mockResolvedValue(null);

      await expect(controller.getMovieById({ id: movieId })).rejects.toThrow(
        NotFoundException,
      );
      expect(tmdbService.getMovieById).toHaveBeenCalledWith(movieId);
    });

    it('should handle errors from TMDB service', async () => {
      const movieId = 123;

      tmdbService.getMovieById.mockRejectedValue(new Error('TMDB error'));

      await expect(controller.getMovieById({ id: movieId })).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(tmdbService.getMovieById).toHaveBeenCalledWith(movieId);
    });
  });
});
