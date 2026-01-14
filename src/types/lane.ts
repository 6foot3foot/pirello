/**
 * A lane (column) on the board that contains cards
 */
export interface Lane {
  id: string;
  title: string;
  order: number;
  cardIds: string[]; // References to cards in display order
}

/**
 * Lane data for creating a new lane
 */
export type LaneInput = Omit<Lane, 'id' | 'cardIds'>;

/**
 * Default lane configuration
 */
export const DEFAULT_LANES: Omit<Lane, 'id'>[] = [
  { title: 'Todo', order: 0, cardIds: [] },
  { title: 'Doing', order: 1, cardIds: [] },
  { title: 'Done', order: 2, cardIds: [] },
];

