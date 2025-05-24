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

  // Sample formatted anime object
  const sampleFormattedAnime = {
    id: '123',
    seriesId: 'series1',
    title: 'Test Anime',
    episodes: 13,
    format: 'TV',
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

    // Reset mocks before each test
    jest.clearAllMocks();

    // Add mock implementation for the extractTitleString method
    jest
      .spyOn(animeSearchService as any, 'extractTitleString')
      .mockImplementation((anime: any) => anime.title?.english || 'Unknown');
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

    it('should correctly extract title and season with "part" format', () => {
      const result = animeSearchService['extractTitleAndSeason'](
        "JoJo's Bizarre Adventure / part5",
      );
      expect(result).toEqual({ title: "JoJo's Bizarre Adventure", season: 5 });
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

    it('should handle titles with multiple slashes correctly', () => {
      const result = animeSearchService['extractTitleAndSeason'](
        "Fate/stay night/Heaven's Feel / S2",
      );
      expect(result).toEqual({
        title: "Fate/stay night/Heaven's Feel",
        season: 2,
      });
    });
  });

  describe('searchAnimeWithSeason', () => {
    it('should call searchAnime without season when no season specified', async () => {
      // Arrange
      const searchAnimeSpy = jest.spyOn(animeSearchService, 'searchAnime');
      searchAnimeSpy.mockResolvedValue(sampleFormattedAnime);

      // Act
      const result =
        await animeSearchService.searchAnimeWithSeason('Test Anime');

      // Assert
      expect(searchAnimeSpy).toHaveBeenCalledWith('Test Anime', true);
      expect(result).toEqual(sampleFormattedAnime);
    });

    it('should return array when exact=false', async () => {
      // Arrange
      const searchAnimeSpy = jest.spyOn(animeSearchService, 'searchAnime');
      searchAnimeSpy.mockResolvedValue([sampleFormattedAnime]);

      // Act
      const result = await animeSearchService.searchAnimeWithSeason(
        'Test Anime',
        false,
      );

      // Assert
      expect(searchAnimeSpy).toHaveBeenCalledWith('Test Anime', false);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([sampleFormattedAnime]);
    });

    it('should use findSeasonByNumber when season is specified', async () => {
      // Arrange
      const searchAnimeSpy = jest.spyOn(animeSearchService, 'searchAnime');
      const findSeasonSpy = jest.spyOn(
        animeSearchService as any,
        'findSeasonByNumber',
      );

      const mockBaseAnime = { ...sampleFormattedAnime };
      searchAnimeSpy.mockResolvedValue(mockBaseAnime);

      const seasonAnime = {
        ...sampleFormattedAnime,
        id: '456',
        title: 'Test Anime S2',
      };
      findSeasonSpy.mockResolvedValue([seasonAnime]);

      // Act
      const result = await animeSearchService.searchAnimeWithSeason(
        'Test Anime / S2',
        false,
      );

      // Assert
      expect(searchAnimeSpy).toHaveBeenCalledWith('Test Anime', true);
      expect(findSeasonSpy).toHaveBeenCalledWith(mockBaseAnime, 2);
      expect(result).toEqual([seasonAnime]);
    });

    it('should return base anime when no series ID is found', async () => {
      // Arrange
      const searchAnimeSpy = jest.spyOn(animeSearchService, 'searchAnime');
      const findSeasonSpy = jest.spyOn(
        animeSearchService as any,
        'findSeasonByNumber',
      );

      const mockBaseAnime = {
        id: '123',
        title: 'Test Anime',
        episodes: 13,
        format: 'TV',
        // No seriesId
      };
      searchAnimeSpy.mockResolvedValue(mockBaseAnime);

      // Act
      const result = await animeSearchService.searchAnimeWithSeason(
        'Test Anime / S2',
        true,
      );

      // Assert
      expect(searchAnimeSpy).toHaveBeenCalledWith('Test Anime', true);
      expect(findSeasonSpy).not.toHaveBeenCalled();
      expect(result).toEqual(mockBaseAnime);
    });

    it('should return null when no base anime is found and exact=true', async () => {
      // Arrange
      const searchAnimeSpy = jest.spyOn(animeSearchService, 'searchAnime');
      searchAnimeSpy.mockResolvedValue(null);

      // Act
      const result = await animeSearchService.searchAnimeWithSeason(
        'Nonexistent Anime / S2',
        true,
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should return empty array when no base anime is found and exact=false', async () => {
      // Arrange
      const searchAnimeSpy = jest.spyOn(animeSearchService, 'searchAnime');
      searchAnimeSpy.mockResolvedValue(null);

      // Act
      const result = await animeSearchService.searchAnimeWithSeason(
        'Nonexistent Anime / S2',
        false,
      );

      // Assert
      expect(result).toEqual([]);
    });

    it('should return base anime when season not found in chain', async () => {
      // Arrange
      const searchAnimeSpy = jest.spyOn(animeSearchService, 'searchAnime');
      const findSeasonSpy = jest.spyOn(
        animeSearchService as any,
        'findSeasonByNumber',
      );

      const mockBaseAnime = { ...sampleFormattedAnime };
      searchAnimeSpy.mockResolvedValue(mockBaseAnime);

      // Mock an empty season result (season not found)
      findSeasonSpy.mockResolvedValue([mockBaseAnime]);

      // Act
      const result = await animeSearchService.searchAnimeWithSeason(
        'Test Anime / S10',
        true,
      );

      // Assert
      expect(searchAnimeSpy).toHaveBeenCalledWith('Test Anime', true);
      expect(findSeasonSpy).toHaveBeenCalledWith(mockBaseAnime, 10);
      expect(result).toEqual(mockBaseAnime); // Should return single object, not array
    });

    it('should return same structure for season search and regular search when exact=true', async () => {
      // Arrange
      const regularSearchSpy = jest.spyOn(animeSearchService, 'searchAnime');

      const mockBaseAnime = { ...sampleFormattedAnime };
      regularSearchSpy.mockResolvedValue(mockBaseAnime);

      // Act
      const regularResult = await animeSearchService.searchAnime(
        'Test Anime',
        true,
      );

      // Set up season search to return same result structure
      regularSearchSpy.mockClear();
      regularSearchSpy.mockResolvedValue(mockBaseAnime);
      const findSeasonSpy = jest.spyOn(
        animeSearchService as any,
        'findSeasonByNumber',
      );
      findSeasonSpy.mockResolvedValue([mockBaseAnime]);

      const seasonResult = await animeSearchService.searchAnimeWithSeason(
        'Test Anime / S1',
        true,
      );

      // Assert
      expect(typeof regularResult).toEqual(typeof seasonResult);
      expect(regularResult).toHaveProperty('id');
      expect(seasonResult).toHaveProperty('id');
      expect(Array.isArray(regularResult)).toBe(false);
      expect(Array.isArray(seasonResult)).toBe(false);
    });

    it('should return same structure for season search and regular search when exact=false', async () => {
      // Arrange
      const regularSearchSpy = jest.spyOn(animeSearchService, 'searchAnime');

      regularSearchSpy.mockResolvedValue([sampleFormattedAnime]);

      // Act
      const regularResult = await animeSearchService.searchAnime(
        'Test Anime',
        false,
      );

      // Set up season search to return same result structure
      regularSearchSpy.mockClear();
      regularSearchSpy.mockResolvedValue(sampleFormattedAnime);
      const findSeasonSpy = jest.spyOn(
        animeSearchService as any,
        'findSeasonByNumber',
      );
      findSeasonSpy.mockResolvedValue([sampleFormattedAnime]);

      const seasonResult = await animeSearchService.searchAnimeWithSeason(
        'Test Anime / S1',
        false,
      );

      // Assert
      expect(Array.isArray(regularResult)).toBe(true);
      expect(Array.isArray(seasonResult)).toBe(true);
      expect(regularResult[0]).toHaveProperty('id');
      expect(seasonResult[0]).toHaveProperty('id');
    });
  });

  describe('findSeasonByNumber', () => {
    it('should return base anime when series data is not found', async () => {
      // Arrange
      const mockBaseAnime = { ...sampleFormattedAnime };
      mockSeriesModel.findOne.mockResolvedValue(null);

      // Act
      const result = await animeSearchService['findSeasonByNumber'](
        mockBaseAnime,
        2,
      );

      // Assert
      expect(result).toEqual([mockBaseAnime]);
      expect(mockSeriesModel.findOne).toHaveBeenCalledWith({
        seriesId: 'series1',
      });
    });

    it('should return base anime when no series anime IDs are found', async () => {
      // Arrange
      const mockBaseAnime = { ...sampleFormattedAnime };
      mockSeriesModel.findOne.mockResolvedValue({
        seriesId: 'series1',
        animeIds: [],
        spinOffIds: [],
        adaptationIds: [],
        characterIds: [],
        otherIds: [],
        relations: [],
        lean: () => ({
          seriesId: 'series1',
          animeIds: [],
          relations: [],
        }),
      });

      // Act
      const result = await animeSearchService['findSeasonByNumber'](
        mockBaseAnime,
        2,
      );

      // Assert
      expect(result).toEqual([mockBaseAnime]);
    });
  });
});
