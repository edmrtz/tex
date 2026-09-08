<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type {
    NoteDocument,
    FileTreeItem,
    SidebarFolder,
    EditorMode,
    CursorPosition,
    AppSettings,
    RecentItem,
  } from './types';
  import { createMarkdownEditor } from './editor/editor';
  import { getUiFontFamily, getMonoFontFamily } from './editor/theme';
  import Sidebar from './components/Sidebar.svelte';
  import TagBar from './components/TagBar.svelte';
  import FindReplace from './components/FindReplace.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import {
    extractTags,
    addTagToContent,
    removeTagFromContent,
  } from './utils/tags';
  import {
    GetInitialFiles,
    GetWorkspaceInfo,
    OpenDirectoryDialog,
    ReadDirectoryTree,
    ReadFile,
    SaveFile,
    OpenFileDialog,
    SaveFileDialog,
    CreateNewFile,
    CreateNewDirectory,
    DeleteFile,
    RenameFile,
    SavePastedImage,
    ExportHTML,
    SaveSession,
    LoadSession,
    IsDirectory,
    WatchDirectory,
    UnwatchDirectory,
  } from '../wailsjs/go/main/App';
  import {
    EventsOn,
    EventsOff,
    WindowSetTitle,
    OnFileDrop,
    OnFileDropOff,
    WindowMinimise,
    WindowToggleMaximise,
    Quit,
  } from '../wailsjs/runtime/runtime';
  import QuickSwitcher from './components/QuickSwitcher.svelte';
  import {
    PanelLeft,
    PanelLeftClose,
    Save,
    Eye,
    Code,
  } from '@lucide/svelte';

  const defaultSettings: AppSettings = {
    theme: 'dark',
    uiFont: 'system',
    monoFont: 'default',
    lineNumbers: false,
    vimMode: false,
    fontSize: 15,
    editorWidth: 'full',
  };

  function loadSettings(): AppSettings {
    try {
      const raw = localStorage.getItem('tex:settings');
      if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
    } catch {}
    return defaultSettings;
  }

  function loadRecentFiles(): RecentItem[] {
    try {
      const raw = localStorage.getItem('tex:recent_files');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }

  function loadSidebarFolders(): SidebarFolder[] {
    try {
      const raw = localStorage.getItem('tex:sidebar_folders');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            path: typeof item === 'string' ? item : item.path,
            name: typeof item === 'string' ? (item.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || item) : item.name,
            tree: [],
          }));
        }
      }
    } catch {}
    return [];
  }

  function saveSidebarFolders(folders: SidebarFolder[]) {
    sidebarFolders = folders;
    try {
      const saved = folders.map((f) => ({ path: f.path, name: f.name }));
      localStorage.setItem('tex:sidebar_folders', JSON.stringify(saved));
    } catch {}
  }

  // State
  let sidebarOpen = $state<boolean>(true);
  let notes = $state<NoteDocument[]>([]);
  let activeNoteId = $state<string>('');
  let currentFolder = $state<string>('');
  let sidebarFolders = $state<SidebarFolder[]>(loadSidebarFolders());
  let editorMode = $state<EditorMode>('live');
  let settings = $state<AppSettings>(loadSettings());
  let showFindReplace = $state<boolean>(false);
  let showSettingsModal = $state<boolean>(false);
  let cursorInfo = $state<CursorPosition>({ line: 1, col: 1, wordCount: 0, charCount: 0 });
  let recentHistory = $state<RecentItem[]>(loadRecentFiles());
  let activeTagFilter = $state<string | null>(null);
  function saveRecentHistory(items: RecentItem[]) {
    recentHistory = items;
    try {
      localStorage.setItem('tex:recent_files', JSON.stringify(items));
    } catch {}
  }

  function recordRecentItem(
    title: string,
    path: string | null,
    previewTextOrContent: string = '',
    tags?: string[]
  ) {
    const now = Date.now();
    const filtered = recentHistory.filter((r) => (path ? r.path !== path : r.title !== title));
    const resolvedTags = tags || extractTags(previewTextOrContent);
    const entry: RecentItem = {
      title,
      path,
      lastOpened: now,
      preview: previewTextOrContent ? cleanPreview(previewTextOrContent) : undefined,
      tags: resolvedTags.length > 0 ? resolvedTags : undefined,
    };
    saveRecentHistory([entry, ...filtered].slice(0, 30));
  }

  // Derived recent items uniting in-memory open notes and recent history
  let recentItems = $derived.by(() => {
    const result: RecentItem[] = [];
    const seenPaths = new Set<string>();
    const seenIds = new Set<string>();

    for (const note of notes) {
      seenIds.add(note.id);
      if (note.path) seenPaths.add(note.path);
      result.push({
        id: note.id,
        title: note.title || 'Untitled',
        path: note.path,
        isDirty: note.isDirty,
        lastOpened: note.modTime || Date.now(),
        preview: note.preview,
        tags: note.tags || extractTags(note.content),
      });
    }
    for (const item of recentHistory) {
      if (item.path && !seenPaths.has(item.path)) {
        seenPaths.add(item.path);
        result.push(item);
      }
    }

    return result;
  });

  let allWorkspaceTags = $derived.by(() => {
    const set = new Set<string>();
    for (const item of recentItems) {
      if (item.tags) {
        for (const t of item.tags) set.add(t);
      }
    }
    for (const note of notes) {
      if (note.tags) {
        for (const t of note.tags) set.add(t);
      }
    }
    return Array.from(set).sort();
  });

  function handleAddActiveTag(newTag: string) {
    if (!activeNote) return;
    const updated = addTagToContent(activeNote.content, newTag);
    if (updated !== activeNote.content) {
      activeNote.content = updated;
      activeNote.tags = extractTags(updated);
      activeNote.isDirty = true;
      activeNote.preview = cleanPreview(updated);
      notes = [...notes];
      if (editorInstance) {
        isProgrammaticUpdate = true;
        editorInstance.setContent(updated);
        isProgrammaticUpdate = false;
      }
      recordRecentItem(activeNote.title, activeNote.path, activeNote.content, activeNote.tags);
    }
  }

  function handleRemoveActiveTag(tagToRemove: string) {
    if (!activeNote) return;
    const updated = removeTagFromContent(activeNote.content, tagToRemove);
    if (updated !== activeNote.content) {
      activeNote.content = updated;
      activeNote.tags = extractTags(updated);
      activeNote.isDirty = true;
      activeNote.preview = cleanPreview(updated);
      notes = [...notes];
      if (editorInstance) {
        isProgrammaticUpdate = true;
        editorInstance.setContent(updated);
        isProgrammaticUpdate = false;
      }
      recordRecentItem(activeNote.title, activeNote.path, activeNote.content, activeNote.tags);
    }
  }

  async function handleAddTagToNote(item: RecentItem, tag: string) {
    const targetNote = notes.find((n) => (item.id ? n.id === item.id : (item.path && n.path === item.path)));
    if (targetNote) {
      const updated = addTagToContent(targetNote.content, tag);
      if (updated !== targetNote.content) {
        targetNote.content = updated;
        targetNote.tags = extractTags(updated);
        targetNote.isDirty = true;
        targetNote.preview = cleanPreview(updated);
        notes = [...notes];
        if (targetNote.id === activeNoteId && editorInstance) {
          isProgrammaticUpdate = true;
          editorInstance.setContent(updated);
          isProgrammaticUpdate = false;
        }
        recordRecentItem(targetNote.title, targetNote.path, targetNote.content, targetNote.tags);
      }
      return;
    }

    if (item.path) {
      try {
        const file = await ReadFile(item.path);
        const updated = addTagToContent(file.content, tag);
        if (updated !== file.content) {
          await SaveFile(item.path, updated);
          const newTags = extractTags(updated);
          recordRecentItem(item.title, item.path, updated, newTags);
        }
      } catch (err) {
        console.error('Failed to add tag to file on disk:', err);
      }
    }
  }

  function handleSelectTagFilter(tag: string | null) {
    activeTagFilter = tag;
    if (tag && !sidebarOpen) {
      sidebarOpen = true;
    }
  }

  function applyAppSettings(newSettings: AppSettings) {
    settings = newSettings;
    try {
      localStorage.setItem('tex:settings', JSON.stringify(newSettings));
    } catch {}

    document.documentElement.setAttribute('data-theme', newSettings.theme);
    document.documentElement.style.setProperty('--font-ui', getUiFontFamily(newSettings.uiFont));
    document.documentElement.style.setProperty('--font-mono', getMonoFontFamily(newSettings.monoFont));

    if (editorInstance) {
      editorInstance.applySettings(newSettings);
    }
  }

  // Saving mutex to prevent duplicate Save dialogs popping up
  let isSaving = $state<boolean>(false);
  let isProgrammaticUpdate = false;
  let showQuitModal = $state<boolean>(false);
  let handleBeforeUnload: ((e: BeforeUnloadEvent) => string | void) | null = null;

  // Confirmation modal state
  let showCloseModal = $state<boolean>(false);
  let pendingCloseNoteId = $state<string | null>(null);

  // Editor DOM reference & CM6 instance
  let editorContainerEl = $state<HTMLDivElement | null>(null);
  let editorInstance = $state<ReturnType<typeof createMarkdownEditor> | null>(null);
  let showQuickSwitcher = $state<boolean>(false);

  function getAllWorkspaceFiles(): string[] {
    const set = new Set<string>();
    function walk(items: FileTreeItem[]) {
      for (const item of items) {
        if (item.isDir) {
          if (item.children) walk(item.children);
        } else {
          set.add(item.path);
        }
      }
    }
    for (const folder of sidebarFolders) {
      walk(folder.tree);
    }
    for (const n of notes) {
      if (n.path) set.add(n.path);
    }
    for (const r of recentHistory) {
      if (r.path) set.add(r.path);
    }
    return Array.from(set);
  }

  function persistCurrentSession() {
    if (!currentFolder && notes.length === 0 && sidebarFolders.length === 0) return;
    const openFiles = notes.map((n) => n.path).filter((p): p is string => p !== null);
    const activeFile = activeNote?.path || '';
    const folderPaths = sidebarFolders.map((f) => f.path);
    SaveSession(currentFolder || '', folderPaths, openFiles, activeFile).catch(() => {});
  }

  let activeNote = $derived(notes.find((n) => n.id === activeNoteId) || null);

  // Synchronize OS Window Title with active file & dirty status
  $effect(() => {
    if (activeNote) {
      const dirtyMark = activeNote.isDirty ? '● ' : '';
      const name = activeNote.title || 'Untitled';
      WindowSetTitle(`${dirtyMark}${name} — Tex`);
    } else {
      WindowSetTitle('Tex');
    }
  });

  function cleanPreview(content: string): string {
    if (!content) return '';
    return content
      .replace(/^#+\s+/gm, '')
      .replace(/[*_`~[\]$]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
  }

  function createNewNote(title = 'Untitled', content = '', path: string | null = null, modTime = 0): NoteDocument {
    return {
      id: 'note-' + Math.random().toString(36).substring(2, 9),
      title,
      path,
      content,
      isDirty: false,
      modTime,
      preview: cleanPreview(content),
      tags: extractTags(content),
    };
  }

  function addNote(title = 'Untitled', content = '', path: string | null = null, modTime = 0) {
    const note = createNewNote(title, content, path, modTime);
    notes = [...notes, note];
    switchNote(note.id);
    recordRecentItem(note.title, note.path, note.content);
  }

  function switchNote(id: string) {
    if (activeNoteId === id) return;
    activeNoteId = id;
    const note = notes.find((n) => n.id === id);
    if (note) {
      if (editorInstance) {
        isProgrammaticUpdate = true;
        editorInstance.setContent(note.content);
        isProgrammaticUpdate = false;
        editorInstance.focus();
      }
      recordRecentItem(note.title, note.path, note.content);
    }
  }

  async function handleSelectRecent(item: RecentItem) {
    if (item.id) {
      switchNote(item.id);
    } else if (item.path) {
      await openFilePath(item.path);
    }
  }

  function handleCloseRecent(item: RecentItem, e?: MouseEvent) {
    if (e) e.stopPropagation();
    if (item.id) {
      requestCloseNote(item.id, e);
    }
    if (item.path) {
      saveRecentHistory(recentHistory.filter((r) => r.path !== item.path));
    }
  }

  function requestCloseNote(id: string, e?: MouseEvent) {
    if (e) e.stopPropagation();
    const note = notes.find((n) => n.id === id);
    if (!note) return;

    if (note.isDirty) {
      pendingCloseNoteId = id;
      showCloseModal = true;
    } else {
      closeNote(id);
    }
  }

  function closeNote(id: string) {
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) {
      showCloseModal = false;
      pendingCloseNoteId = null;
      return;
    }

    const remaining = notes.filter((n) => n.id !== id);
    if (remaining.length === 0) {
      const fresh = createNewNote();
      notes = [fresh];
      activeNoteId = fresh.id;
      if (editorInstance) {
        isProgrammaticUpdate = true;
        editorInstance.setContent('');
        isProgrammaticUpdate = false;
        editorInstance.focus();
      }
      recordRecentItem(fresh.title, fresh.path, fresh.content);
    } else {
      notes = remaining;
      if (activeNoteId === id) {
        const nextIdx = Math.max(0, idx - 1);
        switchNote(notes[nextIdx].id);
      }
    }
    showCloseModal = false;
    pendingCloseNoteId = null;
  }

  function handleWindowClose() {
    const dirtyNotes = notes.filter((n) => n.isDirty);
    if (dirtyNotes.length > 0) {
      showQuitModal = true;
    } else {
      Quit();
    }
  }

  async function handleQuitSave() {
    for (const note of notes) {
      if (note.isDirty) {
        switchNote(note.id);
        const saved = await handleSave();
        if (!saved) {
          // Cancelled in save dialog
          showQuitModal = false;
          return;
        }
      }
    }
    Quit();
  }

  async function handleOpenFile() {
    try {
      const path = await OpenFileDialog();
      if (!path) return;
      await openFilePath(path);
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }

  async function refreshSidebarFolder(folderPath: string) {
    try {
      const tree = await ReadDirectoryTree(folderPath, 6);
      sidebarFolders = sidebarFolders.map((f) =>
        f.path === folderPath ? { ...f, tree: tree || [] } : f
      );
    } catch (err) {
      console.error(`Failed to refresh folder ${folderPath}:`, err);
    }
  }

  async function refreshAllSidebarFolders() {
    for (const folder of sidebarFolders) {
      await refreshSidebarFolder(folder.path);
    }
  }

  async function handleAddFolder(folderPath?: string) {
    let target = folderPath;
    if (!target) {
      try {
        target = await OpenDirectoryDialog();
      } catch (err) {
        console.error('Failed to open directory dialog:', err);
        return;
      }
    }
    if (!target) return;

    const existing = sidebarFolders.find((f) => f.path === target);
    if (existing) {
      await refreshSidebarFolder(target);
      return;
    }

    const name = target.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || target;
    try {
      const tree = await ReadDirectoryTree(target, 6);
      const newFolder: SidebarFolder = {
        path: target,
        name,
        tree: tree || [],
      };
      saveSidebarFolders([...sidebarFolders, newFolder]);
      currentFolder = target;
      WatchDirectory(target).catch(() => {});
      persistCurrentSession();
    } catch (err) {
      console.error('Failed to add folder:', err);
    }
  }

  function handleRemoveFolder(folderPath: string) {
    UnwatchDirectory(folderPath).catch(() => {});
    const filtered = sidebarFolders.filter((f) => f.path !== folderPath);
    saveSidebarFolders(filtered);
    if (currentFolder === folderPath) {
      currentFolder = filtered.length > 0 ? filtered[0].path : '';
    }
    persistCurrentSession();
  }

  async function handleOpenFolder() {
    await handleAddFolder();
  }

  async function handleRefreshFolder(folderPath?: string) {
    if (folderPath) {
      await refreshSidebarFolder(folderPath);
    } else {
      await refreshAllSidebarFolders();
    }
  }

  async function openFilePath(filePath: string) {
    const existing = notes.find((n) => n.path === filePath);
    if (existing) {
      switchNote(existing.id);
      return;
    }

    try {
      const file = await ReadFile(filePath);
      // If current note is single, untitled and clean, replace it
      if (notes.length === 1 && notes[0].path === null && !notes[0].isDirty && notes[0].content === '') {
        notes = [
          {
            id: notes[0].id,
            path: file.path,
            title: file.name,
            content: file.content,
            isDirty: false,
            modTime: file.modTime,
            preview: cleanPreview(file.content),
            tags: extractTags(file.content),
          },
        ];
        if (editorInstance) {
          isProgrammaticUpdate = true;
          editorInstance.setContent(file.content);
          isProgrammaticUpdate = false;
        }
        recordRecentItem(file.name, file.path, file.content);
      } else {
        addNote(file.name, file.content, file.path, file.modTime);
      }
    } catch (err) {
      console.error('Error reading file:', err);
    }
  }

  async function handleSave(): Promise<boolean> {
    if (isSaving || !activeNote) return false;
    isSaving = true;
    try {
      let targetPath = activeNote.path;
      if (!targetPath) {
        const defaultName = activeNote.title.endsWith('.md')
          ? activeNote.title
          : `${activeNote.title}.md`;
        targetPath = await SaveFileDialog(
          currentFolder || '',
          defaultName
        );
        if (!targetPath) return false; // Cancelled
      }

      const res = await SaveFile(targetPath, activeNote.content);
      activeNote.path = res.path;
      activeNote.title = res.name;
      activeNote.isDirty = false;
      activeNote.modTime = res.modTime;
      activeNote.tags = extractTags(activeNote.content);
      notes = [...notes];
      recordRecentItem(activeNote.title, activeNote.path, activeNote.content, activeNote.tags);
      return true;
    } catch (err) {
      console.error('Failed to save file:', err);
      return false;
    } finally {
      isSaving = false;
    }
  }

  async function handleSaveAs(): Promise<boolean> {
    if (isSaving || !activeNote) return false;
    isSaving = true;
    try {
      const defaultName = activeNote.title.endsWith('.md')
        ? activeNote.title
        : `${activeNote.title}.md`;
      const targetPath = await SaveFileDialog(currentFolder || '', defaultName);
      if (!targetPath) return false;

      const res = await SaveFile(targetPath, activeNote.content);
      activeNote.path = res.path;
      activeNote.title = res.name;
      activeNote.isDirty = false;
      activeNote.modTime = res.modTime;
      notes = [...notes];
      recordRecentItem(activeNote.title, activeNote.path, activeNote.content);
      handleRefreshFolder();
      return true;
    } catch (err) {
      console.error('Failed to save file as:', err);
      return false;
    } finally {
      isSaving = false;
    }
  }

  async function handleCreateFileInFolder(folderPath: string, fileName: string) {
    try {
      const res = await CreateNewFile(folderPath, fileName);
      if (res) {
        await refreshSidebarFolder(folderPath);
        const rootFolder = sidebarFolders.find((f) => folderPath.startsWith(f.path));
        if (rootFolder && rootFolder.path !== folderPath) {
          await refreshSidebarFolder(rootFolder.path);
        }
        await openFilePath(res.path);
        persistCurrentSession();
      }
    } catch (err) {
      console.error('Failed to create file in folder:', err);
    }
  }

  async function handleCreateSubfolder(parentPath: string, folderName: string) {
    try {
      const newDirPath = await CreateNewDirectory(parentPath, folderName);
      if (newDirPath) {
        const rootFolder = sidebarFolders.find((f) => parentPath.startsWith(f.path));
        if (rootFolder) {
          await refreshSidebarFolder(rootFolder.path);
        } else {
          await refreshAllSidebarFolders();
        }
      }
    } catch (err) {
      console.error('Failed to create subfolder:', err);
    }
  }

  async function handleDeleteFile(filePathOrId: string) {
    try {
      const noteById = notes.find((n) => n.id === filePathOrId);
      const noteByPath = notes.find((n) => n.path === filePathOrId);
      const targetNote = noteById || noteByPath;

      if (targetNote?.path) {
        await DeleteFile(targetNote.path);
        recentHistory = recentHistory.filter((r) => r.path !== targetNote.path);
        saveRecentHistory(recentHistory);
      } else if (!targetNote) {
        try {
          await DeleteFile(filePathOrId);
        } catch {}
        recentHistory = recentHistory.filter((r) => r.path !== filePathOrId);
        saveRecentHistory(recentHistory);
      }

      if (targetNote) {
        closeNote(targetNote.id);
      }
      await handleRefreshFolder();
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  }

  async function handleRenameFile(oldPathOrId: string, newName: string) {
    try {
      const noteById = notes.find((n) => n.id === oldPathOrId);
      const noteByPath = notes.find((n) => n.path === oldPathOrId);
      const targetNote = noteById || noteByPath;

      if (targetNote?.path) {
        const res = await RenameFile(targetNote.path, newName);
        if (res) {
          targetNote.path = res.path;
          targetNote.title = res.name;
          targetNote.modTime = res.modTime;
          notes = [...notes];
          recordRecentItem(res.name, res.path, targetNote.content);
          if (activeNoteId === targetNote.id) {
            WindowSetTitle(`Tex - ${res.name}`);
          }
          await handleRefreshFolder();
          persistCurrentSession();
        }
      } else if (targetNote) {
        targetNote.title = newName;
        notes = [...notes];
      }
    } catch (err) {
      console.error('Failed to rename file:', err);
    }
  }

  function handleReorderNotes(reordered: RecentItem[]) {
    const updatedHistory: RecentItem[] = [];
    for (const item of reordered) {
      if (item.path) {
        updatedHistory.push({
          title: item.title,
          path: item.path,
          lastOpened: item.lastOpened,
          preview: item.preview,
        });
      }
    }
    const reorderedNotes: NoteDocument[] = [];
    for (const item of reordered) {
      const found = notes.find((n) => (item.id ? n.id === item.id : (item.path && n.path === item.path)));
      if (found) reorderedNotes.push(found);
    }
    for (const n of notes) {
      if (!reorderedNotes.includes(n)) reorderedNotes.push(n);
    }
    notes = reorderedNotes;
    saveRecentHistory(updatedHistory);
  }

  async function handleDropExternalFiles(paths: string[]) {
    if (paths && paths.length > 0) {
      for (const p of paths) {
        try {
          const isDir = await IsDirectory(p);
          if (isDir) {
            await handleAddFolder(p);
          } else {
            await openFilePath(p);
          }
        } catch {
          await openFilePath(p);
        }
      }
    }
  }

  async function handlePasteImage(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      if (!base64) return;
      try {
        const relPath = await SavePastedImage(currentFolder || '', activeNote?.path || '', base64);
        if (relPath && editorInstance) {
          editorInstance.insertTextAtCursor(`![image](${relPath})\n`);
        }
      } catch (err) {
        console.error('Failed to save pasted image:', err);
      }
    };
    reader.readAsDataURL(file);
  }

  function handlePrint() {
    window.print();
  }

  async function handleExportHTML() {
    if (!activeNote) return;
    try {
      const title = activeNote.title || 'document';
      const defaultName = (title.endsWith('.md') ? title.slice(0, -3) : title) + '.html';
      const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'DM Mono', monospace, sans-serif;
      line-height: 1.65;
      color: #18181b;
      background: #fafafa;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 24px;
    }
    pre, code { font-family: 'DM Mono', monospace; background: #f4f4f5; border-radius: 4px; }
    code { padding: 2px 6px; font-size: 0.9em; }
    pre code { display: block; padding: 14px; overflow-x: auto; }
    blockquote { border-left: 3px solid #0284c7; margin-left: 0; padding-left: 16px; color: #52525b; font-style: italic; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #e4e4e7; padding: 8px 14px; text-align: left; }
    th { background: #f4f4f5; font-weight: 600; }
    img { max-width: 100%; border-radius: 4px; }
    h1, h2, h3, h4 { color: #09090b; font-weight: 700; }
  </style>
</head>
<body>
  <div class="content" style="white-space: pre-wrap; font-family: inherit;">${activeNote.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
</body>
</html>`;
      await ExportHTML(defaultName, htmlDoc);
    } catch (err) {
      console.error('Failed to export HTML:', err);
    }
  }

  function setEditorMode(newMode: EditorMode) {
    editorMode = newMode;
    if (editorInstance) {
      editorInstance.setMode(newMode);
    }
  }

  function toggleEditorMode() {
    setEditorMode(editorMode === 'live' ? 'source' : 'live');
  }

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function zoomIn() {
    const newSize = Math.min(32, settings.fontSize + 1);
    applyAppSettings({ ...settings, fontSize: newSize });
  }

  function zoomOut() {
    const newSize = Math.max(10, settings.fontSize - 1);
    applyAppSettings({ ...settings, fontSize: newSize });
  }

  function zoomReset() {
    applyAppSettings({ ...settings, fontSize: 15 });
  }

  // Keyboard shortcut listener
  function handleKeyDown(e: KeyboardEvent) {
    if (e.defaultPrevented) return;
    if (e.ctrlKey || e.metaKey) {
      if ((e.key === 'p' || e.key === 'P' || e.key === 'k' || e.key === 'K') && !e.shiftKey) {
        e.preventDefault();
        showQuickSwitcher = true;
        return;
      } else if ((e.key === 'p' || e.key === 'P') && e.shiftKey) {
        e.preventDefault();
        handlePrint();
        return;
      } else if ((e.key === 'e' || e.key === 'E') && e.shiftKey) {
        e.preventDefault();
        handleExportHTML();
        return;
      } else if (e.key === '\\') {
        e.preventDefault();
        toggleEditorMode();
        return;
      } else if (e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      } else if (e.key === 'n') {
        e.preventDefault();
        addNote();
      } else if (e.key === 'o' && e.shiftKey) {
        e.preventDefault();
        handleOpenFolder();
      } else if (e.key === 'o') {
        e.preventDefault();
        handleOpenFile();
      } else if (e.key === 's' && e.shiftKey) {
        e.preventDefault();
        handleSaveAs();
      } else if (e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'w') {
        e.preventDefault();
        if (activeNoteId) requestCloseNote(activeNoteId);
      } else if (e.key === 'e') {
        e.preventDefault();
        toggleEditorMode();
      } else if (e.key === 'f') {
        e.preventDefault();
        showFindReplace = !showFindReplace;
      } else if (e.key === 'h') {
        e.preventDefault();
        showFindReplace = true;
      } else if (e.key === ',') {
        e.preventDefault();
        showSettingsModal = !showSettingsModal;
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        zoomReset();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (notes.length > 1) {
          const curIdx = notes.findIndex((n) => n.id === activeNoteId);
          const nextIdx = e.shiftKey
            ? (curIdx - 1 + notes.length) % notes.length
            : (curIdx + 1) % notes.length;
          switchNote(notes[nextIdx].id);
        }
      }
    }
  }

  onMount(async () => {
    window.addEventListener('keydown', handleKeyDown);

    handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (notes.some((n) => n.isDirty)) {
        e.preventDefault();
        e.returnValue = '';
        handleWindowClose();
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    window.addEventListener('tex:open-wikilink', async (e: Event) => {
      const target = (e as CustomEvent<string>).detail;
      if (!target) return;
      const all = getAllWorkspaceFiles();
      const cleanTarget = target.replace(/\.md$/i, '').toLowerCase();
      const matched = all.find((f) => {
        const base = f.split(/[/\\]/).pop()?.replace(/\.md$/i, '') || '';
        return base.toLowerCase() === cleanTarget;
      });
      if (matched) {
        await openFilePath(matched);
      } else if (currentFolder) {
        await handleCreateFileInFolder(currentFolder, target.endsWith('.md') ? target : `${target}.md`);
      }
    });

    // Apply initial settings
    applyAppSettings(settings);

    // Initialize initial note
    const initialNote = createNewNote('Untitled', '');

    notes = [initialNote];
    activeNoteId = initialNote.id;

    // Mount CodeMirror
    if (editorContainerEl) {
      editorInstance = createMarkdownEditor(
        editorContainerEl,
        initialNote.content,
        editorMode,
        settings,
        {
          onChange: (newContent) => {
            if (isProgrammaticUpdate) return;
            if (activeNote && activeNote.content !== newContent) {
              activeNote.content = newContent;
              activeNote.isDirty = true;
              activeNote.preview = cleanPreview(newContent);
              activeNote.tags = extractTags(newContent);
              notes = [...notes];
            }
          },
          onCursorChange: (pos) => {
            cursorInfo = pos;
          },
          onSaveShortcut: () => {
            handleSave();
          },
          onFindShortcut: () => {
            showFindReplace = true;
          },
          onPasteImage: handlePasteImage,
          getWorkspaceFiles: getAllWorkspaceFiles,
        }
      );
    }

    // Load workspace info and folder tree
    try {
      const ws = await GetWorkspaceInfo();
      if (ws) {
        const combinedFolderPaths = new Set<string>();
        if (ws.folders && ws.folders.length > 0) {
          for (const f of ws.folders) combinedFolderPaths.add(f);
        }
        for (const f of sidebarFolders) combinedFolderPaths.add(f.path);
        if (ws.currentDir && ws.currentDir !== '') {
          currentFolder = ws.currentDir;
          combinedFolderPaths.add(ws.currentDir);
        }

        const loadedFolders: SidebarFolder[] = [];
        for (const p of combinedFolderPaths) {
          const name = p.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || p;
          try {
            const tree = await ReadDirectoryTree(p, 6);
            loadedFolders.push({ path: p, name, tree: tree || [] });
            WatchDirectory(p).catch(() => {});
          } catch {}
        }
        if (loadedFolders.length > 0) {
          saveSidebarFolders(loadedFolders);
        }

        if (ws.initialFiles && ws.initialFiles.length > 0) {
          for (const file of ws.initialFiles) {
            await openFilePath(file);
          }
        }
      }
    } catch (e) {
      console.error('Error initializing workspace:', e);
    }

    // Listen for files dropped onto the window
    OnFileDrop(async (x: number, y: number, paths: string[]) => {
      if (paths && paths.length > 0) {
        for (const p of paths) {
          try {
            const isDir = await IsDirectory(p);
            if (isDir) {
              await handleAddFolder(p);
            } else {
              await openFilePath(p);
            }
          } catch {
            await openFilePath(p);
          }
        }
      }
    }, true);

    // Listen for files passed via CLI while already running
    EventsOn('cli:open-files', async (files: string[]) => {
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const isDir = await IsDirectory(file);
            if (isDir) {
              await handleAddFolder(file);
            } else {
              await openFilePath(file);
            }
          } catch {
            await openFilePath(file);
          }
        }
      }
    });

    // Listen for external workspace changes (files created/deleted)
    EventsOn('workspace:modified', async () => {
      await refreshAllSidebarFolders();
    });

    // Listen for external file modifications
    EventsOn('file:modified', async (modifiedPath: string) => {
      const target = notes.find((n) => n.path === modifiedPath);
      if (target && !target.isDirty) {
        try {
          const fresh = await ReadFile(modifiedPath);
          target.content = fresh.content;
          target.modTime = fresh.modTime;
          target.preview = cleanPreview(fresh.content);
          if (activeNoteId === target.id && editorInstance) {
            editorInstance.setContent(fresh.content);
          }
          notes = [...notes];
        } catch (e) {
          console.error('Error reloading modified file:', e);
        }
      }
    });
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown);
    if (handleBeforeUnload) {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
    OnFileDropOff();
    EventsOff('workspace:modified');
    EventsOff('cli:open-files');
    EventsOff('file:modified');
    if (editorInstance) {
      editorInstance.destroy();
    }
  });
