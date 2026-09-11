export interface NoteDocument {
  id: string;
  path: string | null; // null for untitled new notes
  title: string;
  content: string;
  isDirty: boolean;
  modTime: number;
  preview: string;
  tags?: string[];
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
  folders?: string[];
  initialFiles: string[];
  initialTree: FileTreeItem[];
}

export interface SidebarFolder {
  path: string;
  name: string;
  tree: FileTreeItem[];
}

export type EditorMode = 'live' | 'source';

export interface RecentItem {
  id?: string;
  path: string | null;
  title: string;
  isDirty?: boolean;
  lastOpened: number;
  preview?: string;
  tags?: string[];
}

export interface CursorPosition {
  line: number;
  col: number;
  wordCount: number;
  charCount: number;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  systemFont: string;
  editorFont: string;
  fontSize: number;
  editorWidth: 'full' | 'wide' | 'centered';
  keybinds?: Record<string, string>;
}
