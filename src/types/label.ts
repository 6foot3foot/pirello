/**
 * Label for categorizing cards with colors
 */
export interface Label {
  id: string;
  name: string;
  color: string;
}

/**
 * Default labels available in the system
 */
export const DEFAULT_LABELS: Label[] = [
  { id: 'label-1', name: 'Frontend', color: '#61bd4f' },
  { id: 'label-2', name: 'Backend', color: '#f2d600' },
  { id: 'label-3', name: 'Bug', color: '#eb5a46' },
  { id: 'label-4', name: 'Feature', color: '#c377e0' },
  { id: 'label-5', name: 'Documentation', color: '#00c2e0' },
  { id: 'label-6', name: 'Design', color: '#ff9f1a' },
];

