export const generateRoomId = (): string => {
  return `${generateRandomSegment()}-${generateRandomSegment()}`;
};

const generateRandomSegment = (): string => {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
};

/**
 * Format seconds into a human-readable time string (MM:SS or HH:MM:SS)
 * @param seconds Total seconds to format
 * @returns Formatted time string
 */
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) {
    return '00:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
};
