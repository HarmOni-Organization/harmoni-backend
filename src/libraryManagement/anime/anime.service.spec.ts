import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AnimeService } from './anime.service';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { IAnime } from '../../schemas/animeDB/anime.schema';
import { ISeries } from '../../schemas/animeDB/series.schema';

// Mock data
const mockAnimeData = [
  {
    _doc: {
      _id: 'anime1',
      id: 'anime1',
      title: { userPreferred: 'Main Anime 1' },
      type: 'ANIME',
      startDate: { year: 2020, month: 1, day: 1 },
      format: 'TV',
      episodes: 12,
      duration: 24,
      description: 'Test anime 1',
      season: 'WINTER',
      seasonYear: 2020,
    },
  },
  {
    _doc: {
      _id: 'anime2',
      id: 'anime2',
      title: { userPreferred: 'Sequel Anime 2' },
      type: 'ANIME',
      startDate: { year: 2021, month: 1, day: 1 },
      format: 'TV',
      episodes: 12,
      duration: 24,
      description: 'Test anime 2',
      season: 'WINTER',
      seasonYear: 2021,
    },
  },
  {
    _doc: {
      _id: 'adaptation1',
      id: 'adaptation1',
      title: { userPreferred: 'Adaptation 1' },
      type: 'MANGA',
      format: 'MANGA',
      startDate: { year: 2019, month: 5, day: 10 },
      description: 'Manga adaptation',
    },
  },
  {
    _doc: {
      _id: 'character1',
      id: 'character1',
      title: { userPreferred: 'Character Show 1' },
      type: 'ANIME',
      format: 'TV',
      startDate: { year: 2022, month: 3, day: 15 },
      description: 'Character related anime',
    },
  },
  {
    _doc: {
      _id: 'spinoff1',
      id: 'spinoff1',
      title: { userPreferred: 'Spinoff 1' },
      type: 'ANIME',
      format: 'OVA',
      startDate: { year: 2021, month: 8, day: 20 },
      description: 'Spinoff anime',
    },
  },
  {
    _doc: {
      _id: 'other1',
      id: 'other1',
      title: { userPreferred: 'Other 1' },
      type: 'ANIME',
      format: 'MOVIE',
      startDate: { year: 2023, month: 2, day: 5 },
      description: 'Other related anime',
    },
  },
];

const mockSeriesData = {
  _id: 'series1',
  seriesId: 'series1',
  animeIds: ['anime1', 'anime2'],
  otherIds: ['other1'],
  characterIds: ['character1'],
  adaptationIds: ['adaptation1'],
  spinOffIds: ['spinoff1'],
  relations: [
    {
      sourceAnimeId: 'anime1',
      targetAnimeId: 'anime2',
      relationType: 'SEQUEL',
      direction: 'forward',
    },
  ],
  updatedAt: new Date(),
  lastAutomatedUpdate: new Date(),
  manuallyModified: {
    isModified: false,
    modifiedAt: new Date(),
    modifiedFields: [],
    modifiedBy: '',
    comments: '',
  },
  exec: jest.fn().mockResolvedValue(null),
  findOne: jest.fn().mockReturnThis(),
};

