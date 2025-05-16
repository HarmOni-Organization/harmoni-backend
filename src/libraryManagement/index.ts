/**
 * Library Management Module
 *
 * Exports the main LibraryManagementModule and all submodules
 * related to library content such as movies and anime.
 */
import { Module } from '@nestjs/common';
import { AnimeModule } from './anime/anime.module';
import { MovieModule } from './movie';

@Module({
  imports: [AnimeModule, MovieModule],
  exports: [AnimeModule, MovieModule],
})
export class LibraryManagementModule {}

export * from './anime/anime.module';
export * from './movie';
