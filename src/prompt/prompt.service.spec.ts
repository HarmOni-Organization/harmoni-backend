import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { PromptService } from './prompt.service';
import { Prompt } from '../schemas/prompt.schema';
import { CreatePromptDto, UpdatePromptDto } from '../dto/prompt.dto';

const mockPrompt = {
  promptId: 'test-prompt-id',
  title: 'Test Prompt',
  content: 'This is a test prompt content',
  userId: 'test-user-id',
  tags: ['test', 'prompt'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe('PromptService', () => {
  let service: PromptService;

  // Create a proper mock for the Mongoose model
  const mockSave = jest.fn();

  // Use a type assertion to help TypeScript understand our mock
  const MockPromptModel = jest.fn().mockImplementation(() => ({
    save: mockSave,
  })) as unknown as jest.Mock & {
    find: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    deleteOne: jest.Mock;
  };

  MockPromptModel.find = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue([]),
  });

  MockPromptModel.findOne = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(null),
  });

  MockPromptModel.findOneAndUpdate = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(null),
  });

  MockPromptModel.deleteOne = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptService,
        {
          provide: getModelToken(Prompt.name),
          useValue: MockPromptModel,
        },
      ],
    }).compile();

    service = module.get<PromptService>(PromptService);
  });

  describe('createPrompt', () => {
    it('should create a new prompt', async () => {
      const createPromptDto: CreatePromptDto = {
        title: 'New Prompt',
        content: 'This is a new prompt content',
        tags: ['new', 'prompt'],
      };
      const userId = 'user-123';

      // Create expected result
      const mockPromptData = {
        promptId: 'test-uuid',
        userId,
        title: createPromptDto.title,
        content: createPromptDto.content,
        tags: createPromptDto.tags,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Set up the mock to return the expected data
      mockSave.mockResolvedValue(mockPromptData);

      const result = await service.createPrompt(userId, createPromptDto);

      expect(result).toEqual(mockPromptData);
    });

    it('should create a prompt with default values when optional fields are not provided', async () => {
      const createPromptDto: CreatePromptDto = {
        content: 'Just content, no title or tags',
      };
      const userId = 'user-123';

      // Create expected result
      const mockPromptData = {
        promptId: 'test-uuid',
        userId,
        title: '',
        content: createPromptDto.content,
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Set up the mock to return the expected data
      mockSave.mockResolvedValue(mockPromptData);

      const result = await service.createPrompt(userId, createPromptDto);

      expect(result).toEqual(mockPromptData);
    });
  });

  describe('getAllPrompts', () => {
    it('should return an array of all prompts', async () => {
      const mockPrompts = [
        mockPrompt,
        { ...mockPrompt, promptId: 'test-prompt-id-2' },
      ];

      MockPromptModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPrompts),
      });

      const result = await service.getAllPrompts();

      expect(result).toEqual(mockPrompts);
      expect(MockPromptModel.find).toHaveBeenCalled();
    });
  });

  describe('getPromptsByUserId', () => {
    it('should return prompts for a specific user', async () => {
      const userId = 'test-user-id';
      const mockPrompts = [
        mockPrompt,
        { ...mockPrompt, promptId: 'test-prompt-id-2' },
      ];

      MockPromptModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPrompts),
      });

      const result = await service.getPromptsByUserId(userId);

      expect(result).toEqual(mockPrompts);
      expect(MockPromptModel.find).toHaveBeenCalledWith({ userId });
    });

    it('should return empty array when user has no prompts', async () => {
      const userId = 'user-with-no-prompts';

      MockPromptModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getPromptsByUserId(userId);

      expect(result).toEqual([]);
      expect(MockPromptModel.find).toHaveBeenCalledWith({ userId });
    });
  });

  describe('getPromptById', () => {
    it('should return a prompt by its promptId', async () => {
      const promptId = 'test-prompt-id';

      MockPromptModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPrompt),
      });

      const result = await service.getPromptById(promptId);

      expect(result).toEqual(mockPrompt);
      expect(MockPromptModel.findOne).toHaveBeenCalledWith({ promptId });
    });

    it('should throw NotFoundException when prompt does not exist', async () => {
      const promptId = 'non-existent-prompt-id';

      MockPromptModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getPromptById(promptId)).rejects.toThrow(
        NotFoundException,
      );
      expect(MockPromptModel.findOne).toHaveBeenCalledWith({ promptId });
    });
  });

  describe('updatePrompt', () => {
    it('should update a prompt successfully', async () => {
      const promptId = 'test-prompt-id';
      const userId = 'test-user-id';
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

      MockPromptModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPrompt),
      });

      MockPromptModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedPrompt),
      });

      const result = await service.updatePrompt(
        promptId,
        userId,
        updatePromptDto,
      );

      expect(result).toEqual(updatedPrompt);
      expect(MockPromptModel.findOne).toHaveBeenCalledWith({ promptId });
      expect(MockPromptModel.findOneAndUpdate).toHaveBeenCalledWith(
        { promptId },
        {
          $set: expect.objectContaining({
            title: updatePromptDto.title,
            content: updatePromptDto.content,
            tags: updatePromptDto.tags,
            updatedAt: expect.any(Number),
          }),
        },
        { new: true },
      );
    });

    it('should update only provided fields', async () => {
      const promptId = 'test-prompt-id';
      const userId = 'test-user-id';
      const updatePromptDto: UpdatePromptDto = {
        title: 'Updated Title Only',
      };
      const updatedPrompt = {
        ...mockPrompt,
        title: updatePromptDto.title,
        updatedAt: expect.any(Number),
      };

      MockPromptModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPrompt),
      });

      MockPromptModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedPrompt),
      });

      const result = await service.updatePrompt(
        promptId,
        userId,
        updatePromptDto,
      );

      expect(result).toEqual(updatedPrompt);
      expect(MockPromptModel.findOneAndUpdate).toHaveBeenCalledWith(
        { promptId },
        {
          $set: expect.objectContaining({
            title: updatePromptDto.title,
            updatedAt: expect.any(Number),
          }),
        },
        { new: true },
      );
    });

    it('should throw NotFoundException when prompt does not exist', async () => {
      const promptId = 'non-existent-prompt-id';
      const userId = 'test-user-id';
      const updatePromptDto: UpdatePromptDto = { title: 'Updated Title' };

      MockPromptModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updatePrompt(promptId, userId, updatePromptDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user is not the owner', async () => {
      const promptId = 'test-prompt-id';
      const wrongUserId = 'wrong-user-id';
      const updatePromptDto: UpdatePromptDto = { title: 'Updated Title' };

      MockPromptModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPrompt),
      });

      await expect(
        service.updatePrompt(promptId, wrongUserId, updatePromptDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deletePrompt', () => {
    it('should delete a prompt successfully', async () => {
      const promptId = 'test-prompt-id';
      const userId = 'test-user-id';

      MockPromptModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPrompt),
      });

      MockPromptModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      await service.deletePrompt(promptId, userId);

      expect(MockPromptModel.findOne).toHaveBeenCalledWith({ promptId });
      expect(MockPromptModel.deleteOne).toHaveBeenCalledWith({ promptId });
    });

    it('should throw NotFoundException when prompt does not exist', async () => {
      const promptId = 'non-existent-prompt-id';
      const userId = 'test-user-id';

      MockPromptModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deletePrompt(promptId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when user is not the owner', async () => {
      const promptId = 'test-prompt-id';
      const wrongUserId = 'wrong-user-id';

      MockPromptModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPrompt),
      });

      await expect(service.deletePrompt(promptId, wrongUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
