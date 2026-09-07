<script lang="ts">
  import type { RecentItem } from '../types';
  import {
    Plus,
    FolderOpen,
    FileText,
    Search,
    X,
    PanelLeftClose,
    Settings as SettingsIcon,
    Trash2,
    Edit2,
    Download,
  } from '@lucide/svelte';

  let {
    isOpen,
    activeId,
    recentItems,
    onSelectNote,
    onCloseNote,
    onNewNote,
    onOpenFile,
    onOpenFolder,
    onToggleSidebar,
    onFind,
    onExport,
    onOpenSettings,
    onRenameFile,
    onDeleteFile,
  }: {
    isOpen: boolean;
    activeId: string;
    recentItems: RecentItem[];
    onSelectNote: (item: RecentItem) => void;
    onCloseNote?: (item: RecentItem, e: MouseEvent) => void;
    onNewNote: () => void;
    onOpenFile: () => void;
    onOpenFolder?: () => void;
    onToggleSidebar: () => void;
    onFind: () => void;
    onExport: () => void;
    onOpenSettings: () => void;
    onRenameFile?: (oldPath: string, newName: string) => void;
    onDeleteFile?: (filePath: string) => void;
  } = $props();

  let searchQuery = $state('');
  let contextMenu = $state<{ x: number; y: number; item: RecentItem } | null>(null);
  let showDeleteModal = $state<RecentItem | null>(null);
  let showRenameModal = $state<RecentItem | null>(null);
  let renameName = $state('');
  let renameInputEl = $state<HTMLInputElement | null>(null);

  function handleItemContextMenu(e: MouseEvent, item: RecentItem) {
    if (!item.path) return;
    e.preventDefault();
    e.stopPropagation();
    contextMenu = {
      x: Math.min(e.clientX, window.innerWidth - 170),
      y: Math.min(e.clientY, window.innerHeight - 130),
      item,
    };
  }

  function promptRename(item: RecentItem) {
    contextMenu = null;
    renameName = item.title;
    showRenameModal = item;
    setTimeout(() => {
      renameInputEl?.focus();
      renameInputEl?.select();
    }, 50);
  }

  function submitRename(e?: Event) {
    if (e) e.preventDefault();
    if (!showRenameModal || !renameName.trim() || !showRenameModal.path) return;
    if (onRenameFile) {
      onRenameFile(showRenameModal.path, renameName.trim());
    }
    showRenameModal = null;
  }

  function promptDelete(item: RecentItem) {
    contextMenu = null;
    showDeleteModal = item;
  }

  function confirmDelete() {
    if (!showDeleteModal || !showDeleteModal.path) return;
    onDeleteFile?.(showDeleteModal.path);
    showDeleteModal = null;
  }

  function getDisplayPath(fullPath: string | null): string {
    if (!fullPath) return 'untitled';
    const parts = fullPath.replace(/[/\\]+$/, '').split(/[/\\]/);
    if (parts.length > 2) {
      return `.../${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
    }
    return fullPath;
  }

  function filterRecent(items: RecentItem[], query: string): RecentItem[] {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.path && item.path.toLowerCase().includes(q))
    );
  }

  const filteredItems = $derived(filterRecent(recentItems, searchQuery));
</script>

<svelte:window
  onclick={() => { contextMenu = null; }}
  onkeydown={(e) => {
    if (e.key === 'Escape') {
      contextMenu = null;
      showRenameModal = null;
      showDeleteModal = null;
    }
  }}
/>

{#if isOpen}
  <aside class="sidebar">
    <!-- Header -->
    <div class="sidebar-header">
      <div class="workspace-meta">
        <span class="tui-bracket">[</span>
        <span class="sidebar-title">recent</span>
        <span class="tui-bracket">]</span>
      </div>

      <div class="header-actions">
        <button
          class="action-btn"
          title="New Note (Ctrl+N)"
          onclick={onNewNote}
          type="button"
        >
          <Plus size={15} />
        </button>
        <button
          class="action-btn"
          title="Open File (Ctrl+O)"
          onclick={onOpenFile}
          type="button"
        >
          <FileText size={14} />
        </button>
        {#if onOpenFolder}
          <button
            class="action-btn"
            title="Open Folder"
            onclick={onOpenFolder}
            type="button"
          >
            <FolderOpen size={14} />
          </button>
        {/if}
        <button
          class="action-btn"
          title="Collapse Sidebar (Ctrl+B)"
          onclick={onToggleSidebar}
          type="button"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>
    </div>

    <!-- Search Input -->
    <div class="sidebar-search">
      <div class="search-input-wrapper">
        <Search size={13} class="search-icon" />
        <input
          type="text"
          placeholder="Search recent..."
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

    <!-- Scrollable Recent Items List -->
    <div class="sidebar-content">
      {#if filteredItems.length === 0}
        <div class="empty-state">
          {#if searchQuery}
            No matching recent notes
          {:else}
            No recent notes
            <div class="empty-action">
              <button class="btn-create-note" onclick={onNewNote} type="button">
                <Plus size={13} />
                <span>Create note</span>
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <div class="recent-list">
          {#each filteredItems as item (item.id || item.path || item.title)}
            {@const isSelected = item.id ? item.id === activeId : (item.path && item.path === activeId)}
            <div
              class="recent-item"
              class:active={isSelected}
              onclick={() => onSelectNote(item)}
              oncontextmenu={(e) => handleItemContextMenu(e, item)}
              role="button"
              tabindex="0"
              onkeydown={(e) => { if (e.key === 'Enter') onSelectNote(item); }}
            >
              <div class="recent-item-main">
                <div class="recent-item-header">
                  <FileText size={13} class="recent-file-icon" />
                  <span class="recent-item-title" title={item.path || item.title}>
                    {item.title}
                  </span>
                  {#if item.isDirty}
                    <span class="dirty-indicator" title="Unsaved changes">●</span>
                  {/if}
                </div>
                {#if item.path}
                  <div class="recent-item-path" title={item.path}>
                    {getDisplayPath(item.path)}
                  </div>
                {:else if item.preview}
                  <div class="recent-item-preview">
                    {item.preview}
                  </div>
                {/if}
              </div>

              {#if onCloseNote}
                <button
                  class="recent-item-close"
                  title="Close note"
                  onclick={(e) => onCloseNote(item, e)}
                  type="button"
                >
                  <X size={12} />
                </button>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Footer with features: settings, export, find -->
    <div class="sidebar-footer">
      <button
        class="footer-btn"
        onclick={onFind}
        title="Find & Quick Switcher (Ctrl+P)"
        type="button"
      >
        <Search size={13} />
        <span>[find]</span>
        <span class="shortcut-tag">Ctrl+P</span>
      </button>

      <button
        class="footer-btn"
        onclick={onExport}
        title="Export Document (Ctrl+Shift+E)"
        type="button"
      >
        <Download size={13} />
        <span>[export]</span>
        <span class="shortcut-tag">Ctrl+Shift+E</span>
      </button>

      <button
        class="footer-btn"
        onclick={onOpenSettings}
        title="Preferences (Ctrl+,)"
        type="button"
      >
        <SettingsIcon size={13} />
        <span>[settings]</span>
        <span class="shortcut-tag">Ctrl+,</span>
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
      <span class="context-menu-title">{contextMenu.item.title}</span>
      <span class="tui-bracket">]</span>
    </div>
    {#if contextMenu.item.path}
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
    {#if onCloseNote}
      <button
        class="context-menu-item"
        onclick={(e) => {
          const itm = contextMenu!.item;
          contextMenu = null;
          onCloseNote(itm, e);
        }}
        type="button"
      >
        <X size={13} />
        <span>[× close note]</span>
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
        <span>rename file</span>
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
            disabled={!renameName.trim() || renameName.trim() === showRenameModal.title}
          >
            rename
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
        <span>delete file</span>
        <span class="tui-bracket">]</span>
      </div>
      <div class="modal-message">
        Are you sure you want to delete <strong class="file-highlight">"{showDeleteModal.title}"</strong>?
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

  .sidebar-title {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: 0.04em;
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
    padding: 6px;
  }

  .empty-state {
    font-size: 11px;
    color: var(--text-muted);
    font-style: italic;
    padding: 24px 10px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .empty-action {
    display: flex;
    justify-content: center;
  }

  .btn-create-note {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    background-color: var(--bg-hover);
    border: 1px dashed var(--border);
    border-radius: 0px;
    color: var(--text-muted);
    font-size: 11px;
    font-family: var(--font-mono);
    cursor: pointer;
    transition: color 0.1s ease, border-color 0.1s ease;
  }

  .btn-create-note:hover {
    color: var(--accent);
    border-color: var(--accent);
  }

  .recent-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .recent-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    border: 1px solid transparent;
    border-radius: 0px;
    background-color: transparent;
    cursor: pointer;
    transition: background-color 0.1s ease, border-color 0.1s ease;
    outline: none;
    position: relative;
  }

  .recent-item:hover {
    background-color: var(--bg-hover);
    border-color: var(--border-subtle);
  }

  .recent-item.active {
    background-color: var(--bg-active);
    border-color: var(--border-focus);
  }

  .recent-item-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .recent-item-header {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  :global(.recent-file-icon) {
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .recent-item.active :global(.recent-file-icon) {
    color: var(--accent);
  }

  .recent-item-title {
    font-size: 11.5px;
    font-weight: 500;
    color: var(--text-main);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .recent-item.active .recent-item-title {
    color: var(--text-bright);
    font-weight: 600;
  }

  .dirty-indicator {
    color: var(--dirty);
    font-size: 9px;
    flex-shrink: 0;
  }

  .recent-item-path,
  .recent-item-preview {
    font-size: 10px;
    color: var(--text-muted);
    padding-left: 19px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.8;
  }

  .recent-item-close {
    opacity: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0;
    margin-left: 4px;
    border-radius: 0px;
    transition: opacity 0.1s ease, color 0.1s ease, background-color 0.1s ease;
  }

  .recent-item:hover .recent-item-close {
    opacity: 1;
  }

  .recent-item-close:hover {
    color: var(--danger);
    background-color: rgba(248, 113, 113, 0.15);
  }

  /* Footer */
  .sidebar-footer {
    display: flex;
    flex-direction: column;
    gap: 2px;
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
    transition: background-color 0.1s ease, color 0.1s ease, border-color 0.1s ease;
  }

  .footer-btn:hover {
    background-color: var(--bg-hover);
    border-color: var(--border);
    color: var(--text-bright);
  }

  .shortcut-tag {
    margin-left: auto;
    font-size: 9.5px;
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
    color: var(--text-bright);
    font-weight: 600;
  }

  .context-menu-item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 4px 8px;
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--text-main);
    background: transparent;
    border: none;
    border-radius: 0px;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.1s ease;
  }

  .context-menu-item:hover {
    background-color: var(--bg-hover);
    color: var(--text-bright);
  }

  .context-menu-item.danger {
    color: var(--danger);
  }

  .context-menu-item.danger:hover {
    background-color: rgba(248, 113, 113, 0.15);
    color: var(--danger);
  }

  /* Modals */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2500;
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
    font-size: 12px;
    font-weight: 700;
    color: var(--text-bright);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    text-transform: uppercase;
  }

  .modal-title.danger-title {
    color: var(--danger);
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
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 6px 8px;
    outline: none;
  }

  .tui-modal-input:focus {
    border-color: var(--border-focus);
  }

  .modal-message {
    font-size: 11.5px;
    color: var(--text-main);
    margin-bottom: 16px;
    line-height: 1.4;
  }

  .file-highlight {
    color: var(--text-bright);
  }

  .warning-text {
    margin-top: 4px;
    font-size: 10.5px;
    color: var(--danger);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }

  .btn {
    padding: 4px 12px;
    border-radius: 0px;
    font-size: 11px;
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

  .btn-primary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
