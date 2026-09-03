export interface NoteDocument {
  id: string;
  path: string | null; // null for untitled new notes
  title: string;
  content: string;
  isDirty: boolean;
  modTime: number;
  preview: string;
}

// Backward compatibility alias for Tab
export type Tab = NoteDocument;

export interface FileTreeItem {
  path: string;
  name: string;
  isDir: boolean;
  children?: FileTreeItem[];
  modTime: number;
  size?: number;
}

export interface WorkspaceInfo {
  currentDir: string;
  initialFiles: string[];
  initialTree: FileTreeItem[];
}

export type EditorMode = 'live' | 'source';

export interface CursorPosition {
  line: number;
  col: number;
  wordCount: number;
  charCount: number;
}
