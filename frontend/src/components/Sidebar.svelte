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
</style>
