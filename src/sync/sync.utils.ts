export const generateRoomId = (): string => {
  return `${generateRandomSegment()}-${generateRandomSegment()}`;
};

const generateRandomSegment = (): string => {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
};
