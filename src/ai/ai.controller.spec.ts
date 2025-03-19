import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { BadRequestException } from '@nestjs/common';

describe('AiController', () => {
  let controller: AiController;
  let aiService: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: {
            extractMovieAnimeNames: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
    aiService = module.get<AiService>(AiService);
  });

  describe('Controller Setup', () => {
    it('should be properly initialized', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('Name Extraction Endpoint', () => {
    it('extracts names from directory structure', async () => {
      // Setup
      const mockTree = 'sample directory tree';
      const mockExtractedNames = ['Movie 1', 'Anime 2'];
      jest
        .spyOn(aiService, 'extractMovieAnimeNames')
        .mockResolvedValue(mockExtractedNames);

      // Execute
      const result = await controller.extractMovieAnimeNames({
        tree: mockTree,
      });

      // Verify
      expect(result).toEqual({ extractedNames: mockExtractedNames });
      expect(aiService.extractMovieAnimeNames).toHaveBeenCalledWith(mockTree);
    });

    it('rejects empty tree input', async () => {
      // Execute & Verify
      await expect(
        controller.extractMovieAnimeNames({ tree: '' }),
      ).rejects.toThrow(BadRequestException);

      expect(aiService.extractMovieAnimeNames).not.toHaveBeenCalled();
    });
  });
});
