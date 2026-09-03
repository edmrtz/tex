<script lang="ts">
  import type { NoteDocument, FileTreeItem } from '../types';
  import {
    Plus,
    FolderOpen,
    Folder,
    FileText,
    Search,
    X,
    PanelLeftClose,
    Inbox,
    RefreshCw,
  } from '@lucide/svelte';
  import FileTreeNode from './FileTreeNode.svelte';

  let {
    isOpen,
    notes,
    activeNoteId,
    currentFolder,
    folderTree,
    onSelectNote,
    onCloseNote,
    onNewNote,
    onOpenFile,
    onOpenFolder,
    onRefreshFolder,
    onToggleSidebar,
  }: {
    isOpen: boolean;
    notes: NoteDocument[];
    activeNoteId: string;
    currentFolder: string;
    folderTree: FileTreeItem[];
    onSelectNote: (id: string) => void;
    onCloseNote: (id: string, e: MouseEvent) => void;
    onNewNote: () => void;
    onOpenFile: () => void;
    onOpenFolder: () => void;
    onRefreshFolder: () => void;
    onToggleSidebar: () => void;
  } = $props();

  let searchQuery = $state('');

  function getFolderDisplayName(path: string): string {
    if (!path) return 'Workspace';
    const parts = path.replace(/[/\\]+$/, '').split(/[/\\]/);
    return parts[parts.length - 1] || 'Workspace';
  }

  function cleanExcerpt(content: string): string {
    if (!content) return 'Empty document';
    const clean = content
      .replace(/^#+\s+/gm, '') // Remove headers
      .replace(/[*_`~[\]$]/g, '') // Remove markdown marks
      .replace(/\s+/g, ' ') // Collapse spaces
      .trim();
    return clean.slice(0, 50) || 'Empty document';
  }

  const filteredNotes = $derived(
    notes.filter((note) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q)
      );
    })
  );

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
  const activeNote = $derived(notes.find((n) => n.id === activeNoteId) || null);
</script>

{#if isOpen}
  <aside class="sidebar">
    <!-- Header -->
    <div class="sidebar-header">
      <div class="workspace-meta">
        <span class="workspace-icon">
          <Folder size={16} />
        </span>
        <span class="workspace-name" title={currentFolder}>
          {getFolderDisplayName(currentFolder)}
        </span>
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
          title="Open Folder"
          onclick={onOpenFolder}
          type="button"
        >
          <FolderOpen size={16} />
        </button>
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
          placeholder="Search notes..."
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

    <!-- Scrollable Content -->
    <div class="sidebar-content">
      <!-- Section: Open Notes (Inbox) -->
      <div class="section-group">
        <div class="section-header">
          <div class="section-title">
            <Inbox size={13} />
            <span>INBOX</span>
          </div>
          <span class="count-badge">{filteredNotes.length}</span>
        </div>

        <div class="inbox-list">
          {#if filteredNotes.length === 0}
            <div class="empty-state">No matching notes</div>
          {:else}
            {#each filteredNotes as note (note.id)}
              <div
                class="inbox-item"
                class:active={note.id === activeNoteId}
                onclick={() => onSelectNote(note.id)}
                role="button"
                tabindex="0"
                onkeydown={(e) => { if (e.key === 'Enter') onSelectNote(note.id); }}
              >
                <div class="inbox-item-header">
                  <span class="inbox-title" title={note.path || note.title}>
                    {note.title || 'Untitled Note'}
                  </span>
                  {#if note.isDirty}
                    <span class="dirty-indicator" title="Unsaved changes">●</span>
                  {/if}
                  <button
                    class="close-note-btn"
                    title="Close Note (Ctrl+W)"
                    onclick={(e) => onCloseNote(note.id, e)}
                    type="button"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div class="inbox-excerpt">
                  {cleanExcerpt(note.content)}
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Section: Workspace Files -->
      <div class="section-group">
        <div class="section-header">
          <div class="section-title">
            <FileText size={13} />
            <span>WORKSPACE</span>
          </div>
          <div class="section-actions">
            {#if currentFolder}
              <button
                class="icon-action-small"
                title="Refresh Folder"
                onclick={onRefreshFolder}
                type="button"
              >
                <RefreshCw size={12} />
              </button>
            {/if}
          </div>
        </div>

        <div class="tree-list">
          {#if !currentFolder}
            <div class="folder-prompt">
              <button class="btn-open-folder" onclick={onOpenFolder} type="button">
                <FolderOpen size={14} />
                <span>Open Folder...</span>
              </button>
            </div>
          {:else if filteredTree.length === 0}
            <div class="empty-state">
              {searchQuery ? 'No matching files' : 'No markdown files found'}
            </div>
          {:else}
            {#each filteredTree as item (item.path)}
              <FileTreeNode
                {item}
                activePath={activeNote?.path || null}
                onSelectFile={onOpenFile}
              />
            {/each}
          {/if}
        </div>
      </div>
    </div>

    <!-- Footer Quick Actions -->
    <div class="sidebar-footer">
      <button class="footer-btn" onclick={onOpenFile} type="button">
        <FileText size={13} />
        <span>Open File...</span>
        <span class="shortcut-tag">Ctrl+O</span>
      </button>
    </div>
  </aside>
{/if}

<style>
  .sidebar {
    width: 270px;
    min-width: 270px;
    height: 100%;
    background-color: #141416;
    border-right: 1px solid rgba(255, 255, 255, 0.07);
    display: flex;
    flex-direction: column;
    user-select: none;
    z-index: 10;
  }

  /* Header */
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .workspace-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .workspace-icon {
    color: #38bdf8;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .workspace-name {
    font-size: 13px;
    font-weight: 600;
    color: #e4e4e7;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: -0.01em;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: #a1a1aa;
    cursor: pointer;
    transition: background-color 0.12s ease, color 0.12s ease;
  }

  .action-btn:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: #f4f4f5;
  }

  /* Search */
  .sidebar-search {
    padding: 8px 12px;
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    background-color: #1c1c20;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    padding: 5px 8px;
    gap: 6px;
    transition: border-color 0.15s ease;
  }

  .search-input-wrapper:focus-within {
    border-color: rgba(56, 189, 248, 0.4);
  }

  :global(.search-icon) {
    color: #71717a;
    flex-shrink: 0;
  }

  .search-input {
    background: transparent;
    border: none;
    outline: none;
    color: #e4e4e7;
    font-size: 12px;
    font-family: inherit;
    width: 100%;
  }

  .search-input::placeholder {
    color: #52525b;
  }

  .clear-search {
    background: transparent;
    border: none;
    color: #71717a;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .clear-search:hover {
    color: #e4e4e7;
  }

  /* Content */
  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px 8px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .sidebar-content::-webkit-scrollbar {
    width: 4px;
  }

  .sidebar-content::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  .section-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 6px 4px 8px;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    color: #71717a;
    letter-spacing: 0.06em;
  }

  .count-badge {
    font-size: 10px;
    font-weight: 600;
    color: #71717a;
    background-color: rgba(255, 255, 255, 0.05);
    padding: 1px 6px;
    border-radius: 10px;
  }

  .icon-action-small {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: #71717a;
    cursor: pointer;
    transition: color 0.12s ease;
  }

  .icon-action-small:hover {
    color: #e4e4e7;
  }

  /* Inbox list */
  .inbox-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .inbox-item {
    display: flex;
    flex-direction: column;
    padding: 8px 10px;
    border-radius: 8px;
    background-color: transparent;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background-color 0.12s ease, border-color 0.12s ease;
    position: relative;
  }

  .inbox-item:hover {
    background-color: rgba(255, 255, 255, 0.04);
  }

  .inbox-item.active {
    background-color: #1e1e24;
    border-color: rgba(56, 189, 248, 0.2);
  }

  .inbox-item.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 3px;
    background-color: #38bdf8;
    border-radius: 0 2px 2px 0;
  }

  .inbox-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .inbox-title {
    font-size: 13px;
    font-weight: 500;
    color: #d4d4d8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .inbox-item.active .inbox-title {
    color: #ffffff;
    font-weight: 600;
  }

  .dirty-indicator {
    color: #f59e0b;
    font-size: 10px;
    flex-shrink: 0;
  }

  .close-note-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: #71717a;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.12s ease, background-color 0.12s ease, color 0.12s ease;
    flex-shrink: 0;
  }

  .inbox-item:hover .close-note-btn,
  .inbox-item.active .close-note-btn {
    opacity: 1;
  }

  .close-note-btn:hover {
    background-color: rgba(239, 68, 68, 0.15);
    color: #f87171;
  }

  .inbox-excerpt {
    font-size: 11px;
    color: #71717a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 3px;
    line-height: 1.3;
  }

  .inbox-item.active .inbox-excerpt {
    color: #a1a1aa;
  }

  /* Tree List */
  .tree-list {
    display: flex;
    flex-direction: column;
  }

  .folder-prompt {
    padding: 10px 4px;
  }

  .btn-open-folder {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    background-color: rgba(255, 255, 255, 0.03);
    border: 1px dashed rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    color: #a1a1aa;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }

  .btn-open-folder:hover {
    background-color: rgba(56, 189, 248, 0.08);
    border-color: rgba(56, 189, 248, 0.3);
    color: #38bdf8;
  }

  .empty-state {
    font-size: 12px;
    color: #52525b;
    font-style: italic;
    padding: 8px 10px;
    text-align: center;
  }

  /* Footer */
  .sidebar-footer {
    padding: 8px 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .footer-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 10px;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: #a1a1aa;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: background-color 0.12s ease, color 0.12s ease;
  }

  .footer-btn:hover {
    background-color: rgba(255, 255, 255, 0.06);
    color: #e4e4e7;
  }

  .shortcut-tag {
    margin-left: auto;
    font-size: 10px;
    color: #52525b;
    font-family: monospace;
  }
</style>
