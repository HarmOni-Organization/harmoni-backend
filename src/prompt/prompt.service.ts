import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Prompt } from '../schemas/prompt.schema';
import { CreatePromptDto, UpdatePromptDto } from '../dto/prompt.dto';

@Injectable()
export class PromptService {
  constructor(@InjectModel(Prompt.name) private promptModel: Model<Prompt>) {}

  async createPrompt(
    userId: string,
    createPromptDto: CreatePromptDto,
  ): Promise<Prompt> {
    const promptId = uuidv4();
    const createdPrompt = new this.promptModel({
      promptId,
      userId,
      title: createPromptDto.title || '',
      content: createPromptDto.content,
      tags: createPromptDto.tags || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return createdPrompt.save();
  }

  async getAllPrompts(): Promise<Prompt[]> {
    return this.promptModel.find().exec();
  }

  async getPromptsByUserId(userId: string): Promise<Prompt[]> {
    return this.promptModel.find({ userId }).exec();
  }

  async getPromptById(promptId: string): Promise<Prompt> {
    const prompt = await this.promptModel.findOne({ promptId }).exec();
    if (!prompt) {
      throw new NotFoundException(`Prompt with ID ${promptId} not found`);
    }
    return prompt;
  }

  async updatePrompt(
    promptId: string,
    userId: string,
    updatePromptDto: UpdatePromptDto,
  ): Promise<Prompt> {
    const prompt = await this.promptModel.findOne({ promptId }).exec();

    if (!prompt) {
      throw new NotFoundException(`Prompt with ID ${promptId} not found`);
    }

    if (prompt.userId !== userId) {
      throw new NotFoundException(
        `You don't have permission to update this prompt`,
      );
    }

    // Only update fields that are provided
    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (updatePromptDto.title !== undefined) {
      updateData.title = updatePromptDto.title;
    }

    if (updatePromptDto.content !== undefined) {
      updateData.content = updatePromptDto.content;
    }

    if (updatePromptDto.tags !== undefined) {
      updateData.tags = updatePromptDto.tags;
    }

    return this.promptModel
      .findOneAndUpdate({ promptId }, { $set: updateData }, { new: true })
      .exec();
  }

  async deletePrompt(promptId: string, userId: string): Promise<void> {
    const prompt = await this.promptModel.findOne({ promptId }).exec();

    if (!prompt) {
      throw new NotFoundException(`Prompt with ID ${promptId} not found`);
    }

    if (prompt.userId !== userId) {
      throw new NotFoundException(
        `You don't have permission to delete this prompt`,
      );
    }

    await this.promptModel.deleteOne({ promptId }).exec();
  }
}
