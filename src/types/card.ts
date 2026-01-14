import type { Label } from './label';

/**
 * Card type categories
 */
export type CardType = 'feature' | 'bug' | 'task' | 'story';

/**
 * Priority levels for cards
 */
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * A card on the board
 */
export interface Card {
  id: string;
  title: string;
  description: string;
  type: CardType;
  priority: Priority;
  dueDate: string | null; // ISO date string for serialization
  labels: Label[];
  assignee: string | null;
  laneId: string;
  order: number;
  isDeleted: boolean; // Soft delete flag
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

/**
 * Card data without system-managed fields (for creating/updating)
 */
export type CardInput = Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>;

/**
 * Versioned snapshot of a card for undo functionality
 */
export interface CardVersion {
  id: string;
  cardId: string;
  version: number;
  data: Omit<Card, 'id'>;
  timestamp: string; // ISO date string
}

