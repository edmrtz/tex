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
  } = $props();

  let searchQuery = $state('');

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

    <!-- Scrollable File Tree (No unnecessary headings or inbox) -->
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
        <div class="tree-list">
          {#each filteredTree as item (item.path)}
            <FileTreeNode
              {item}
              {activePath}
              {onSelectFile}
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

<style>
  .sidebar {
    width: 260px;
    min-width: 260px;
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
  }

  .sidebar-content::-webkit-scrollbar {
    width: 4px;
  }

  .sidebar-content::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  .tree-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .folder-prompt {
    padding: 16px 8px;
  }

  .btn-open-folder {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 10px 12px;
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
    padding: 16px 10px;
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