</script>

<div class="tex-app">
  <!-- Top TUI Window Titlebar -->
  <div class="tui-window-titlebar" style="--wails-draggable: drag;">
    <div class="titlebar-left">
      <span class="tui-brand">tex</span>
      <span class="tui-sep">//</span>
      <span class="tui-title-text">{activeNote?.title || 'untitled'}</span>
      {#if activeNote?.isDirty}
        <span class="tui-dirty-dot">●</span>
      {/if}
    </div>

    <div class="titlebar-controls" style="--wails-draggable: no-drag;">
      <button class="tui-win-btn" title="Minimize" onclick={WindowMinimise} type="button">_</button>
      <button class="tui-win-btn" title="Maximize" onclick={WindowToggleMaximise} type="button">□</button>
      <button class="tui-win-btn btn-close" title="Close" onclick={handleWindowClose} type="button">×</button>
    </div>
  </div>

  <!-- App Body (Sidebar + Editor) -->
  <div class="app-body">
    <!-- Left File Tree Sidebar -->
    <Sidebar
      isOpen={sidebarOpen}
      activeId={activeNoteId}
      {recentItems}
      folders={sidebarFolders}
      bind:activeTagFilter
      onSelectTagFilter={handleSelectTagFilter}
      onAddTagToNote={handleAddTagToNote}
      onSelectNote={handleSelectRecent}
      onCloseNote={handleCloseRecent}
      onNewNote={(folderPath) => {
        if (folderPath) {
          handleCreateFileInFolder(folderPath, 'Untitled.md');
        } else {
          addNote();
        }
      }}
      onOpenFile={handleOpenFile}
      onOpenFolder={handleOpenFolder}
      onAddFolder={handleAddFolder}
      onRemoveFolder={handleRemoveFolder}
      onRefreshFolder={handleRefreshFolder}
      onCreateFileInFolder={handleCreateFileInFolder}
      onCreateSubfolder={handleCreateSubfolder}
      onToggleSidebar={toggleSidebar}
      onFind={() => { showQuickSwitcher = true; }}
      onExport={handleExportHTML}
      onOpenSettings={() => { showSettingsModal = true; }}
      onRenameFile={handleRenameFile}
      onDeleteFile={handleDeleteFile}
      onReorderNotes={handleReorderNotes}
      onDropExternalFiles={handleDropExternalFiles}
    />

    <!-- Main Workspace -->
    <div class="main-workspace">
      <!-- Top Document Header -->
      <header class="document-header">
        <div class="header-left">
          <button
            class="icon-btn sidebar-toggle-btn"
            title="{sidebarOpen ? 'Hide Sidebar (Ctrl+B)' : 'Show Sidebar (Ctrl+B)'}"
            onclick={toggleSidebar}
            type="button"
          >
            {#if sidebarOpen}
              <PanelLeftClose size={15} />
            {:else}
              <PanelLeft size={15} />
            {/if}
          </button>
        </div>

        <!-- Centered Single Tab -->
        <div class="document-tab-center">
          <span class="document-tab-title" title={activeNote?.path || activeNote?.title || 'Untitled'}>
            {activeNote?.title || 'Untitled'}
          </span>
          {#if activeNote?.isDirty}
            <span class="document-tab-dirty" title="Unsaved changes">●</span>
          {/if}
        </div>

        <div class="header-right">
          <button
            class="icon-btn"
            title="Save File (Ctrl+S)"
            onclick={handleSave}
            type="button"
          >
            <Save size={13} />
            <span>Save</span>
          </button>

          <button
            class="mode-badge-btn"
            title="Switch View Mode (Ctrl+\) (Live / Raw)"
            onclick={toggleEditorMode}
            type="button"
          >
            {#if editorMode === 'live'}
              <Eye size={13} />
              <span>Live</span>
            {:else}
              <Code size={13} />
              <span>Raw</span>
            {/if}
          </button>
        </div>
      </header>

      {#if activeNote}
        <TagBar
          tags={activeNote.tags || []}
          {allWorkspaceTags}
          onAddTag={handleAddActiveTag}
          onRemoveTag={handleRemoveActiveTag}
          onSelectTagFilter={handleSelectTagFilter}
        />
      {/if}

      <!-- Editor Container -->
      <main class="editor-container">
        <FindReplace
          view={editorInstance?.view || null}
          isOpen={showFindReplace}
          onClose={() => { showFindReplace = false; }}
        />
        <div class="cm-editor-wrapper" bind:this={editorContainerEl}></div>

        {#if settings.showWordCount !== false && activeNote}
          <div class="stats-badge" title="{cursorInfo.charCount} chars, line {cursorInfo.line}, col {cursorInfo.col}">
            <span>{cursorInfo.wordCount} words</span>
            <span class="stat-sep">·</span>
            <span>{Math.max(1, Math.ceil(cursorInfo.wordCount / 200))} min read</span>
          </div>
        {/if}
      </main>
    </div>
  </div>

  <!-- Quick Switcher Modal (Ctrl+P) -->
  <QuickSwitcher
    bind:isOpen={showQuickSwitcher}
    files={getAllWorkspaceFiles()}
    onSelectFile={(f) => openFilePath(f)}
  />

  <!-- Preferences / Settings Modal -->
  <SettingsModal
    isOpen={showSettingsModal}
    {settings}
    onSave={applyAppSettings}
    onClose={() => { showSettingsModal = false; }}
  />

  <!-- Close Confirmation Modal -->
  {#if showCloseModal && pendingCloseNoteId}
    {@const noteToClose = notes.find((n) => n.id === pendingCloseNoteId)}
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={() => { showCloseModal = false; }}
      onkeydown={(e) => { if (e.key === 'Escape') showCloseModal = false; }}
    >
      <div
        class="modal-card"
        role="document"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
      >
        <div class="modal-title">Save Changes?</div>
        <div class="modal-desc">
          Do you want to save the changes you made to
          <strong>"{noteToClose?.title}"</strong>?
          Your changes will be lost if you don't save them.
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick={() => { showCloseModal = false; }}>
            Cancel
          </button>
          <button
            class="btn btn-danger"
            onclick={() => { if (pendingCloseNoteId) closeNote(pendingCloseNoteId); }}
          >
            Don't Save
          </button>
          <button
            class="btn btn-primary"
            onclick={async () => {
              if (pendingCloseNoteId) {
                switchNote(pendingCloseNoteId);
                const saved = await handleSave();
                if (saved) {
                  closeNote(pendingCloseNoteId);
                }
              }
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Quit Confirmation Modal -->
  {#if showQuitModal}
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={() => { showQuitModal = false; }}
      onkeydown={(e) => { if (e.key === 'Escape') showQuitModal = false; }}
    >
      <div
        class="modal-card"
        role="document"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
      >
        <div class="modal-title">Unsaved Changes</div>
        <div class="modal-desc">
          You have unsaved changes. Do you want to save them before exiting Tex?
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick={() => { showQuitModal = false; }}>
            Cancel
          </button>
          <button class="btn btn-danger" onclick={Quit}>
            Don't Save
          </button>
          <button class="btn btn-primary" onclick={handleQuitSave}>
            Save & Exit
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .tex-app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background-color: var(--bg-app);
  }

  .app-body {
    display: flex;
    flex-direction: row;
    flex: 1;
    height: calc(100vh - 30px);
    width: 100%;
    overflow: hidden;
  }

  .main-workspace {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    min-width: 0;
    overflow: hidden;
    background-color: var(--bg-app);
  }

  /* Document Header */
  .document-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    height: 36px;
    min-height: 36px;
    padding: 0 10px;
    background-color: var(--bg-header);
    user-select: none;
    font-family: var(--font-mono);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 2;
  }

  .sidebar-toggle-btn {
    color: var(--text-muted);
    padding: 3px 6px;
    border-radius: 0px;
    border: 1px solid transparent;
  }

  .sidebar-toggle-btn:hover {
    color: var(--text-bright);
    background-color: var(--bg-hover);
    border-color: var(--border);
  }

  /* Centered Active File Tab */
  .document-tab-center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 6px;
    max-width: calc(100% - 240px);
    padding: 3px 6px;
    background: transparent;
    user-select: none;
    z-index: 1;
    pointer-events: auto;
    animation: tabFadeIn 0.15s ease-out;
  }

  @keyframes tabFadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-2px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .document-tab-title {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-bright);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .document-tab-dirty {
    color: var(--dirty);
    font-size: 9px;
    flex-shrink: 0;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    z-index: 2;
  }

  .mode-badge-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background-color: var(--accent-subtle);
    color: var(--accent);
    border: 1px solid var(--border);
    border-radius: 0px;
    padding: 2px 7px;
    font-size: 11px;
    font-family: var(--font-mono);
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.1s ease;
  }

  .mode-badge-btn:hover {
    background-color: var(--bg-active);
  }

  .icon-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    font-size: 11px;
    font-family: var(--font-mono);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 0px;
    color: var(--text-muted);
    cursor: pointer;
    transition: background-color 0.1s ease, color 0.1s ease;
  }

  .icon-btn:hover {
    background-color: var(--bg-hover);
    border-color: var(--border);
    color: var(--text-bright);
  }

  .editor-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    background-color: var(--bg-app);
  }

  .cm-editor-wrapper {
    flex: 1;
    height: 100%;
    overflow: hidden;
  }

  .stats-badge {
    position: absolute;
    bottom: 10px;
    right: 18px;
    background-color: var(--bg-card);
    border: 1px solid var(--border);
    padding: 2px 7px;
    font-size: 10.5px;
    font-family: var(--font-mono);
    color: var(--text-muted);
    border-radius: 0px;
    pointer-events: none;
    z-index: 10;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: statsFadeIn 0.2s ease-out;
  }

  @keyframes statsFadeIn {
    from {
      opacity: 0;
      transform: translateY(3px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .stat-sep {
    opacity: 0.4;
  }

  @media print {
    :global(body) {
      background: #ffffff !important;
      color: #000000 !important;
    }
    .tui-window-titlebar,
    .document-header,
    .stats-badge,
    :global(.sidebar) {
      display: none !important;
    }
    .tex-app,
    .app-body,
    .main-workspace,
    .editor-container,
    .cm-editor-wrapper {
      height: auto !important;
      overflow: visible !important;
      background: #ffffff !important;
    }
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
    animation: appModalOverlayFade 0.15s ease-out;
  }

  .modal-card {
    background-color: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0px;
    padding: 16px 20px;
    width: 400px;
    max-width: 90%;
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.5);
    font-family: var(--font-mono);
    animation: appModalCardScale 0.16s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform, opacity;
  }

  @keyframes appModalOverlayFade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes appModalCardScale {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .modal-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-bright);
    margin-bottom: 8px;
  }

  .modal-desc {
    font-size: 11.5px;
    color: var(--text-muted);
    margin-bottom: 16px;
    line-height: 1.4;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }

  .btn {
    padding: 4px 12px;
    border-radius: 0px;
    font-size: 11.5px;
    font-family: var(--font-mono);
    font-weight: 600;
    cursor: pointer;
    border: 1px solid var(--border);
    transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease, transform 0.08s ease;
  }

  .btn:active,
  .icon-btn:active,
  .mode-badge-btn:active {
    transform: scale(0.97);
  }

  .btn-secondary {
    background-color: transparent;
    color: var(--text-main);
  }

  .btn-secondary:hover {
    background-color: var(--bg-hover);
  }

  .btn-danger {
    background-color: var(--danger);
    color: #fff;
    border-color: var(--danger);
  }

  .btn-danger:hover {
    opacity: 0.9;
  }

  .btn-primary {
    background-color: var(--accent);
    color: #09090b;
    border-color: var(--accent);
  }

  .btn-primary:hover {
    background-color: var(--accent-hover);
  }

  @media (prefers-reduced-motion: reduce) {
    .modal-overlay,
    .modal-card,
    .stats-badge,
    .document-tab-center {
      animation: none !important;
    }
    .btn,
    .icon-btn,
    .mode-badge-btn {
      transition: none !important;
    }
  }
</style>
