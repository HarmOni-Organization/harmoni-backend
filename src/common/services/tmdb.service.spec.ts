import { Test, TestingModule } from '@nestjs/testing';
import { TmdbService } from './tmdb.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

describe('TmdbService', () => {
  let service: TmdbService;
  let httpService: { get: jest.Mock };
  let configService: { get: jest.Mock };
  const FAKE_API_KEY = 'fake-api-key';

  beforeEach(async () => {
    // Mock the HttpService and ConfigService
    httpService = {
      get: jest.fn(),
    };

    configService = {
      get: jest.fn().mockImplementation((key) => {
        if (key === 'TMDB_API_KEY') {
          return FAKE_API_KEY;
        }
        return undefined;
      }),
    };

    // Set up the test module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TmdbService,
        {
          provide: HttpService,
          useValue: httpService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<TmdbService>(TmdbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMovieById', () => {
    it('should return movie data when movie exists', async () => {
      const movieId = 123;
      const mockMovieData = {
        id: movieId,
        title: 'Test Movie',
        release_date: '2023-01-01',
        overview: 'Test Overview',
        runtime: 120,
        genres: [{ id: 1, name: 'Action' }],
        popularity: 100,
        poster_path: '/poster.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.5,
        credits: {
          cast: [
            { name: 'Actor 1', character: 'Character 1' },
            { name: 'Actor 2', character: 'Character 2' },
          ],
          crew: [
            { name: 'Director', job: 'Director' },
            { name: 'Writer', job: 'Writer' },
          ],
        },
        keywords: {
          keywords: [
            { id: 1, name: 'Keyword 1' },
            { id: 2, name: 'Keyword 2' },
          ],
        },
      };

      // Mock HTTP response
      const mockResponse = {
        data: mockMovieData,
      };

      // Make the httpService.get method return an observable of the mock response
      httpService.get.mockReturnValue({
        toPromise: jest.fn().mockResolvedValue(mockResponse),
      });

      // Call the service method
      const result = await service.getMovieById(movieId);

      // Check that the HTTP service was called with the right URL
      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining(
          `/movie/${movieId}?api_key=${FAKE_API_KEY}&append_to_response=credits,keywords`,
        ),
      );

      // Verify the expected structure of the returned data
      expect(result).toEqual({
        id: movieId,
        title: 'Test Movie',
        release_date: '2023-01-01',
        overview: 'Test Overview',
        runtime: 120,
        genres: ['Action'],
        popularity: 100,
        poster_url: 'https://image.tmdb.org/t/p/original/poster.jpg',
        backdrop_url: 'https://image.tmdb.org/t/p/original/backdrop.jpg',
        imdb_rating: 8.5,
        cast: [
          { name: 'Actor 1', character: 'Character 1' },
          { name: 'Actor 2', character: 'Character 2' },
        ],
        director: 'Director',
        crew: [
          { name: 'Director', job: 'Director' },
          { name: 'Writer', job: 'Writer' },
        ],
        keywords: ['Keyword 1', 'Keyword 2'],
      });
    });

    it('should handle errors when fetching movie data', async () => {
      const movieId = 123;
      const error = new Error('API Error');

      // Make the httpService.get method throw an error
      httpService.get.mockReturnValue({
        toPromise: jest.fn().mockRejectedValue(error),
      });

      // Expect the service method to throw the error
      await expect(service.getMovieById(movieId)).rejects.toThrow(error);
    });
  });
});
