<script lang="ts">
  import type { RecentItem } from '../types';
  import { slide } from 'svelte/transition';
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
    FileUp,
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
    onReorderNotes,
    onDropExternalFiles,
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
    onRenameFile?: (oldPathOrId: string, newName: string) => void;
    onDeleteFile?: (filePathOrId: string) => void;
    onReorderNotes?: (items: RecentItem[]) => void;
    onDropExternalFiles?: (filePaths: string[]) => void;
  } = $props();

  let searchQuery = $state('');
  let contextMenu = $state<{ x: number; y: number; item: RecentItem } | null>(null);
  let showDeleteModal = $state<RecentItem | null>(null);
  let showRenameModal = $state<RecentItem | null>(null);
  let renameName = $state('');
  let renameInputEl = $state<HTMLInputElement | null>(null);

  // Drag-and-drop state
  let draggedIndex = $state<number | null>(null);
  let dragOverIndex = $state<number | null>(null);
  let dragPosition = $state<'before' | 'after' | null>(null);
  let isExternalDragOver = $state<boolean>(false);

  function handleItemContextMenu(e: MouseEvent, item: RecentItem) {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 160;
    const menuHeight = 120;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
    contextMenu = { x, y, item };
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
    if (!showRenameModal || !renameName.trim()) return;
    const targetKey = showRenameModal.path || showRenameModal.id;
    if (targetKey && onRenameFile) {
      onRenameFile(targetKey, renameName.trim());
    }
    showRenameModal = null;
  }

  function promptDelete(item: RecentItem) {
    contextMenu = null;
    showDeleteModal = item;
  }

  function confirmDelete() {
    if (!showDeleteModal) return;
    const targetKey = showDeleteModal.path || showDeleteModal.id;
    if (targetKey) {
      onDeleteFile?.(targetKey);
    }
    showDeleteModal = null;
  }

  function getDisplayPath(fullPath: string | null): string {
    if (!fullPath) return '';
    const parts = fullPath.replace(/[\\/]+$/, '').split(/[\\/]/);
    if (parts.length > 2) {
      return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
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

  // --- Drag and Drop Handlers ---
  function handleDragStart(e: DragEvent, index: number, item: RecentItem) {
    draggedIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.path || item.title);
      e.dataTransfer.setData('application/x-tex-item-index', String(index));
    }
  }

  function handleItemDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null) {
      return;
    }
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    const targetEl = (e.currentTarget as HTMLElement);
    const rect = targetEl.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    dragOverIndex = index;
    dragPosition = e.clientY < midY ? 'before' : 'after';
  }

  function handleItemDragLeave() {
    // Handled globally
  }

  function handleDragEnd() {
    draggedIndex = null;
    dragOverIndex = null;
    dragPosition = null;
    isExternalDragOver = false;
  }

  function handleItemDrop(e: DragEvent, targetIndex: number) {
    e.preventDefault();
    e.stopPropagation();

    if (draggedIndex !== null) {
      if (draggedIndex !== targetIndex) {
        const list = [...recentItems];
        const [moved] = list.splice(draggedIndex, 1);
        let insertIndex = targetIndex;
        if (dragPosition === 'after') {
          insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
        } else {
          insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
        }
        insertIndex = Math.max(0, Math.min(list.length, insertIndex));
        list.splice(insertIndex, 0, moved);
        onReorderNotes?.(list);
      }
      handleDragEnd();
      return;
    }

    handleExternalDrop(e);
    handleDragEnd();
  }

  function handleContainerDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      const isFile = Array.from(e.dataTransfer.types).includes('Files');
      if (isFile) {
        isExternalDragOver = true;
        e.dataTransfer.dropEffect = 'copy';
      }
    }
  }

  function handleContainerDragLeave(e: DragEvent) {
    const related = e.relatedTarget as HTMLElement;
    if (!related || !related.closest('.sidebar-content')) {
      isExternalDragOver = false;
    }
  }

  function handleExternalDrop(e: DragEvent) {
    e.preventDefault();
    isExternalDragOver = false;
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filePaths: string[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        const p = (file as any).path || file.name;
        if (p) filePaths.push(p);
      }
      if (filePaths.length > 0) {
        onDropExternalFiles?.(filePaths);
      }
    }
  }
