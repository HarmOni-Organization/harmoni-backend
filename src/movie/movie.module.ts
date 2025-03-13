import { Module } from '@nestjs/common';
import { MovieController } from './movie.controller';
import { CommonModule } from '../common/common.module';
import { AiModule } from 'src/ai/ai.module';

@Module({
  imports: [CommonModule, AiModule],
  controllers: [MovieController],
})
export class MovieModule {}
