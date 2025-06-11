# Hourly Caching System for CryptoSage

## Overview

CryptoSage now implements a **scheduled hourly data fetching system** that automatically updates cryptocurrency data every hour starting at 10:00 GMT+2. This system ensures consistent data freshness while eliminating manual refresh options for users.

## Key Features

### 🕙 Scheduled Updates
- **Start Time**: 10:00 GMT+2 (9:00 AM Central European Time)
- **Frequency**: Every hour on the hour (10:00, 11:00, 12:00, etc.)
- **Automatic**: No manual refresh buttons or cache clearing options

### 📦 Smart Caching
- Data is cached for exactly one hour
- Cache automatically expires at the next scheduled fetch time
- All API calls respect the hourly cache window
- Performance data updates within the current hour window

### 🚫 No Manual Refresh
- Users cannot manually refresh or clear cache
- Data consistency across all users during each hour window
- Eliminates cache-related inconsistencies

## Architecture

### Core Components

1. **`CacheService`** (`src/services/cacheService.ts`)
   - Modified to implement hourly scheduling
   - Calculates next fetch times based on GMT+2 timezone
   - Validates cache freshness within hour windows

2. **`ScheduledDataFetcher`** (`src/services/scheduledDataFetcher.ts`)
   - Manages automatic data fetching every hour
   - Prevents multiple simultaneous fetches
   - Handles errors gracefully

3. **`API Service`** (`src/services/api.ts`)
   - Respects hourly caching schedule
   - Returns cached data within hour windows
   - Allows critical data (coin details, price history) outside schedule

### Data Flow

```
10:00 GMT+2 ─┐
             ├─ Fetch fresh data
             ├─ Cache for 1 hour
             └─ Serve cached data until 11:00

11:00 GMT+2 ─┐
             ├─ Fetch fresh data
             ├─ Cache for 1 hour
             └─ Serve cached data until 12:00
```

## Implementation Details

### Cache Keys Structure
```typescript
interface CachedRecommendations {
  recommendations: CryptoAnalysis[];
  timestamp: number;
  date: string;
  fetchedAt: Date;          // When data was fetched
  nextFetchTime: Date;      // When next fetch is scheduled
}
```

### Timezone Handling
- All scheduling is based on GMT+2 (Central European Summer Time)
- Automatic conversion between local time and GMT+2
- Handles daylight saving time transitions

### Error Handling
- Graceful fallback when APIs are unavailable
- Shows appropriate messages when no data is available
- Continues attempting fetches on schedule

## User Experience

### Loading States
- **Fresh Data**: "🟢 Current hour data"
- **Waiting**: "🟡 Waiting for next hour"
- **No Cache**: "🔄 Scheduled updates every hour"

### Next Update Display
- Shows countdown to next scheduled fetch
- Format: "Next update: 25 minutes" or "Next update: 1h 15m"
- Real-time updates every 30 seconds

### Error Messages
- Clear indication when data is unavailable
- Explains the hourly update schedule
- No retry buttons during non-scheduled times

## Configuration

### Modifying the Schedule
To change the start time or frequency, modify these constants in `CacheService`:

```typescript
private readonly FETCH_START_HOUR_GMT_PLUS_2 = 10; // Start hour in GMT+2
private readonly TIMEZONE_OFFSET = 2; // GMT+2 offset
```

### Cache Duration
The system automatically calculates cache expiration based on the next scheduled fetch time. No manual cache duration configuration is needed.

## Benefits

1. **Consistent Data**: All users see the same data during each hour window
2. **Reduced API Load**: Minimizes API calls while maintaining freshness
3. **Predictable Updates**: Users know exactly when new data will be available
4. **Battery Efficient**: Reduces unnecessary background requests
5. **Error Resilience**: Graceful handling of API failures

## Monitoring

### Console Logs
The system provides detailed logging:
- Cache status on app initialization
- Scheduled fetch attempts
- Success/failure of data fetches
- Cache hit/miss information

### Status Information
- Real-time fetcher status
- Cache age and freshness
- Next scheduled fetch time
- Current data source information

## Migration Notes

### From Previous System
- Old 6-hour cache duration replaced with hourly schedule
- Manual refresh functionality removed
- Cache keys updated to include scheduling information
- Error handling improved for scheduled scenarios

### Backward Compatibility
- Existing cache entries are automatically cleaned up
- Performance tracking continues to work
- All existing features maintained except manual refresh

## Future Enhancements

Potential improvements to consider:
- User-configurable update preferences
- Multiple timezone support
- Weekend/holiday schedule adjustments
- Real-time data streaming for critical updates
- A/B testing for different update frequencies 