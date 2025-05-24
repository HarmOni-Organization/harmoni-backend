# Smart Anime Search with Season Support

## Overview

This feature enhances the anime search functionality by adding the ability to search for specific seasons of an anime series. It parses queries that include season information and returns the appropriate season entry from the series.

## Features

- Parses queries like "Overlord / S3", "Attack on Titan / season 2", "Fate/stay night / Season 1"
- Supports various season format indicators (S3, Season 2, sezon3, part4, chapter2, etc.)
- Handles edge cases like titles with numbers (86, 91 Days)
- Uses existing series relationships to find the correct season entries
- Falls back to normal search when no season is specified

## API Endpoint

```
GET /library/anime/search?name=Overlord / S3&exact=false
```

### Parameters

- `name` (required): The search query text, optionally including season information
- `exact` (optional): When true, returns only the single closest match (defaults to true)

### Response

Returns anime matching the search query with the specified season if found.

If `exact=true` (default), returns a single object:

```json
{
  "id": "anime_06211c05-8ce0-4289-b6d4-ad41b984154f",
  "seriesId": "series_612c6510-3948-4a0c-a856-6f961e2b478a",
  "title": "Overlord",
  "episodes": 13,
  "format": "TV"
}
```

If `exact=false`, returns an array of objects with the same structure:

```json
[
  {
    "id": "anime_06211c05-8ce0-4289-b6d4-ad41b984154f",
    "seriesId": "series_612c6510-3948-4a0c-a856-6f961e2b478a",
    "title": "Overlord",
    "episodes": 13,
    "format": "TV"
  },
  {
    "id": "anime_f8a12c05-3be0-4389-b1a4-cd41b9234b1f",
    "seriesId": "series_612c6510-3948-4a0c-a856-6f961e2b478a",
    "title": "Overlord II",
    "episodes": 13,
    "format": "TV"
  }
]
```

### Cache Management

If you encounter outdated or incorrect results, you can clear the internal cache:

```
GET /library/anime/clear-cache
```

#### Response

```json
{
  "success": true,
  "clearedEntries": 12
}
```

## Implementation Details

1. **Title and Season Extraction**: Parses the query to extract the anime title and season information.
2. **Base Anime Search**: Searches for the base anime using the existing search functionality.
3. **Series Relations**: Uses the series relations to build a graph of related anime.
4. **Chain Building**: Builds chains of sequential anime from the relation graph.
5. **Season Selection**: Finds the correct season in the chain based on the season number.

## Supported Input Formats

| Input Example                    | Result                                        |
| -------------------------------- | --------------------------------------------- |
| Overlord / S3                    | Matches Overlord Season 3                     |
| Attack on Titan / sezon2         | Matches AoT Season 2                          |
| Fate/stay night / Season 1       | Matches Fate SN Season 1                      |
| JoJo's Bizarre Adventure / part5 | Matches JoJo Part 5                           |
| 91 Days                          | Matches without attempting season parsing     |
| Overlord / Latest                | Treated as a title without season information |

## Usage Examples

### Finding a specific season

```javascript
// Front-end example
async function findSeason() {
  const query = 'My Hero Academia / S4';
  const response = await fetch(
    `/library/anime/search?name=${encodeURIComponent(query)}`,
  );
  const data = await response.json();
  return data; // Returns single object with anime data
}
```

### Searching for multiple results

```javascript
async function searchMultipleResults() {
  const query = 'Attack on Titan';
  const response = await fetch(
    `/library/anime/search?name=${encodeURIComponent(query)}&exact=false`,
  );
  const data = await response.json();
  return data; // Returns array of matching anime
}
```

### Handling titles with slashes

The system correctly handles titles with slashes when followed by season information:

```
GET /library/anime/search?name=Fate/stay night/Heaven's Feel / Season 2
```

## Edge Cases

- If the requested season doesn't exist, returns the base anime match
- If no series ID is found for the base anime, returns the base anime
- If no base anime is found, returns null (if exact=true) or empty array (if exact=false)
- Titles with slashes are handled correctly when followed by season information

## Troubleshooting

If you encounter incorrect or missing season information:

1. Make sure the series has proper relation data in the database
2. Check that the season format is recognized (S1, Season 2, part3, etc.)
3. Try clearing the cache using the `/library/anime/clear-cache` endpoint
4. If problems persist, verify that the requested anime exists in the database

## Future Improvements

- Add support for more season formats
- Improve chain building to better handle complex series relationships
- Add support for other types of queries (e.g., "first season", "latest season")
