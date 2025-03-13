import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';
import { IsString } from 'class-validator';

class TreeInputDto {
  @IsString()
  tree: string;
}

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /** Extract anime/movie names from directory structure */
  @Post('extract-names')
  async extractMovieAnimeNames(@Body() treeInput: TreeInputDto) {
    if (!treeInput.tree) {
      throw new BadRequestException('Tree structure is required.');
    }
    const extractedNames = await this.aiService.extractMovieAnimeNames(
      treeInput.tree,
    );
    return { extractedNames };
  }
}
