# Anime Module

This module provides functionality for retrieving anime data from the anime database.

## Environment Setup

Make sure to set the `ANIME_DB_URL` environment variable in your `.env` file:

```
ANIME_DB_URL=mongodb://localhost:27017/animedb
```

## API Endpoints

### Get Anime by ID

```
GET /library/anime/:id
```

Returns a single anime by its ID.

### Get Multiple Anime by IDs

```
GET /library/anime?ids=id1,id2,id3
```

Returns multiple anime based on the provided IDs.

### Get Series with Anime Details

```
GET /library/anime/series/:id
```

Returns a series by its ID along with detailed information about all anime in the series.

## Data Models

The module uses the following main data models:

- `Anime`: Represents an anime entry with details like title, description, genres, etc.
- `Series`: Represents a collection of related anime with information about their relationships.

## Database Connection

This module uses a separate MongoDB connection named 'animeDB' which is configured in the app module.
