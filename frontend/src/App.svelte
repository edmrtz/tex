<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type {
    NoteDocument,
    FileTreeItem,
    EditorMode,
    CursorPosition,
    AppSettings,
  } from './types';
  import { createMarkdownEditor } from './editor/editor';
  import { getUiFontFamily, getMonoFontFamily } from './editor/theme';
  import Sidebar from './components/Sidebar.svelte';
  import FindReplace from './components/FindReplace.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
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
    WindowMinimise,
    WindowToggleMaximise,
    Quit,
  } from '../wailsjs/runtime/runtime';
  import {
    PanelLeft,
    PanelLeftClose,
    Save,
    Search,
    Eye,
    Code,
    Settings as SettingsIcon,
  } from '@lucide/svelte';

  const defaultSettings: AppSettings = {
    theme: 'dark',
    uiFont: 'system',
    monoFont: 'default',
    lineNumbers: false,
    vimMode: false,
    fontSize: 15,
  };

  function loadSettings(): AppSettings {
    try {
      const raw = localStorage.getItem('tex:settings');
      if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
    } catch {}
    return defaultSettings;
  }

  // State
  let sidebarOpen = $state<boolean>(true);
  let notes = $state<NoteDocument[]>([]);
  let activeNoteId = $state<string>('');
  let currentFolder = $state<string>('');
  let folderTree = $state<FileTreeItem[]>([]);
  let editorMode = $state<EditorMode>('live');
  let settings = $state<AppSettings>(loadSettings());
  let showFindReplace = $state<boolean>(false);
  let showSettingsModal = $state<boolean>(false);
  let cursorInfo = $state<CursorPosition>({ line: 1, col: 1, wordCount: 0, charCount: 0 });

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

  // Confirmation modal state
  let showCloseModal = $state<boolean>(false);
  let pendingCloseNoteId = $state<string | null>(null);

  // Editor DOM reference & CM6 instance
  let editorContainerEl = $state<HTMLDivElement | null>(null);
  let editorInstance = $state<ReturnType<typeof createMarkdownEditor> | null>(null);

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

    // Apply initial settings
    applyAppSettings(settings);

    // Initialize initial note
    const initialNote = createNewNote(
      'Welcome.md',
      `# Welcome to Tex ⚡\n\nA fast, distraction-free markdown notepad with live rendering.\n\n## Math Support (KaTeX)\nInline math: $E = mc^2$\n\n$$\n\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}\n$$\n\n## Live Checklists\n- [x] Lightweight & Fast\n- [x] CodeMirror 6 live preview\n- [x] KaTeX math & Mermaid diagrams\n\n## Diagram Support (Mermaid)\n\`\`\`mermaid\ngraph LR\n  A[Write Markdown] --> B(Live Preview)\n  B --> C{Formulas & Diagrams}\n  C -->|Math| D[KaTeX]\n  C -->|Flow| E[Mermaid]\n\`\`\`\n\n### Shortcuts\n* **Ctrl+B**: Toggle Sidebar\n* **Ctrl+N**: New note\n* **Ctrl+O**: Open file\n* **Ctrl+Shift+O**: Open folder\n* **Ctrl+S**: Save file\n* **Ctrl+W**: Close note\n* **Ctrl+E**: Toggle Live Preview & Raw Source\n* **Ctrl+F**: Find & Replace\n* **Ctrl+,**: Preferences\n* **Ctrl+= / Ctrl+-**: Zoom font\n* **Ctrl+Tab**: Cycle notes`
    );

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
          onFindShortcut: () => {
            showFindReplace = true;
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
  <!-- Top TUI Window Titlebar -->
  <div class="tui-window-titlebar" style="--wails-draggable: drag;">
    <div class="titlebar-left">
      <span class="tui-bracket">[</span>
      <span class="tui-brand">tex</span>
      <span class="tui-bracket">]</span>
      <span class="tui-sep">//</span>
      <span class="tui-title-text">{activeNote?.title || 'untitled'}</span>
      {#if activeNote?.isDirty}
        <span class="tui-dirty-dot">●</span>
      {/if}
    </div>

    <div class="titlebar-controls" style="--wails-draggable: no-drag;">
      <button class="tui-win-btn" title="Minimize" onclick={WindowMinimise} type="button">_</button>
      <button class="tui-win-btn" title="Maximize" onclick={WindowToggleMaximise} type="button">□</button>
      <button class="tui-win-btn btn-close" title="Close" onclick={Quit} type="button">×</button>
    </div>
  </div>

  <!-- App Body (Sidebar + Editor) -->
  <div class="app-body">
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
      onOpenSettings={() => { showSettingsModal = true; }}
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

          <div class="document-title-wrapper">
            <span class="document-title">
              {activeNote?.title || 'Untitled'}
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
            onclick={() => { showFindReplace = !showFindReplace; }}
            type="button"
          >
            <Search size={13} />
            <span>[find]</span>
          </button>

          <button
            class="icon-btn"
            title="Save File (Ctrl+S)"
            onclick={handleSave}
            type="button"
          >
            <Save size={13} />
            <span>[save]</span>
          </button>

          <button
            class="mode-badge-btn"
            title="Toggle Live Render / Raw Source (Ctrl+E)"
            onclick={toggleLiveMode}
            type="button"
          >
            {#if editorMode === 'live'}
              <Eye size={13} />
              <span>[live]</span>
            {:else}
              <Code size={13} />
              <span>[raw]</span>
            {/if}
          </button>

          <button
            class="icon-btn"
            title="Preferences (Ctrl+,)"
            onclick={() => { showSettingsModal = true; }}
            type="button"
          >
            <SettingsIcon size={13} />
            <span>[prefs]</span>
          </button>
        </div>
      </header>

      <!-- Editor Container -->
      <main class="editor-container">
        <FindReplace
          view={editorInstance?.view || null}
          isOpen={showFindReplace}
          onClose={() => { showFindReplace = false; }}
        />
        <div class="cm-editor-wrapper" bind:this={editorContainerEl}></div>
      </main>
    </div>
  </div>

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
    height: 36px;
    min-height: 36px;
    padding: 0 10px;
    background-color: var(--bg-header);
    border-bottom: 1px solid var(--border);
    user-select: none;
    font-family: var(--font-mono);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
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

  .document-title-wrapper {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    overflow: hidden;
  }

  .document-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dirty-badge {
    color: var(--dirty);
    font-size: 10px;
    flex-shrink: 0;
  }

  .document-path {
    font-size: 11px;
    color: var(--text-muted);
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
    gap: 4px;
    flex-shrink: 0;
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
</style>
