# Recommendation System - Instance and Content

This document describes the recommendation system instance and content that has been created for the movie library management system.

## Files Created

### 1. `recommendation.service.ts` - Core Service Instance

- **Purpose**: Main service class that handles all recommendation business logic
- **Features**:
  - Genre-based movie recommendations
  - User-specific personalized recommendations
  - Service health testing
  - Enhanced error handling and debugging
  - Connection timeout management

### 2. `recommendation.examples.ts` - Example Content

- **Purpose**: Comprehensive examples and sample data
- **Contains**:
  - Usage examples for all service methods
  - Sample HTTP request/response structures
  - Mock data for testing
  - Environment variable documentation

### 3. `recommendation.instance.ts` - Instance Creation Utilities

- **Purpose**: Demonstrates various ways to create and use service instances
- **Features**:
  - Manual instance creation
  - Factory patterns for testing and production
  - Demo classes with complete usage examples
  - Quick start code snippets

## Updated Files

### 1. `movie.module.ts`

- Added `RecommendationService` to providers
- Exported the service for use in other modules

### 2. `recommendation.controller.ts`

- Refactored to use the new service
- Added new endpoints: `/genres` and `/examples`
- Simplified controller logic by delegating to service

### 3. `index.ts`

- Updated exports to include new service and examples

## Available Endpoints

| Endpoint                         | Method | Description                      |
| -------------------------------- | ------ | -------------------------------- |
| `/library/recommendations/genre` | GET    | Get movies by genre              |
| `/library/recommendations/movie` | GET    | Get personalized recommendations |
| `/library/recommendations/test`  | GET    | Test service connection          |
| `/library/recommendations/debug` | GET    | Get debug information            |

## Troubleshooting

### Common Error: "Recommendation service is currently unavailable"

This error typically occurs when the external recommendation API is not accessible. Here's how to debug:

#### 1. Test the Service Connection

```bash
curl http://localhost:3000/library/recommendations/test
```

#### 2. Check Debug Information

```bash
curl http://localhost:3000/library/recommendations/debug
```

#### 3. Verify Environment Variables

Make sure these are set in your environment:

```bash
HARMONI_RECOMMENDATION_API_URL=http://167.86.104.161:8020
X_INTERNAL_KEY=shared-internal-key-with-server-a  # or your custom key
```

#### 4. Check External Service

Test if the external recommendation service is running:

```bash
# Test if the service is accessible
curl http://167.86.104.161:8020/health

# Test the genre endpoint directly
curl -H "X-Internal-Key: shared-internal-key-with-server-a" \
     "http://167.86.104.161:8020/api/v1/movies/genre-based?genre=Action&topN=5"
```

#### 5. Common Issues and Solutions

| Error Type     | Cause                    | Solution                                       |
| -------------- | ------------------------ | ---------------------------------------------- |
| `ECONNREFUSED` | External service is down | Check if the recommendation service is running |
| `ETIMEDOUT`    | Network timeout          | Check network connectivity, increase timeout   |
| `ENOTFOUND`    | DNS resolution failed    | Verify the API URL is correct                  |
| `401/403`      | Authentication failed    | Check the X_INTERNAL_KEY value                 |

### Debug Mode

To enable detailed logging, set your log level to debug:

```bash
export LOG_LEVEL=debug
# or
NODE_ENV=development npm start
```

## Quick Usage

```typescript
// Inject the service in your class
constructor(
  private readonly recommendationService: RecommendationService
) {}

// Get genre recommendations
const actionMovies = await this.recommendationService.getGenreBasedRecommendations(
  { genre: 'Action', topN: 10 }
);

// Get user recommendations
const userRecs = await this.recommendationService.getUserRecommendations(
  { _id: 'user-id' },
  { movieId: 550, topN: 10 }
);
```

## Environment Variables Required

```bash
# Required
HARMONI_RECOMMENDATION_API_URL=http://167.86.104.161:8020
X_INTERNAL_KEY=shared-internal-key-with-server-a

# Optional
JWT_SECRET=your-jwt-secret
NODE_ENV=development
LOG_LEVEL=debug
```

## Example API Calls

### Test the service

```bash
curl http://localhost:3000/library/recommendations/test
```

### Get genre recommendations

```bash
curl "http://localhost:3000/library/recommendations/genre?genre=Action&topN=5" \
  -H "Authorization: Bearer your-token"
```

### Get user recommendations

```bash
curl "http://localhost:3000/library/recommendations/movie?movieId=550&topN=5" \
  -H "Authorization: Bearer your-token"
```

## Features

1. **Enhanced Error Handling**: Specific error types for different failure modes
2. **Detailed Logging**: Comprehensive logging for debugging
3. **Connection Management**: Timeout handling and retry logic
4. **Type Safety**: Full TypeScript interfaces and DTOs
5. **Debug Endpoints**: Built-in debugging capabilities
6. **Flexible Configuration**: Environment-based configuration

## Service Health Monitoring

The service includes built-in health monitoring:

- Connection testing with timeout
- Detailed error reporting
- Service availability checking
- Configuration validation

The recommendation system is now fully instantiated with enhanced error handling and debugging capabilities!
