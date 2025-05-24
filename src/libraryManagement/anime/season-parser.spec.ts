import { Test, TestingModule } from '@nestjs/testing';
import { AnimeSearchService } from './anime-search.service';
import { getModelToken } from '@nestjs/mongoose';

describe('Season Parser', () => {
  let animeSearchService: AnimeSearchService;

  // Mock models
  const mockAnimeModel = {
    aggregate: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockSeriesModel = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnimeSearchService,
        {
          provide: getModelToken('Anime', 'animeDB'),
          useValue: mockAnimeModel,
        },
        {
          provide: getModelToken('Series', 'animeDB'),
          useValue: mockSeriesModel,
        },
      ],
    }).compile();

    animeSearchService = module.get<AnimeSearchService>(AnimeSearchService);
  });

  describe('extractTitleAndSeason', () => {
    it('should correctly extract title and season with "S" format', () => {
      const result =
        animeSearchService['extractTitleAndSeason']('Overlord / S3');
      expect(result).toEqual({ title: 'Overlord', season: 3 });
    });

    it('should correctly extract title and season with "Season" format', () => {
      const result = animeSearchService['extractTitleAndSeason'](
        'Attack on Titan / Season 2',
      );
      expect(result).toEqual({ title: 'Attack on Titan', season: 2 });
    });

    it('should correctly extract title and season with "sezon" format', () => {
      const result = animeSearchService['extractTitleAndSeason'](
        'My Hero Academia / sezon4',
      );
      expect(result).toEqual({ title: 'My Hero Academia', season: 4 });
    });

    it('should handle titles with slashes correctly', () => {
      const result = animeSearchService['extractTitleAndSeason'](
        'Fate/stay night / Season 1',
      );
      expect(result).toEqual({ title: 'Fate/stay night', season: 1 });
    });

    it('should return only title when no season format is provided', () => {
      const result = animeSearchService['extractTitleAndSeason']('91 Days');
      expect(result).toEqual({ title: '91 Days' });
    });

    it('should return only title when season format is invalid', () => {
      const result =
        animeSearchService['extractTitleAndSeason']('Overlord / Latest');
      expect(result).toEqual({ title: 'Overlord / Latest' });
    });
  });

  describe('searchAnimeWithSeason', () => {
    it('should call searchAnime without season when no season specified', async () => {
      // Arrange
      const searchAnimeSpy = jest.spyOn(animeSearchService, 'searchAnime');
      searchAnimeSpy.mockResolvedValue([
        { id: '123', title: { english: 'Test Anime' } },
      ]);

      // Act
      await animeSearchService.searchAnimeWithSeason('Test Anime');

      // Assert
      expect(searchAnimeSpy).toHaveBeenCalledWith('Test Anime');
    });

    it('should use findSeasonByNumber when season is specified', async () => {
      // Arrange
      const searchAnimeSpy = jest.spyOn(animeSearchService, 'searchAnime');
      const findSeasonSpy = jest.spyOn(
        animeSearchService as any,
        'findSeasonByNumber',
      );

      const mockBaseAnime = {
        id: '123',
        title: { english: 'Test Anime' },
        seriesId: 'series1',
      };
      searchAnimeSpy.mockResolvedValue(mockBaseAnime);
      findSeasonSpy.mockResolvedValue([
        { id: '456', title: { english: 'Test Anime S2' } },
      ]);

      // Act
      await animeSearchService.searchAnimeWithSeason('Test Anime / S2');

      // Assert
      expect(searchAnimeSpy).toHaveBeenCalledWith('Test Anime', true);
      expect(findSeasonSpy).toHaveBeenCalledWith(mockBaseAnime, 2);
    });
  });
});
