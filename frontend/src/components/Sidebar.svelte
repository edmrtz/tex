<script lang="ts">
  import type { FileTreeItem } from '../types';
  import {
    Plus,
    FolderOpen,
    Folder,
    FileText,
    Search,
    X,
    PanelLeftClose,
    RefreshCw,
    Settings as SettingsIcon,
    Trash2,
    Edit2,
  } from '@lucide/svelte';
  import FileTreeNode from './FileTreeNode.svelte';

  let {
    isOpen,
    activePath,
    currentFolder,
    folderTree,
    onSelectFile,
    onNewNote,
    onOpenFile,
    onOpenFolder,
    onRefreshFolder,
    onToggleSidebar,
    onOpenSettings,
    onCreateFileInFolder,
    onDeleteFile,
    onMoveFile,
    onRenameFile,
  }: {
    isOpen: boolean;
    activePath: string | null;
    currentFolder: string;
    folderTree: FileTreeItem[];
    onSelectFile: (path: string) => void;
    onNewNote: () => void;
    onOpenFile: () => void;
    onOpenFolder: () => void;
    onRefreshFolder: () => void;
    onToggleSidebar: () => void;
    onOpenSettings?: () => void;
    onCreateFileInFolder?: (folderPath: string, fileName: string) => void;
    onDeleteFile?: (filePath: string) => void;
    onMoveFile?: (sourcePath: string, targetDir: string) => void;
    onRenameFile?: (oldPath: string, newName: string) => void;
  } = $props();

  let searchQuery = $state('');
  let contextMenu = $state<{ x: number; y: number; item: FileTreeItem } | null>(null);
  let showNewFileModal = $state<{ folderPath: string } | null>(null);
  let showDeleteModal = $state<FileTreeItem | null>(null);
  let showRenameModal = $state<FileTreeItem | null>(null);
  let newFileName = $state('');
  let newFileInputEl = $state<HTMLInputElement | null>(null);
  let renameName = $state('');
  let renameInputEl = $state<HTMLInputElement | null>(null);

  let draggedItem = $state<FileTreeItem | null>(null);
  let isRootDragOver = $state(false);

  function handleNodeContextMenu(e: MouseEvent, item: FileTreeItem) {
    e.preventDefault();
    e.stopPropagation();
    contextMenu = {
      x: Math.min(e.clientX, window.innerWidth - 170),
      y: Math.min(e.clientY, window.innerHeight - 130),
      item,
    };
  }

  function handleWorkspaceHeaderContextMenu(e: MouseEvent) {
    if (!currentFolder) return;
    e.preventDefault();
    e.stopPropagation();
    contextMenu = {
      x: Math.min(e.clientX, window.innerWidth - 170),
      y: Math.min(e.clientY, window.innerHeight - 130),
      item: {
        path: currentFolder,
        name: getFolderDisplayName(currentFolder),
        isDir: true,
        modTime: 0,
        size: 0,
      },
    };
  }

  function openNewFilePrompt(folderPath: string) {
    contextMenu = null;
    newFileName = '';
    showNewFileModal = { folderPath };
    setTimeout(() => newFileInputEl?.focus(), 50);
  }

  function promptDelete(item: FileTreeItem) {
    contextMenu = null;
    showDeleteModal = item;
  }

  function confirmDelete() {
    if (!showDeleteModal) return;
    onDeleteFile?.(showDeleteModal.path);
    showDeleteModal = null;
  }

  function promptRename(item: FileTreeItem) {
    contextMenu = null;
    renameName = item.name;
    showRenameModal = item;
    setTimeout(() => {
      renameInputEl?.focus();
      renameInputEl?.select();
    }, 50);
  }

  function submitRename(e?: Event) {
    if (e) e.preventDefault();
    if (!showRenameModal || !renameName.trim()) return;
    if (onRenameFile) {
      onRenameFile(showRenameModal.path, renameName.trim());
    }
    showRenameModal = null;
  }

  function submitNewFile(e?: Event) {
    if (e) e.preventDefault();
    if (!showNewFileModal || !newFileName.trim()) return;
    if (onCreateFileInFolder) {
      onCreateFileInFolder(showNewFileModal.folderPath, newFileName.trim());
    }
    showNewFileModal = null;
  }

  function handleDragStartNode(e: DragEvent, item: FileTreeItem) {
    draggedItem = item;
  }

  function handleDragEndNode() {
    draggedItem = null;
    isRootDragOver = false;
  }

  function handleDropNode(targetDir: string) {
    if (draggedItem && draggedItem.path !== targetDir) {
      onMoveFile?.(draggedItem.path, targetDir);
    }
    draggedItem = null;
    isRootDragOver = false;
  }

  function getFolderDisplayName(path: string): string {
    if (!path) return 'Workspace';
    const parts = path.replace(/[/\\]+$/, '').split(/[/\\]/);
    return parts[parts.length - 1] || 'Workspace';
  }

  function filterTree(items: FileTreeItem[], query: string): FileTreeItem[] {
    if (!query) return items;
    const q = query.toLowerCase();
    const result: FileTreeItem[] = [];

    for (const item of items) {
      if (item.isDir) {
        const filteredChildren = item.children ? filterTree(item.children, query) : [];
        if (filteredChildren.length > 0 || item.name.toLowerCase().includes(q)) {
          result.push({
            ...item,
            children: filteredChildren,
          });
        }
      } else if (item.name.toLowerCase().includes(q)) {
        result.push(item);
      }
    }
    return result;
  }

  const filteredTree = $derived(filterTree(folderTree, searchQuery.trim()));
