<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { NoteDocument, FileTreeItem, EditorMode, CursorPosition } from './types';
  import { createMarkdownEditor } from './editor/editor';
  import Sidebar from './components/Sidebar.svelte';
  import {
    GetInitialFiles,
    GetWorkspaceInfo,
    OpenDirectoryDialog,
    ReadDirectoryTree,
    ReadFile,
    SaveFile,
    OpenFileDialog,
    SaveFileDialog,
  } from '../wailsjs/go/main/App';
  import {
    EventsOn,
    EventsOff,
    WindowSetTitle,
    OnFileDrop,
    OnFileDropOff,
  } from '../wailsjs/runtime/runtime';
  import {
    PanelLeft,
    PanelLeftClose,
    Save,
    Search,
    Eye,
    Code,
  } from '@lucide/svelte';

  // State
  let sidebarOpen = $state<boolean>(true);
  let notes = $state<NoteDocument[]>([]);
  let activeNoteId = $state<string>('');
  let currentFolder = $state<string>('');
  let folderTree = $state<FileTreeItem[]>([]);
  let editorMode = $state<EditorMode>('live');
  let fontSize = $state<number>(15);
  let cursorInfo = $state<CursorPosition>({ line: 1, col: 1, wordCount: 0, charCount: 0 });

  // Confirmation modal state
  let showCloseModal = $state<boolean>(false);
  let pendingCloseNoteId = $state<string | null>(null);

  // Editor DOM reference & CM6 instance
  let editorContainerEl: HTMLDivElement | null = null;
  let editorInstance: ReturnType<typeof createMarkdownEditor> | null = null;

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
    };
  }

  function addNote(title = 'Untitled', content = '', path: string | null = null, modTime = 0) {
    const note = createNewNote(title, content, path, modTime);
    notes = [...notes, note];
    switchNote(note.id);
  }

  function switchNote(id: string) {
    if (activeNoteId === id) return;
    activeNoteId = id;
    const note = notes.find((n) => n.id === id);
    if (note && editorInstance) {
      editorInstance.setContent(note.content);
      editorInstance.focus();
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
    if (idx === -1) return;

    const remaining = notes.filter((n) => n.id !== id);
    if (remaining.length === 0) {
      const fresh = createNewNote();
      notes = [fresh];
      switchNote(fresh.id);
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

  async function handleOpenFile() {
    try {
      const path = await OpenFileDialog();
      if (!path) return;
      await openFilePath(path);
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }

  async function handleOpenFolder() {
    try {
      const folder = await OpenDirectoryDialog();
      if (!folder) return;
      currentFolder = folder;
      await handleRefreshFolder();
    } catch (err) {
      console.error('Failed to open folder:', err);
    }
  }

  async function handleRefreshFolder() {
    if (!currentFolder) return;
    try {
      const tree = await ReadDirectoryTree(currentFolder, 3);
      folderTree = tree || [];
    } catch (err) {
      console.error('Failed to read directory tree:', err);
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
          },
        ];
        switchNote(notes[0].id);
        if (editorInstance) editorInstance.setContent(file.content);
      } else {
        addNote(file.name, file.content, file.path, file.modTime);
      }
    } catch (err) {
      console.error('Error reading file:', err);
    }
  }

  async function handleSave() {
    if (!activeNote) return;
    try {
      let targetPath = activeNote.path;
      if (!targetPath) {
        targetPath = await SaveFileDialog(
          activeNote.title.endsWith('.md') ? activeNote.title : `${activeNote.title}.md`
        );
        if (!targetPath) return; // Cancelled
      }

      const res = await SaveFile(targetPath, activeNote.content);
      activeNote.path = res.path;
      activeNote.title = res.name;
      activeNote.isDirty = false;
      activeNote.modTime = res.modTime;
      notes = [...notes];
      handleRefreshFolder();
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  }

  async function handleSaveAs() {
    if (!activeNote) return;
    try {
      const defaultName = activeNote.title.endsWith('.md')
        ? activeNote.title
        : `${activeNote.title}.md`;
      const targetPath = await SaveFileDialog(defaultName);
      if (!targetPath) return;

      const res = await SaveFile(targetPath, activeNote.content);
      activeNote.path = res.path;
      activeNote.title = res.name;
      activeNote.isDirty = false;
      activeNote.modTime = res.modTime;
      notes = [...notes];
      handleRefreshFolder();
    } catch (err) {
      console.error('Failed to save file as:', err);
    }
  }

  function toggleLiveMode() {
    editorMode = editorMode === 'live' ? 'source' : 'live';
    if (editorInstance) {
      editorInstance.setMode(editorMode);
    }
  }

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function zoomIn() {
    fontSize = Math.min(32, fontSize + 1);
    editorInstance?.setFontSize(fontSize);
  }

  function zoomOut() {
    fontSize = Math.max(10, fontSize - 1);
    editorInstance?.setFontSize(fontSize);
  }

  function zoomReset() {
    fontSize = 15;
    editorInstance?.setFontSize(fontSize);
  }

  // Keyboard shortcut listener
  function handleKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === '\\') {
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
        toggleLiveMode();
      } else if (e.key === 'f') {
        e.preventDefault();
        editorInstance?.openSearch();
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

    // Initialize initial note
    const initialNote = createNewNote(
      'Welcome.md',
      `# Welcome to Tex ⚡\n\nA fast, distraction-free markdown notepad with live rendering.\n\n## Math Support (KaTeX)\nInline math: $E = mc^2$\n\n$$\n\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}\n$$\n\n## Live Checklists\n- [x] Lightweight & Fast\n- [x] CodeMirror 6 live preview\n- [x] KaTeX math & Mermaid diagrams\n\n## Diagram Support (Mermaid)\n\`\`\`mermaid\ngraph LR\n  A[Write Markdown] --> B(Live Preview)\n  B --> C{Formulas & Diagrams}\n  C -->|Math| D[KaTeX]\n  C -->|Flow| E[Mermaid]\n\`\`\`\n\n### Shortcuts\n* **Ctrl+B**: Toggle Sidebar\n* **Ctrl+N**: New note\n* **Ctrl+O**: Open file\n* **Ctrl+Shift+O**: Open folder\n* **Ctrl+S**: Save file\n* **Ctrl+W**: Close note\n* **Ctrl+E**: Toggle Live Preview & Raw Source\n* **Ctrl+F**: Find & Replace\n* **Ctrl+= / Ctrl+-**: Zoom font\n* **Ctrl+Tab**: Cycle notes`
    );

    notes = [initialNote];
    activeNoteId = initialNote.id;

    // Mount CodeMirror
    if (editorContainerEl) {
      editorInstance = createMarkdownEditor(
        editorContainerEl,
        initialNote.content,
        editorMode,
        fontSize,
        {
          onChange: (newContent) => {
            if (activeNote) {
              activeNote.content = newContent;
              activeNote.isDirty = true;
              activeNote.preview = cleanPreview(newContent);
              notes = [...notes];
            }
          },
          onCursorChange: (pos) => {
            cursorInfo = pos;
          },
          onSaveShortcut: () => {
            handleSave();
          },
        }
      );
    }

    // Load workspace info and folder tree
    try {
      const ws = await GetWorkspaceInfo();
      if (ws) {
        if (ws.currentDir) {
          currentFolder = ws.currentDir;
        }
        if (ws.initialTree && ws.initialTree.length > 0) {
          folderTree = ws.initialTree;
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
    OnFileDrop((x: number, y: number, paths: string[]) => {
      if (paths && paths.length > 0) {
        for (const file of paths) {
          openFilePath(file);
        }
      }
    }, true);

    // Listen for files passed via CLI while already running
    EventsOn('cli:open-files', async (files: string[]) => {
      if (files && files.length > 0) {
        for (const file of files) {
          await openFilePath(file);
        }
      }
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
    OnFileDropOff();
    EventsOff('cli:open-files');
    EventsOff('file:modified');
    if (editorInstance) {
      editorInstance.destroy();
    }
  });
</script>

<div class="tex-app">
  <!-- Left File Tree Sidebar -->
  <Sidebar
    isOpen={sidebarOpen}
    activePath={activeNote?.path || null}
    {currentFolder}
    {folderTree}
    onSelectFile={(filePath) => openFilePath(filePath)}
    onNewNote={addNote}
    onOpenFile={handleOpenFile}
    onOpenFolder={handleOpenFolder}
    onRefreshFolder={handleRefreshFolder}
    onToggleSidebar={toggleSidebar}
  />

  <!-- Main Workspace -->
  <div class="main-workspace">
    <!-- Top Minimalist Document Header -->
    <header class="document-header">
      <div class="header-left">
        <button
          class="icon-btn sidebar-toggle-btn"
          title="{sidebarOpen ? 'Hide Sidebar (Ctrl+B)' : 'Show Sidebar (Ctrl+B)'}"
          onclick={toggleSidebar}
          type="button"
        >
          {#if sidebarOpen}
            <PanelLeftClose size={16} />
          {:else}
            <PanelLeft size={16} />
          {/if}
        </button>

        <div class="document-title-wrapper">
          <span class="document-title">
            {activeNote?.title || 'Untitled Note'}
          </span>
          {#if activeNote?.isDirty}
            <span class="dirty-badge" title="Unsaved changes">●</span>
          {/if}
          {#if activeNote?.path}
            <span class="document-path" title={activeNote.path}>
              {activeNote.path}
            </span>
          {/if}
        </div>
      </div>

      <div class="header-right">
        <button
          class="icon-btn"
          title="Find & Replace (Ctrl+F)"
          onclick={() => editorInstance?.openSearch()}
          type="button"
        >
          <Search size={14} />
          <span>Find</span>
        </button>

        <button
          class="icon-btn"
          title="Save File (Ctrl+S)"
          onclick={handleSave}
          type="button"
        >
          <Save size={14} />
          <span>Save</span>
        </button>

        <button
          class="mode-badge-btn"
          title="Toggle Live Render / Raw Source (Ctrl+E)"
          onclick={toggleLiveMode}
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

    <!-- Editor Container -->
    <main class="editor-container">
      <div class="cm-editor-wrapper" bind:this={editorContainerEl}></div>
    </main>

    <!-- Status Bar -->
    <footer class="status-bar">
      <div class="status-left">
        <span>Ln {cursorInfo.line}, Col {cursorInfo.col}</span>
        <span>{cursorInfo.wordCount} words</span>
        <span>{cursorInfo.charCount} characters</span>
      </div>
      <div class="status-right">
        <span class="zoom-controls">
          <button class="zoom-btn" title="Zoom Out (Ctrl+-)" onclick={zoomOut}>-</button>
          <button class="zoom-text" title="Reset Zoom (Ctrl+0)" onclick={zoomReset}>{fontSize}px</button>
          <button class="zoom-btn" title="Zoom In (Ctrl+=)" onclick={zoomIn}>+</button>
        </span>
        <button class="badge" onclick={toggleLiveMode} type="button">
          Mode: {editorMode === 'live' ? 'Live Preview' : 'Raw Source'}
        </button>
        <span>UTF-8</span>
        <span>Markdown</span>
      </div>
    </footer>
  </div>

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
                await handleSave();
                closeNote(pendingCloseNoteId);
              }
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .tex-app {
    display: flex;
    flex-direction: row;
    height: 100%;
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
    background-color: var(--bg-main);
  }

  /* Document Header */
  .document-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 42px;
    min-height: 42px;
    padding: 0 14px;
    background-color: #141416;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    user-select: none;
    gap: 12px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;
  }

  .sidebar-toggle-btn {
    color: #a1a1aa;
    padding: 6px;
    border-radius: 6px;
  }

  .sidebar-toggle-btn:hover {
    color: #ffffff;
    background-color: rgba(255, 255, 255, 0.08);
  }

  .document-title-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    overflow: hidden;
  }

  .document-title {
    font-size: 13.5px;
    font-weight: 600;
    color: #f4f4f5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dirty-badge {
    color: #f59e0b;
    font-size: 11px;
    flex-shrink: 0;
  }

  .document-path {
    font-size: 11.5px;
    color: #71717a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: none;
  }

  @media (min-width: 800px) {
    .document-path {
      display: inline;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .mode-badge-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    background-color: rgba(56, 189, 248, 0.1);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.25);
    border-radius: 6px;
    padding: 4px 9px;
    font-size: 12px;
    font-family: inherit;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  .mode-badge-btn:hover {
    background-color: rgba(56, 189, 248, 0.18);
    border-color: rgba(56, 189, 248, 0.4);
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    backdrop-filter: blur(2px);
  }

  .modal-card {
    background-color: #1f1f23;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 20px 24px;
    width: 400px;
    max-width: 90%;
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
  }

  .modal-title {
    font-size: 16px;
    font-weight: 600;
    color: #f4f4f5;
    margin-bottom: 8px;
  }

  .modal-desc {
    font-size: 13px;
    color: #a1a1aa;
    margin-bottom: 20px;
    line-height: 1.4;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .btn {
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 12.5px;
    font-family: inherit;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: background-color 0.15s ease;
  }

  .btn-secondary {
    background-color: rgba(255, 255, 255, 0.08);
    color: #d4d4d8;
  }

  .btn-secondary:hover {
    background-color: rgba(255, 255, 255, 0.14);
  }

  .btn-danger {
    background-color: rgba(239, 68, 68, 0.18);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .btn-danger:hover {
    background-color: rgba(239, 68, 68, 0.28);
  }

  .btn-primary {
    background-color: #38bdf8;
    color: #09090b;
    font-weight: 600;
  }

  .btn-primary:hover {
    background-color: #7dd3fc;
  }
</style>
