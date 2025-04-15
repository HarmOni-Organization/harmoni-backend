import { Test, TestingModule } from '@nestjs/testing';
import { PromptController } from './prompt.controller';
import { PromptService } from './prompt.service';
import {
  CreatePromptDto,
  UpdatePromptDto,
  PromptResponseDto,
} from '../dto/prompt.dto';

describe('PromptController', () => {
  let controller: PromptController;

  const mockPromptService = {
    createPrompt: jest.fn(),
    getPromptsByUserId: jest.fn(),
    getPromptById: jest.fn(),
    updatePrompt: jest.fn(),
    deletePrompt: jest.fn(),
  };

  const mockUser = {
    userId: 'test-user-id',
    username: 'testuser',
  };

  const mockPrompt: PromptResponseDto = {
    promptId: 'test-prompt-id',
    title: 'Test Prompt',
    content: 'This is a test prompt content',
    userId: mockUser.userId,
    tags: ['test', 'prompt'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromptController],
      providers: [
        {
          provide: PromptService,
          useValue: mockPromptService,
        },
      ],
    }).compile();

    controller = module.get<PromptController>(PromptController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPrompt', () => {
    it('should create a new prompt', async () => {
      const createPromptDto: CreatePromptDto = {
        title: 'New Prompt',
        content: 'This is a new prompt content',
        tags: ['new', 'prompt'],
      };
      const req = { user: mockUser };

      mockPromptService.createPrompt.mockResolvedValue({
        ...createPromptDto,
        promptId: 'generated-prompt-id',
        userId: mockUser.userId,
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });

      const result = await controller.createPrompt(req, createPromptDto);

      expect(result).toEqual({
        ...createPromptDto,
        promptId: 'generated-prompt-id',
        userId: mockUser.userId,
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
      expect(mockPromptService.createPrompt).toHaveBeenCalledWith(
        mockUser.userId,
        createPromptDto,
      );
    });
  });

  describe('getMyPrompts', () => {
    it('should return all prompts for the authenticated user', async () => {
      const req = { user: mockUser };
      const mockPrompts = [
        mockPrompt,
        { ...mockPrompt, promptId: 'test-prompt-id-2' },
      ];

      mockPromptService.getPromptsByUserId.mockResolvedValue(mockPrompts);

      const result = await controller.getMyPrompts(req);

      expect(result).toEqual(mockPrompts);
      expect(mockPromptService.getPromptsByUserId).toHaveBeenCalledWith(
        mockUser.userId,
      );
    });

    it('should return empty array when user has no prompts', async () => {
      const req = { user: mockUser };

      mockPromptService.getPromptsByUserId.mockResolvedValue([]);

      const result = await controller.getMyPrompts(req);

      expect(result).toEqual([]);
      expect(mockPromptService.getPromptsByUserId).toHaveBeenCalledWith(
        mockUser.userId,
      );
    });
  });

  describe('getPrompt', () => {
    it('should return a prompt by id', async () => {
      const promptId = 'test-prompt-id';

      mockPromptService.getPromptById.mockResolvedValue(mockPrompt);

      const result = await controller.getPrompt(promptId);

      expect(result).toEqual(mockPrompt);
      expect(mockPromptService.getPromptById).toHaveBeenCalledWith(promptId);
    });
  });

  describe('updatePrompt', () => {
    it('should update a prompt', async () => {
      const promptId = 'test-prompt-id';
      const req = { user: mockUser };
      const updatePromptDto: UpdatePromptDto = {
        title: 'Updated Title',
        content: 'Updated content',
        tags: ['updated', 'tags'],
      };
      const updatedPrompt = {
        ...mockPrompt,
        ...updatePromptDto,
        updatedAt: expect.any(Number),
      };

      mockPromptService.updatePrompt.mockResolvedValue(updatedPrompt);

      const result = await controller.updatePrompt(
        req,
        promptId,
        updatePromptDto,
      );

      expect(result).toEqual(updatedPrompt);
      expect(mockPromptService.updatePrompt).toHaveBeenCalledWith(
        promptId,
        mockUser.userId,
        updatePromptDto,
      );
    });

    it('should update only provided fields', async () => {
      const promptId = 'test-prompt-id';
      const req = { user: mockUser };
      const updatePromptDto: UpdatePromptDto = {
        title: 'Updated Title Only',
      };
      const updatedPrompt = {
        ...mockPrompt,
        title: updatePromptDto.title,
        updatedAt: expect.any(Number),
      };

      mockPromptService.updatePrompt.mockResolvedValue(updatedPrompt);

      const result = await controller.updatePrompt(
        req,
        promptId,
        updatePromptDto,
      );

      expect(result).toEqual(updatedPrompt);
      expect(mockPromptService.updatePrompt).toHaveBeenCalledWith(
        promptId,
        mockUser.userId,
        updatePromptDto,
      );
    });
  });

  describe('deletePrompt', () => {
    it('should delete a prompt', async () => {
      const promptId = 'test-prompt-id';
      const req = { user: mockUser };

      mockPromptService.deletePrompt.mockResolvedValue(undefined);

      const result = await controller.deletePrompt(req, promptId);

      expect(result).toEqual({ message: 'Prompt deleted successfully' });
      expect(mockPromptService.deletePrompt).toHaveBeenCalledWith(
        promptId,
        mockUser.userId,
      );
    });
  });
});