describe('AnimeService', () => {
  let service: AnimeService;
  let animeModel: Model<IAnime>;
  let seriesModel: Model<ISeries>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnimeService,
        {
          provide: getModelToken('Anime', 'animeDB'),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getModelToken('Series', 'animeDB'),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnimeService>(AnimeService);
    animeModel = module.get<Model<IAnime>>(getModelToken('Anime', 'animeDB'));
    seriesModel = module.get<Model<ISeries>>(
      getModelToken('Series', 'animeDB'),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSeriesById', () => {
    it('should return series data with populated anime objects', async () => {
      // Setup mock for series findOne
      const seriesFindOneMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSeriesData),
      });
      jest.spyOn(seriesModel, 'findOne').mockImplementation(seriesFindOneMock);

      // Setup mock for anime find
      const animeFindMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockAnimeData),
        }),
      });
      jest.spyOn(animeModel, 'find').mockImplementation(animeFindMock);

      // Call the service method
      const result = await service.getSeriesById('series1');

      // Verify series lookup
      expect(seriesModel.findOne).toHaveBeenCalledWith({
        seriesId: 'series1',
      });

      // Verify anime data lookup with all IDs
      expect(animeModel.find).toHaveBeenCalledWith({
        id: {
          $in: [
            ...mockSeriesData.animeIds,
            ...mockSeriesData.spinOffIds,
            ...mockSeriesData.adaptationIds,
            ...mockSeriesData.characterIds,
            ...mockSeriesData.spinOffIds,
          ],
        },
      });

      // Verify the response structure
      expect(result).toBeDefined();
      expect(result.seriesId).toBe('series1');

      // Check that ID arrays are replaced with anime objects
      expect(result.otherIds).toBeInstanceOf(Array);
      expect(result.otherIds[0]).toEqual(
        expect.objectContaining({
          title: { userPreferred: 'Other 1' },
        }),
      );

      expect(result.characterIds).toBeInstanceOf(Array);
      expect(result.characterIds[0]).toEqual(
        expect.objectContaining({
          title: { userPreferred: 'Character Show 1' },
        }),
      );

      expect(result.adaptationIds).toBeInstanceOf(Array);
      expect(result.adaptationIds[0]).toEqual(
        expect.objectContaining({
          title: { userPreferred: 'Adaptation 1' },
        }),
      );

      expect(result.spinOffIds).toBeInstanceOf(Array);
      expect(result.spinOffIds[0]).toEqual(
        expect.objectContaining({
          title: { userPreferred: 'Spinoff 1' },
        }),
      );

      // Check main series
      expect(result.mainSeries).toBeDefined();
      expect(result.mainSeries.title).toContain('Main Anime 1');
      expect(result.mainSeries.anime).toHaveLength(2);

      // Check relations
      expect(result.relations).toEqual(mockSeriesData.relations);
    });

    it('should handle missing series data', async () => {
      // Setup series findOne to return null (not found)
      const seriesFindOneMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      jest.spyOn(seriesModel, 'findOne').mockImplementation(seriesFindOneMock);

      // Expect the service to throw NotFoundException
      await expect(service.getSeriesById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );

      expect(seriesModel.findOne).toHaveBeenCalledWith({
        seriesId: 'nonexistent',
      });
    });

    it('should handle missing anime data gracefully', async () => {
      // Setup series findOne to return data
      const seriesFindOneMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSeriesData),
      });
      jest.spyOn(seriesModel, 'findOne').mockImplementation(seriesFindOneMock);

      // Setup anime find to return empty array (no anime found)
      const animeFindMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });
      jest.spyOn(animeModel, 'find').mockImplementation(animeFindMock);

      // Expect InternalServerErrorException because no valid anime data found
      await expect(service.getSeriesById('series1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should filter out null/undefined values when mapping IDs to anime data', async () => {
      // Create mock data with missing anime entries
      const partialMockSeriesData = {
        ...mockSeriesData,
        otherIds: ['other1', 'missing1'],
        characterIds: ['character1', 'missing2'],
      };

      // Setup series findOne to return data
      const seriesFindOneMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(partialMockSeriesData),
      });
      jest.spyOn(seriesModel, 'findOne').mockImplementation(seriesFindOneMock);

      // Setup anime find to return only existing anime
      const animeFindMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockAnimeData),
        }),
      });
      jest.spyOn(animeModel, 'find').mockImplementation(animeFindMock);

      // Call the service method
      const result = await service.getSeriesById('series1');

      // Verify that arrays only include valid entries
      expect(result.otherIds).toHaveLength(1); // Only 'other1' should be included
      expect(result.otherIds[0]).toHaveProperty('title');
      expect(result.otherIds[0].title.userPreferred).toBe('Other 1');

      expect(result.characterIds).toHaveLength(1); // Only 'character1' should be included
      expect(result.characterIds[0]).toHaveProperty('title');
      expect(result.characterIds[0].title.userPreferred).toBe(
        'Character Show 1',
      );
    });
  });
});
