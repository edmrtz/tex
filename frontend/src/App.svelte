<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Tab, EditorMode, CursorPosition } from './types';
  import { createMarkdownEditor } from './editor/editor';
  import {
    GetInitialFiles,
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

  // State
  let tabs = $state<Tab[]>([]);
  let activeTabId = $state<string>('');
  let editorMode = $state<EditorMode>('live');
  let fontSize = $state<number>(15);
  let cursorInfo = $state<CursorPosition>({ line: 1, col: 1, wordCount: 0, charCount: 0 });

  // Confirmation modal state
  let showCloseModal = $state<boolean>(false);
  let pendingCloseTabId = $state<string | null>(null);

  // Editor DOM reference & CM6 instance
  let editorContainerEl: HTMLDivElement | null = null;
  let editorInstance: ReturnType<typeof createMarkdownEditor> | null = null;

  let activeTab = $derived(tabs.find((t) => t.id === activeTabId) || null);

  // Synchronize OS Window Title with active file & dirty status
  $effect(() => {
    if (activeTab) {
      const dirtyMark = activeTab.isDirty ? '● ' : '';
      const name = activeTab.title || 'Untitled';
      WindowSetTitle(`${dirtyMark}${name} — Tex`);
    } else {
      WindowSetTitle('Tex');
    }
  });

  function createNewTab(title = 'Untitled', content = '', path: string | null = null, modTime = 0): Tab {
    return {
      id: 'tab-' + Math.random().toString(36).substring(2, 9),
      title,
      path,
      content,
      isDirty: false,
      modTime,
    };
  }

  function addTab(title = 'Untitled', content = '', path: string | null = null, modTime = 0) {
    const tab = createNewTab(title, content, path, modTime);
    tabs = [...tabs, tab];
    switchTab(tab.id);
  }

  function switchTab(id: string) {
    if (activeTabId === id) return;
    activeTabId = id;
    const tab = tabs.find((t) => t.id === id);
    if (tab && editorInstance) {
      editorInstance.setContent(tab.content);
      editorInstance.focus();
    }
  }

  function requestCloseTab(id: string, e?: MouseEvent) {
    if (e) e.stopPropagation();
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;

    if (tab.isDirty) {
      pendingCloseTabId = id;
      showCloseModal = true;
    } else {
      closeTab(id);
    }
  }

  function closeTab(id: string) {
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const remaining = tabs.filter((t) => t.id !== id);
    if (remaining.length === 0) {
      const fresh = createNewTab();
      tabs = [fresh];
      switchTab(fresh.id);
    } else {
      tabs = remaining;
      if (activeTabId === id) {
        const nextIdx = Math.max(0, idx - 1);
        switchTab(tabs[nextIdx].id);
      }
    }
    showCloseModal = false;
    pendingCloseTabId = null;
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

  async function openFilePath(filePath: string) {
    // Check if already open
    const existing = tabs.find((t) => t.path === filePath);
    if (existing) {
      switchTab(existing.id);
      return;
    }

    try {
      const file = await ReadFile(filePath);
      // If current tab is single, untitled and clean, replace it
      if (tabs.length === 1 && tabs[0].path === null && !tabs[0].isDirty && tabs[0].content === '') {
        tabs = [
          {
            id: tabs[0].id,
            path: file.path,
            title: file.name,
            content: file.content,
            isDirty: false,
            modTime: file.modTime,
          },
        ];
        switchTab(tabs[0].id);
        if (editorInstance) editorInstance.setContent(file.content);
      } else {
        addTab(file.name, file.content, file.path, file.modTime);
      }
    } catch (err) {
      console.error('Error reading file:', err);
    }
  }

  async function handleSave() {
    if (!activeTab) return;
    try {
      let targetPath = activeTab.path;
      if (!targetPath) {
        targetPath = await SaveFileDialog(activeTab.title.endsWith('.md') ? activeTab.title : `${activeTab.title}.md`);
        if (!targetPath) return; // User cancelled
      }

      const res = await SaveFile(targetPath, activeTab.content);
      activeTab.path = res.path;
      activeTab.title = res.name;
      activeTab.isDirty = false;
      activeTab.modTime = res.modTime;
      tabs = [...tabs];
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  }

  async function handleSaveAs() {
    if (!activeTab) return;
    try {
      const defaultName = activeTab.title.endsWith('.md') ? activeTab.title : `${activeTab.title}.md`;
      const targetPath = await SaveFileDialog(defaultName);
      if (!targetPath) return;

      const res = await SaveFile(targetPath, activeTab.content);
      activeTab.path = res.path;
      activeTab.title = res.name;
      activeTab.isDirty = false;
      activeTab.modTime = res.modTime;
      tabs = [...tabs];
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
      if (e.key === 'n') {
        e.preventDefault();
        addTab();
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
        if (activeTabId) requestCloseTab(activeTabId);
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
        if (tabs.length > 1) {
          const curIdx = tabs.findIndex((t) => t.id === activeTabId);
          const nextIdx = e.shiftKey
            ? (curIdx - 1 + tabs.length) % tabs.length
            : (curIdx + 1) % tabs.length;
          switchTab(tabs[nextIdx].id);
        }
      }
    }
  }

  onMount(async () => {
    window.addEventListener('keydown', handleKeyDown);

    // Mount CodeMirror
    if (editorContainerEl) {
      const initialTab = createNewTab('Welcome.md', `# Welcome to Tex ⚡\n\nA fast, distraction-free markdown notepad with live rendering.\n\n## Math Support (KaTeX)\nInline math: $E = mc^2$\n\n$$\n\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}\n$$\n\n## Live Checklists\n- [x] Lightweight & Fast\n- [x] CodeMirror 6 live preview\n- [ ] KaTeX math & Mermaid diagrams\n\n## Diagram Support (Mermaid)\n\`\`\`mermaid\ngraph LR\n  A[Write Markdown] --> B(Live Preview)\n  B --> C{Formulas & Diagrams}\n  C -->|Math| D[KaTeX]\n  C -->|Flow| E[Mermaid]\n\`\`\`\n\n### Shortcuts\n* **Ctrl+N**: New tab\n* **Ctrl+O**: Open file\n* **Ctrl+S**: Save file\n* **Ctrl+W**: Close tab\n* **Ctrl+E**: Toggle Live Preview & Raw Source\n* **Ctrl+F**: Find & Replace\n* **Ctrl+= / Ctrl+-**: Zoom font\n* **Ctrl+Tab**: Switch tabs`);

      tabs = [initialTab];
      activeTabId = initialTab.id;

      editorInstance = createMarkdownEditor(
        editorContainerEl,
        initialTab.content,
        editorMode,
        fontSize,
        {
          onChange: (newContent) => {
            if (activeTab) {
              activeTab.content = newContent;
              activeTab.isDirty = true;
              tabs = [...tabs];
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

    // Process CLI arguments passed at startup
    try {
      const initFiles = await GetInitialFiles();
      if (initFiles && initFiles.length > 0) {
        for (const file of initFiles) {
          await openFilePath(file);
        }
      }
    } catch (e) {
      console.error('Error getting initial files:', e);
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
      const target = tabs.find((t) => t.path === modifiedPath);
      if (target && !target.isDirty) {
        try {
          const fresh = await ReadFile(modifiedPath);
          target.content = fresh.content;
          target.modTime = fresh.modTime;
          if (activeTabId === target.id && editorInstance) {
            editorInstance.setContent(fresh.content);
          }
          tabs = [...tabs];
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
  <!-- Tab Bar -->
  <header class="tab-bar-container">
    <div class="tab-list">
      {#each tabs as tab (tab.id)}
        <div
          class="tab-item"
          class:active={tab.id === activeTabId}
          onclick={() => switchTab(tab.id)}
          onauxclick={(e) => { if (e.button === 1) requestCloseTab(tab.id, e); }}
          role="button"
          tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter') switchTab(tab.id); }}
        >
          <span class="tab-title" title={tab.path || tab.title}>{tab.title}</span>
          {#if tab.isDirty}
            <span class="tab-dirty-indicator" title="Unsaved changes"></span>
          {/if}
          <button
            class="tab-close-btn"
            title="Close Tab (Ctrl+W)"
            onclick={(e) => requestCloseTab(tab.id, e)}
          >
            ×
          </button>
        </div>
      {/each}
      <button class="tab-add-btn" title="New Tab (Ctrl+N)" onclick={() => addTab()}>+</button>
    </div>

    <!-- Quick Actions -->
    <div class="tab-actions">
      <button class="icon-btn" title="Find & Replace (Ctrl+F)" onclick={() => editorInstance?.openSearch()}>
        🔍 Find
      </button>
      <button class="icon-btn" title="Open File (Ctrl+O)" onclick={handleOpenFile}>
        Open
      </button>
      <button class="icon-btn" title="Save File (Ctrl+S)" onclick={handleSave}>
        Save
      </button>
      <button
        class="icon-btn"
        title="Toggle Live Render / Raw Source (Ctrl+E)"
        onclick={toggleLiveMode}
      >
        {editorMode === 'live' ? '⚡ Live' : '📝 Raw'}
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

  <!-- Close Confirmation Modal -->
  {#if showCloseModal && pendingCloseTabId}
    {@const tabToClose = tabs.find((t) => t.id === pendingCloseTabId)}
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
          <strong>"{tabToClose?.title}"</strong>?
          Your changes will be lost if you don't save them.
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick={() => { showCloseModal = false; }}>
            Cancel
          </button>
          <button class="btn btn-danger" onclick={() => { if (pendingCloseTabId) closeTab(pendingCloseTabId); }}>
            Don't Save
          </button>
          <button
            class="btn btn-primary"
            onclick={async () => {
              if (pendingCloseTabId) {
                switchTab(pendingCloseTabId);
                await handleSave();
                closeTab(pendingCloseTabId);
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
