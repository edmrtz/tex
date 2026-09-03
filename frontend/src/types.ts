export interface Tab {
  id: string;
  path: string | null; // null for untitled new tabs
  title: string;
  content: string;
  isDirty: boolean;
  modTime: number;
}

export type EditorMode = 'live' | 'source';

export interface CursorPosition {
  line: number;
  col: number;
  wordCount: number;
  charCount: number;
}
