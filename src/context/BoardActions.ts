import type { Card, CardVersion, Lane, Project } from '../types';

/**
 * All possible actions for the board reducer
 */
export type BoardAction =
  // Card actions
  | {
      type: 'ADD_CARD';
      payload: Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'projectId'>;
    }
  | { type: 'UPDATE_CARD'; payload: { id: string; updates: Partial<Card> } }
  | { type: 'DELETE_CARD'; payload: { id: string } }
  | { type: 'RESTORE_CARD'; payload: { id: string } }
  | { type: 'MOVE_CARD'; payload: { cardId: string; toLaneId: string; toIndex: number } }
  | { type: 'REORDER_CARDS'; payload: { laneId: string; cardIds: string[] } }
  | { type: 'UNDO_CARD'; payload: { cardId: string } }
  // Lane actions
  | { type: 'ADD_LANE'; payload: { title: string } }
  | { type: 'UPDATE_LANE'; payload: { id: string; updates: Partial<Lane> } }
  | { type: 'DELETE_LANE'; payload: { id: string } }
  | { type: 'REORDER_LANES'; payload: { laneIds: string[] } }
  // Project actions
  | { type: 'ADD_PROJECT'; payload: { title: string; thumbnailUrl?: string | null } }
  | { type: 'UPDATE_PROJECT'; payload: { id: string; updates: Partial<Project> } }
  | { type: 'DELETE_PROJECT'; payload: { id: string } }
  | { type: 'SET_ACTIVE_PROJECT'; payload: { id: string } }
  | { type: 'LOAD_STATE'; payload: BoardState }
  // Error handling
  | { type: 'SET_ERROR'; payload: string | null };

/**
 * Board state shape
 */
export interface BoardState {
  projects: Project[];
  activeProjectId: string | null;
  cards: Record<string, Card>;
  cardVersions: Record<string, CardVersion[]>;
  isLoading: boolean;
  error: string | null;
}

