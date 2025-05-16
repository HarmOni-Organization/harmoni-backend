# Library Management Module

This module centralizes all library-related functionalities including movies and anime.

## Structure

- **Movie Module**: Provides endpoints for accessing movie data and recommendations
- **Anime Module**: Provides endpoints for accessing anime data and series information

## API Endpoints

All endpoints are prefixed with `/library` to maintain a clean API structure:

- Movies: `/library/movies/...`
- Movie Recommendations: `/library/recommendations/...`
- Anime: `/library/anime/...`

## Module Organization

The library management module consists of several submodules:

```
libraryManagement/
├── index.ts           # Main module exports
├── anime/             # Anime-related functionality
│   ├── anime.module.ts
│   ├── anime.controller.ts
│   ├── anime.service.ts
│   └── dto/           # Data Transfer Objects
├── movie/             # Movie-related functionality
│   ├── movie.module.ts
│   ├── movie.controller.ts
│   ├── recommendation.controller.ts
│   └── dto/           # Data Transfer Objects
```

## Database Connections

- Movie data uses the default MongoDB connection (`DB_URL`)
- Anime data uses a separate MongoDB connection (`ANIME_DB_URL`)
