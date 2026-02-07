import type { Lane } from './lane';

/**
 * A project containing lanes and associated cards
 */
export interface Project {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  lanes: Lane[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

/**
 * Project data for creating a new project
 */
export type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'lanes'>;