</script>

<svelte:window
  onclick={() => { contextMenu = null; }}
  onkeydown={(e) => {
    if (e.key === 'Escape') {
      contextMenu = null;
      showNewFileModal = null;
      showRenameModal = null;
      showDeleteModal = null;
    }
  }}
/>

{#if isOpen}
  <aside class="sidebar">
    <!-- Header -->
    <div
      class="sidebar-header"
      class:drag-over={isRootDragOver}
      oncontextmenu={handleWorkspaceHeaderContextMenu}
      ondragover={(e) => {
        if (draggedItem && currentFolder) {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          isRootDragOver = true;
        }
      }}
      ondragleave={() => { isRootDragOver = false; }}
      ondrop={(e) => {
        e.preventDefault();
        isRootDragOver = false;
        if (currentFolder) {
          handleDropNode(currentFolder);
        }
      }}
      title="Right-click for options (or drag files here to move to root)"
    >
      <div class="workspace-meta">
        <span class="tui-bracket">[</span>
        <span class="workspace-name" title={currentFolder}>
          {getFolderDisplayName(currentFolder)}
        </span>
        <span class="tui-bracket">]</span>
      </div>

      <div class="header-actions">
        <button
          class="action-btn"
          title="New Note (Ctrl+N)"
          onclick={onNewNote}
          type="button"
        >
          <Plus size={16} />
        </button>
        <button
          class="action-btn"
          title="Refresh Workspace"
          onclick={onRefreshFolder}
          type="button"
        >
          <RefreshCw size={14} />
        </button>
        <button
          class="action-btn"
          title="Open Folder"
          onclick={onOpenFolder}
          type="button"
        >
          <FolderOpen size={16} />
        </button>
        {#if onOpenSettings}
          <button
            class="action-btn"
            title="Preferences (Ctrl+,)"
            onclick={onOpenSettings}
            type="button"
          >
            <SettingsIcon size={15} />
          </button>
        {/if}
        <button
          class="action-btn"
          title="Collapse Sidebar (Ctrl+B)"
          onclick={onToggleSidebar}
          type="button"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>
    </div>

    <!-- Search Input -->
    <div class="sidebar-search">
      <div class="search-input-wrapper">
        <Search size={14} class="search-icon" />
        <input
          type="text"
          placeholder="Search files..."
          bind:value={searchQuery}
          class="search-input"
        />
        {#if searchQuery}
          <button
            class="clear-search"
            onclick={() => { searchQuery = ''; }}
            type="button"
          >
            <X size={12} />
          </button>
        {/if}
      </div>
    </div>

    <!-- Scrollable File Tree -->
    <div class="sidebar-content">
      {#if !currentFolder}
        <div class="folder-prompt">
          <button class="btn-open-folder" onclick={onOpenFolder} type="button">
            <FolderOpen size={15} />
            <span>Open Folder...</span>
          </button>
        </div>
      {:else if filteredTree.length === 0}
        <div class="empty-state">
          {searchQuery ? 'No matching markdown files' : 'No markdown files found'}
        </div>
      {:else}
        <div
          class="tree-list"
          class:drag-over={isRootDragOver}
          ondragover={(e) => {
            if (draggedItem && currentFolder) {
              e.preventDefault();
              if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
              isRootDragOver = true;
            }
          }}
          ondragleave={() => { isRootDragOver = false; }}
          ondrop={(e) => {
            e.preventDefault();
            isRootDragOver = false;
            if (currentFolder) {
              handleDropNode(currentFolder);
            }
          }}
        >
          {#each filteredTree as item (item.path)}
            <FileTreeNode
              {item}
              {activePath}
              {onSelectFile}
              onContextMenu={handleNodeContextMenu}
              onDragStartNode={handleDragStartNode}
              onDragEndNode={handleDragEndNode}
              onDropNode={handleDropNode}
            />
          {/each}
        </div>
      {/if}
    </div>

    <!-- Footer Quick Action -->
    <div class="sidebar-footer">
      <button class="footer-btn" onclick={onOpenFile} type="button">
        <FileText size={13} />
        <span>Open Other File...</span>
        <span class="shortcut-tag">Ctrl+O</span>
      </button>
    </div>
  </aside>
{/if}

{#if contextMenu}
  <div
    class="tui-context-menu"
    style="top: {contextMenu.y}px; left: {contextMenu.x}px;"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="context-menu-header">
      <span class="tui-bracket">[</span>
      <span class="context-menu-title">{contextMenu.item.name}</span>
      <span class="tui-bracket">]</span>
    </div>
    {#if contextMenu.item.isDir}
      <button
        class="context-menu-item"
        onclick={() => openNewFilePrompt(contextMenu!.item.path)}
        type="button"
      >
        <Plus size={13} />
        <span>[+ new file]</span>
      </button>
      <button
        class="context-menu-item"
        onclick={() => promptRename(contextMenu!.item)}
        type="button"
      >
        <Edit2 size={13} />
        <span>[~ rename folder]</span>
      </button>
      <button
        class="context-menu-item danger"
        onclick={() => promptDelete(contextMenu!.item)}
        type="button"
      >
        <Trash2 size={13} />
        <span>[- delete folder]</span>
      </button>
    {:else}
      <button
        class="context-menu-item"
        onclick={() => promptRename(contextMenu!.item)}
        type="button"
      >
        <Edit2 size={13} />
        <span>[~ rename file]</span>
      </button>
      <button
        class="context-menu-item danger"
        onclick={() => promptDelete(contextMenu!.item)}
        type="button"
      >
        <Trash2 size={13} />
        <span>[- delete file]</span>
      </button>
    {/if}
  </div>
{/if}

{#if showRenameModal}
  <div
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={() => { showRenameModal = null; }}
    onkeydown={(e) => { if (e.key === 'Escape') showRenameModal = null; }}
  >
    <div
      class="modal-card"
      role="document"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="modal-title">
        <span class="tui-bracket">[</span>
        <span>rename {showRenameModal.isDir ? 'folder' : 'file'}</span>
        <span class="tui-bracket">]</span>
      </div>
      <form onsubmit={submitRename}>
        <div class="modal-input-row">
          <input
            bind:this={renameInputEl}
            type="text"
            bind:value={renameName}
            class="tui-modal-input"
            autofocus
          />
        </div>
        <div class="modal-actions">
          <button
            type="button"
            class="btn btn-secondary"
            onclick={() => { showRenameModal = null; }}
          >
            cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            disabled={!renameName.trim() || renameName.trim() === showRenameModal.name}
          >
            rename
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if showNewFileModal}
  <div
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={() => { showNewFileModal = null; }}
    onkeydown={(e) => { if (e.key === 'Escape') showNewFileModal = null; }}
  >
    <div
      class="modal-card"
      role="document"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="modal-title">
        <span class="tui-bracket">[</span>
        <span>new file in {getFolderDisplayName(showNewFileModal.folderPath)}</span>
        <span class="tui-bracket">]</span>
      </div>
      <form onsubmit={submitNewFile}>
        <div class="modal-input-row">
          <input
            bind:this={newFileInputEl}
            type="text"
            bind:value={newFileName}
            placeholder="document.md"
            class="tui-modal-input"
            autofocus
          />
        </div>
        <div class="modal-actions">
          <button
            type="button"
            class="btn btn-secondary"
            onclick={() => { showNewFileModal = null; }}
          >
            cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            disabled={!newFileName.trim()}
          >
            create
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if showDeleteModal}
  <div
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={() => { showDeleteModal = null; }}
    onkeydown={(e) => { if (e.key === 'Escape') showDeleteModal = null; }}
  >
    <div
      class="modal-card"
      role="document"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="modal-title danger-title">
        <span class="tui-bracket">[</span>
        <span>delete {showDeleteModal.isDir ? 'folder' : 'file'}</span>
        <span class="tui-bracket">]</span>
      </div>
      <div class="modal-message">
        Are you sure you want to delete <strong class="file-highlight">"{showDeleteModal.name}"</strong>?
        <div class="warning-text">This will remove it from disk.</div>
      </div>
      <div class="modal-actions">
        <button
          type="button"
          class="btn btn-secondary"
          onclick={() => { showDeleteModal = null; }}
        >
          cancel
        </button>
        <button
          type="button"
          class="btn btn-danger"
          onclick={confirmDelete}
        >
          delete
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .sidebar {
    width: 250px;
    min-width: 250px;
    height: 100%;
    background-color: var(--bg-sidebar);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    user-select: none;
    z-index: 10;
    font-family: var(--font-mono);
  }

  /* Header */
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
    background-color: var(--bg-sidebar);
  }

  .workspace-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  .tui-bracket {
    color: var(--text-muted);
    font-size: 11.5px;
  }

  .workspace-name {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--text-main);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-transform: uppercase;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 0px;
    color: var(--text-muted);
    cursor: pointer;
    transition: background-color 0.1s ease, color 0.1s ease;
  }

  .action-btn:hover {
    background-color: var(--bg-hover);
    border-color: var(--border);
    color: var(--text-bright);
  }

  /* Search */
  .sidebar-search {
    padding: 6px 8px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    background-color: var(--bg-app);
    border: 1px solid var(--border);
    border-radius: 0px;
    padding: 3px 6px;
    gap: 6px;
    transition: border-color 0.1s ease;
  }

  .search-input-wrapper:focus-within {
    border-color: var(--border-focus);
  }

  :global(.search-icon) {
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .search-input {
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-bright);
    font-size: 11px;
    font-family: var(--font-mono);
    width: 100%;
  }

  .search-input::placeholder {
    color: var(--text-muted);
  }

  .clear-search {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0px;
  }

  .clear-search:hover {
    color: var(--text-bright);
  }

  /* Content */
  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px 6px 16px;
  }

  .sidebar-content::-webkit-scrollbar {
    width: 4px;
  }

  .sidebar-content::-webkit-scrollbar-thumb {
    background-color: var(--border);
    border-radius: 0px;
  }

  .tree-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .folder-prompt {
    padding: 12px 6px;
  }

  .btn-open-folder {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 8px 10px;
    background-color: var(--bg-hover);
    border: 1px dashed var(--border);
    border-radius: 0px;
    color: var(--text-muted);
    font-size: 11.5px;
    font-family: var(--font-mono);
    cursor: pointer;
    transition: background-color 0.1s ease, color 0.1s ease, border-color 0.1s ease;
  }

  .btn-open-folder:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .empty-state {
    font-size: 11px;
    color: var(--text-muted);
    font-style: italic;
    padding: 16px 10px;
    text-align: center;
  }

  /* Footer */
  .sidebar-footer {
    padding: 6px 8px;
    border-top: 1px solid var(--border);
    background-color: var(--bg-sidebar);
  }

  .footer-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 4px 6px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 0px;
    color: var(--text-muted);
    font-size: 11px;
    font-family: var(--font-mono);
    cursor: pointer;
    transition: background-color 0.1s ease, color 0.1s ease;
  }

  .footer-btn:hover {
    background-color: var(--bg-hover);
    border-color: var(--border);
    color: var(--text-bright);
  }

  .shortcut-tag {
    margin-left: auto;
    font-size: 10px;
    color: var(--text-muted);
    font-family: var(--font-mono);
  }

  /* Context Menu */
  .tui-context-menu {
    position: fixed;
    z-index: 2000;
    background-color: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0px;
    padding: 4px;
    min-width: 140px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    font-family: var(--font-mono);
  }

  .context-menu-header {
    padding: 3px 6px 4px 6px;
    font-size: 10.5px;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
    margin-bottom: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .context-menu-title {
    font-weight: 700;
    color: var(--text-bright);
  }

  .context-menu-item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 5px 8px;
    background: transparent;
    border: none;
    color: var(--text-main);
    font-size: 11px;
    font-family: var(--font-mono);
    text-align: left;
    cursor: pointer;
  }

  .context-menu-item:hover {
    background-color: var(--bg-hover);
    color: var(--accent);
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2100;
    backdrop-filter: blur(2px);
  }

  .modal-card {
    background-color: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0px;
    padding: 16px 20px;
    width: 360px;
    max-width: 90%;
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.6);
    font-family: var(--font-mono);
  }

  .modal-title {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-bright);
    margin-bottom: 12px;
  }

  .modal-input-row {
    margin-bottom: 14px;
  }

  .tui-modal-input {
    width: 100%;
    background-color: var(--bg-app);
    border: 1px solid var(--border);
    border-radius: 0px;
    color: var(--text-bright);
    padding: 6px 8px;
    font-size: 12px;
    font-family: var(--font-mono);
    outline: none;
  }

  .tui-modal-input:focus {
    border-color: var(--accent);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
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

  .btn-primary {
    background-color: var(--accent);
    color: #09090b;
    border-color: var(--accent);
  }

  .btn-primary:hover:not(:disabled) {
    background-color: var(--accent-hover);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-danger {
    background-color: #e06c75;
    color: #09090b;
    border-color: #e06c75;
  }

  .btn-danger:hover {
    background-color: #be5046;
    border-color: #be5046;
  }

  .danger-title {
    color: #e06c75 !important;
  }

  .modal-message {
    font-size: 11.5px;
    color: var(--text-main);
    line-height: 1.5;
    margin-bottom: 16px;
  }

  .file-highlight {
    color: var(--text-bright);
  }

  .warning-text {
    color: var(--text-muted);
    font-size: 10.5px;
    margin-top: 4px;
  }

  .context-menu-item.danger {
    color: #e06c75;
  }

  .context-menu-item.danger:hover {
    background-color: rgba(224, 108, 117, 0.15);
    color: #f38ba8;
  }

  .sidebar-header.drag-over {
    background-color: var(--bg-hover) !important;
    outline: 1px dashed var(--accent);
    outline-offset: -2px;
  }

  .tree-list.drag-over {
    outline: 1px dashed var(--accent);
    outline-offset: -2px;
    background-color: rgba(255, 255, 255, 0.02);
  }
</style>
