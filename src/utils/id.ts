import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique ID for entities
 */
export function generateId(): string {
  return uuidv4();
}