</script>

<svelte:window
  onpointerdown={(e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.sidebar-context-menu')) {
      contextMenu = null;
    }
  }}
  oncontextmenu={(e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.recent-item')) {
      contextMenu = null;
    }
  }}
  onkeydown={(e) => {
    if (e.key === 'Escape') {
      contextMenu = null;
      showRenameModal = null;
      showDeleteModal = null;
    }
  }}
/>

{#if isOpen}
  <aside class="sidebar" transition:slide={{ axis: 'x', duration: 160 }}>
    <!-- Header -->
    <div class="sidebar-header">
      <div class="workspace-meta">
        <span class="sidebar-title">Notes</span>
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
            title="Open Folder (Ctrl+Shift+O)"
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
          placeholder="Search notes..."
          bind:value={searchQuery}
          class="search-input"
        />
        {#if searchQuery}
          <button
            class="clear-search"
            onclick={() => { searchQuery = ''; }}
            type="button"
            title="Clear search"
          >
            <X size={12} />
          </button>
        {/if}
      </div>
    </div>

    <!-- Scrollable Notes List with Drag & Drop -->
    <div
      class="sidebar-content"
      class:external-drag-target={isExternalDragOver}
      ondragover={handleContainerDragOver}
      ondragleave={handleContainerDragLeave}
      ondrop={handleExternalDrop}
      role="region"
      aria-label="Notes list"
    >
      {#if isExternalDragOver}
        <div class="external-drop-overlay">
          <FileUp size={22} class="drop-icon" />
          <span>Drop markdown files here to open</span>
        </div>
      {/if}

      {#if filteredItems.length === 0}
        <div class="empty-state">
          {#if searchQuery}
            No matching notes
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
        <div class="recent-list" role="list">
          {#each filteredItems as item, index (item.id || item.path || item.title)}
            {@const isSelected = item.id ? item.id === activeId : (item.path && item.path === activeId)}
            {@const isDraggingThis = draggedIndex === index}
            {@const isTargetThis = dragOverIndex === index}
            <div
              class="recent-item"
              class:active={isSelected}
              class:is-dragging={isDraggingThis}
              class:drop-line-before={isTargetThis && dragPosition === 'before'}
              class:drop-line-after={isTargetThis && dragPosition === 'after'}
              draggable="true"
              ondragstart={(e) => handleDragStart(e, index, item)}
              ondragover={(e) => handleItemDragOver(e, index)}
              ondragleave={handleItemDragLeave}
              ondragend={handleDragEnd}
              ondrop={(e) => handleItemDrop(e, index)}
              onclick={() => onSelectNote(item)}
              oncontextmenu={(e) => handleItemContextMenu(e, item)}
              role="listitem"
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

    <!-- Footer: Clean modern actions without brackets -->
    <div class="sidebar-footer">
      <button
        class="footer-btn"
        onclick={onFind}
        title="Find & Quick Switcher (Ctrl+P)"
        type="button"
      >
        <Search size={13} />
        <span class="btn-label">Find</span>
        <span class="shortcut-tag">Ctrl+P</span>
      </button>

      <button
        class="footer-btn"
        onclick={onExport}
        title="Export Document (Ctrl+Shift+E)"
        type="button"
      >
        <Download size={13} />
        <span class="btn-label">Export</span>
        <span class="shortcut-tag">Ctrl+Shift+E</span>
      </button>

      <button
        class="footer-btn"
        onclick={onOpenSettings}
        title="Preferences (Ctrl+,)"
        type="button"
      >
        <SettingsIcon size={13} />
        <span class="btn-label">Settings</span>
        <span class="shortcut-tag">Ctrl+,</span>
      </button>
    </div>
  </aside>
{/if}

<!-- Right-click Context Menu -->
{#if contextMenu}
  <div
    class="sidebar-context-menu"
    style="top: {contextMenu.y}px; left: {contextMenu.x}px;"
    onclick={(e) => e.stopPropagation()}
    role="menu"
    tabindex="-1"
  >
    <div class="context-menu-header">
      <span class="context-menu-title">{contextMenu.item.title}</span>
    </div>
    <button
      class="context-menu-item"
      onclick={() => promptRename(contextMenu!.item)}
      type="button"
      role="menuitem"
    >
      <Edit2 size={13} />
      <span>Rename</span>
    </button>
    <button
      class="context-menu-item danger"
      onclick={() => promptDelete(contextMenu!.item)}
      type="button"
      role="menuitem"
    >
      <Trash2 size={13} />
      <span>Delete</span>
    </button>
    {#if onCloseNote}
      <button
        class="context-menu-item"
        onclick={(e) => {
          const itm = contextMenu!.item;
          contextMenu = null;
          onCloseNote(itm, e);
        }}
        type="button"
        role="menuitem"
      >
        <X size={13} />
        <span>Close Note</span>
      </button>
    {/if}
  </div>
{/if}

<!-- Rename Modal -->
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
        <span>Rename Note</span>
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
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            disabled={!renameName.trim() || renameName.trim() === showRenameModal.title}
          >
            Rename
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
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
        <span>Delete Note</span>
      </div>
      <div class="modal-message">
        Are you sure you want to delete <strong class="file-highlight">"{showDeleteModal.title}"</strong>?
        {#if showDeleteModal.path}
          <div class="warning-text">This will permanently remove the file from disk.</div>
        {:else}
          <div class="warning-text">This will discard this unsaved note.</div>
        {/if}
      </div>
      <div class="modal-actions">
        <button
          type="button"
          class="btn btn-secondary"
          onclick={() => { showDeleteModal = null; }}
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-danger"
          onclick={confirmDelete}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .sidebar {
    width: 250px;
    height: 100%;
    background-color: var(--bg-sidebar);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    user-select: none;
    z-index: 10;
    font-family: var(--font-mono);
    flex-shrink: 0;
    overflow: hidden;
  }

  /* Header */
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    background-color: var(--bg-sidebar);
  }

  .workspace-meta {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .sidebar-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 3px;
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
    border-radius: 4px;
    color: var(--text-muted);
    cursor: pointer;
    transition: background-color 0.12s ease, color 0.12s ease;
  }

  .action-btn:hover {
    background-color: var(--bg-hover);
    color: var(--text-bright);
  }

  /* Search */
  .sidebar-search {
    padding: 8px 10px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    background-color: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px 8px;
    gap: 6px;
    transition: border-color 0.12s ease, box-shadow 0.12s ease;
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
    opacity: 0.8;
  }

  .clear-search {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
  }

  .clear-search:hover {
    color: var(--text-bright);
  }

  /* Content */
  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 8px 6px;
    position: relative;
  }

  .sidebar-content.external-drag-target {
    background-color: rgba(56, 189, 248, 0.04);
  }

  .external-drop-overlay {
    position: absolute;
    inset: 6px;
    border: 1.5px dashed var(--accent);
    border-radius: 6px;
    background-color: rgba(56, 189, 248, 0.08);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--accent);
    font-size: 11px;
    z-index: 50;
    pointer-events: none;
  }

  :global(.drop-icon) {
    color: var(--accent);
    animation: bounce 0.8s infinite alternate ease-in-out;
  }

  @keyframes bounce {
    from { transform: translateY(0); }
    to { transform: translateY(-4px); }
  }

  .empty-state {
    font-size: 11px;
    color: var(--text-muted);
    padding: 32px 12px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .empty-action {
    display: flex;
    justify-content: center;
  }

  .btn-create-note {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    background-color: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-main);
    font-size: 11px;
    font-family: var(--font-mono);
    cursor: pointer;
    transition: color 0.12s ease, border-color 0.12s ease, background-color 0.12s ease;
  }

  .btn-create-note:hover {
    color: var(--accent);
    border-color: var(--accent);
    background-color: var(--bg-active);
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
    padding: 7px 10px;
    border: 1px solid transparent;
    border-left: 2px solid transparent;
    border-radius: 4px;
    background-color: transparent;
    cursor: pointer;
    transition: background-color 0.12s ease, border-color 0.12s ease;
    outline: none;
    position: relative;
  }

  .recent-item:hover {
    background-color: var(--bg-hover);
  }

  .recent-item.active {
    background-color: var(--bg-active);
    border-left-color: var(--accent);
  }

  .recent-item.is-dragging {
    opacity: 0.35;
    background-color: var(--bg-hover);
  }

  .recent-item.drop-line-before::before {
    content: '';
    position: absolute;
    top: -2px;
    left: 4px;
    right: 4px;
    height: 2px;
    background-color: var(--accent);
    border-radius: 1px;
    z-index: 10;
  }

  .recent-item.drop-line-after::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 4px;
    right: 4px;
    height: 2px;
    background-color: var(--accent);
    border-radius: 1px;
    z-index: 10;
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
    gap: 7px;
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
    font-size: 8px;
    flex-shrink: 0;
  }

  .recent-item-path,
  .recent-item-preview {
    font-size: 10px;
    color: var(--text-muted);
    padding-left: 20px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.75;
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
    border-radius: 3px;
    transition: opacity 0.12s ease, color 0.12s ease, background-color 0.12s ease;
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
    padding: 8px 10px;
    border-top: 1px solid var(--border);
    background-color: var(--bg-sidebar);
  }

  .footer-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    padding: 5px 8px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--text-muted);
    font-size: 11px;
    font-family: var(--font-mono);
    cursor: pointer;
    transition: background-color 0.12s ease, color 0.12s ease;
  }

  .footer-btn:hover {
    background-color: var(--bg-hover);
    color: var(--text-bright);
  }

  .btn-label {
    font-weight: 500;
  }

  .shortcut-tag {
    margin-left: auto;
    font-size: 9.5px;
    color: var(--text-muted);
    opacity: 0.75;
  }

  /* Context Menu */
  .sidebar-context-menu {
    position: fixed;
    z-index: 2000;
    background-color: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px;
    min-width: 140px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.6);
    font-family: var(--font-mono);
    animation: contextMenuPop 0.12s cubic-bezier(0.16, 1, 0.3, 1);
    transform-origin: top left;
  }

  @keyframes contextMenuPop {
    from {
      opacity: 0;
      transform: scale(0.94);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .context-menu-header {
    padding: 4px 8px 5px 8px;
    font-size: 10px;
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
    gap: 7px;
    width: 100%;
    padding: 5px 8px;
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--text-main);
    background: transparent;
    border: none;
    border-radius: 3px;
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
    border-radius: 6px;
    padding: 18px 22px;
    width: 360px;
    max-width: 90%;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
    font-family: var(--font-mono);
  }

  .modal-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-bright);
    margin-bottom: 14px;
    display: flex;
    align-items: center;
  }

  .modal-title.danger-title {
    color: var(--danger);
  }

  .modal-input-row {
    margin-bottom: 16px;
  }

  .tui-modal-input {
    width: 100%;
    background-color: var(--bg-app);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-bright);
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 6px 10px;
    outline: none;
  }

  .tui-modal-input:focus {
    border-color: var(--border-focus);
  }

  .modal-message {
    font-size: 12px;
    color: var(--text-main);
    margin-bottom: 18px;
    line-height: 1.5;
  }

  .file-highlight {
    color: var(--text-bright);
  }

  .warning-text {
    margin-top: 5px;
    font-size: 11px;
    color: var(--danger);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .btn {
    padding: 5px 14px;
    border-radius: 4px;
    font-size: 11.5px;
    font-family: var(--font-mono);
    font-weight: 500;
    cursor: pointer;
    border: 1px solid var(--border);
    transition: background-color 0.12s ease, opacity 0.12s ease;
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

  @media (prefers-reduced-motion: reduce) {
    .sidebar-context-menu {
      animation: none !important;
    }
  }
</style>
