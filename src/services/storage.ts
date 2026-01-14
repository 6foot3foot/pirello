import type { BoardState } from '../context';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const BOARD_ENDPOINT = `${API_BASE}/api/board`;
const REQUEST_TIMEOUT_MS = 4000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Storage service for persisting board state via API
 */
export const storage = {
  /**
   * Save board state to API
   */
  async save(state: BoardState): Promise<void> {
    try {
      const response = await fetchWithTimeout(BOARD_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      if (!response.ok) {
        throw new Error(`Save failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to save state to API:', error);
    }
  },

  /**
   * Load board state from API
   * Returns null if no saved state exists
   */
  async load(): Promise<BoardState | null> {
    try {
      const response = await fetchWithTimeout(BOARD_ENDPOINT);
      if (response.status === 204) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Load failed with status ${response.status}`);
      }
      return (await response.json()) as BoardState;
    } catch (error) {
      console.error('Failed to load state from API:', error);
      return null;
    }
  },

  /**
   * Clear saved state from API
   */
  async clear(): Promise<void> {
    try {
      const response = await fetchWithTimeout(BOARD_ENDPOINT, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`Clear failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to clear API storage:', error);
    }
  },

  /**
   * Check if there is saved state
   */
  async hasSavedState(): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(BOARD_ENDPOINT);
      return response.status === 200;
    } catch (error) {
      console.error('Failed to check API storage:', error);
      return false;
    }
  },
};

