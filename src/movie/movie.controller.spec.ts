import { Test, TestingModule } from '@nestjs/testing';
import { MovieController } from './movie.controller';
import { AiService } from 'src/ai/ai.service';
import { TmdbService } from 'src/common/services/tmdb.service';

// Use interfaces instead of importing the actual services
interface MockTmdbService {
  searchMoviesByNames: jest.Mock;
  getMovieDetails: jest.Mock;
  getMovieCredits: jest.Mock;
}

interface MockAiService {
  extractMovieAnimeNames: jest.Mock;
}

describe('MovieController', () => {
  let controller: MovieController;

  beforeEach(async () => {
    // Create mock services
    const mockTmdbService: MockTmdbService = {
      searchMoviesByNames: jest.fn(),
      getMovieDetails: jest.fn(),
      getMovieCredits: jest.fn(),
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
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
