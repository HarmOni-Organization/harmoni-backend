import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import { PromptService } from './prompt.service';
import {
  CreatePromptDto,
  UpdatePromptDto,
  PromptResponseDto,
} from '../dto/prompt.dto';

@Controller('prompts')
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

  @Post()
  async createPrompt(
    @Request() req,
    @Body() createPromptDto: CreatePromptDto,
  ): Promise<PromptResponseDto> {
    const userId = req.user.userId;
    return this.promptService.createPrompt(userId, createPromptDto);
  }

  @Get()
  async getMyPrompts(@Request() req): Promise<PromptResponseDto[]> {
    const userId = req.user.userId;
    return this.promptService.getPromptsByUserId(userId);
  }

  @Get(':promptId')
  async getPrompt(
    @Param('promptId') promptId: string,
  ): Promise<PromptResponseDto> {
    return this.promptService.getPromptById(promptId);
  }

  @Put(':promptId')
  async updatePrompt(
    @Request() req,
    @Param('promptId') promptId: string,
    @Body() updatePromptDto: UpdatePromptDto,
  ): Promise<PromptResponseDto> {
    const userId = req.user.userId;
    return this.promptService.updatePrompt(promptId, userId, updatePromptDto);
  }

  @Delete(':promptId')
  async deletePrompt(
    @Request() req,
    @Param('promptId') promptId: string,
  ): Promise<{ message: string }> {
    const userId = req.user.userId;
    await this.promptService.deletePrompt(promptId, userId);
    return { message: 'Prompt deleted successfully' };
  }
}
