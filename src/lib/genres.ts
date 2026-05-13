export const GENRES = [
  'Rock', 'Pop', 'Jazz', 'Hip-Hop', 'Electronic',
  'Folk', 'Classical', 'Metal', 'R&B', 'Indie',
] as const;

export type Genre = typeof GENRES[number];
