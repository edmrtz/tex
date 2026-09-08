<script lang="ts">
  import type { RecentItem, SidebarFolder, FileTreeItem } from '../types';
  import { slide } from 'svelte/transition';
  import {
    Plus,
    FolderOpen,
    Folder,
    FolderPlus,
    FolderX,
    FileText,
    Search,
    X,
    PanelLeftClose,
    Settings as SettingsIcon,
    Trash2,
    Edit2,
    Download,
    FileUp,
    ChevronRight,
    ChevronDown,
    RotateCw,
    Tag,
    Hash,
  } from '@lucide/svelte';
  import {
    filterNotes,
    getAllTagsWithCounts,
    normalizeTag,
    isValidTag,
  } from '../utils/tags';

  let {
    isOpen,
    activeId,
    recentItems = [],
    folders = [],
    activeTagFilter = $bindable(null),
    onSelectNote,
    onCloseNote,
    onNewNote,
    onOpenFile,
    onOpenFolder,
    onAddFolder,
    onRemoveFolder,
    onRefreshFolder,
    onCreateFileInFolder,
    onCreateSubfolder,
    onSelectTagFilter,
    onAddTagToNote,
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
    folders?: SidebarFolder[];
    activeTagFilter?: string | null;
    onSelectNote: (item: RecentItem) => void;
    onCloseNote?: (item: RecentItem, e: MouseEvent) => void;
    onNewNote: (folderPath?: string) => void;
    onOpenFile: () => void;
    onOpenFolder?: () => void;
    onAddFolder?: (folderPath?: string) => void;
    onRemoveFolder?: (folderPath: string) => void;
    onRefreshFolder?: (folderPath?: string) => void;
    onCreateFileInFolder?: (folderPath: string, fileName: string) => void;
    onCreateSubfolder?: (parentPath: string, folderName: string) => void;
    onSelectTagFilter?: (tag: string | null) => void;
    onAddTagToNote?: (item: RecentItem, tag: string) => void;
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
  let isTagSearchMode = $state<boolean>(false);
  let foldersSectionOpen = $state<boolean>(true);
  let recentSectionOpen = $state<boolean>(true);

  // Folder expansion tracking with localStorage persistence
  function loadExpandedFolders(): Set<string> {
    try {
      const raw = localStorage.getItem('tex:expanded_folders');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {}
    return new Set();
  }

  let expandedFolders = $state<Set<string>>(loadExpandedFolders());

  function toggleFolderExpanded(folderPath: string) {
    const next = new Set(expandedFolders);
    if (next.has(folderPath)) {
      next.delete(folderPath);
    } else {
      next.add(folderPath);
    }
    expandedFolders = next;
    try {
      localStorage.setItem('tex:expanded_folders', JSON.stringify(Array.from(next)));
    } catch {}
  }

  function isFolderExpanded(folderPath: string, isRoot = false): boolean {
    if (searchQuery.trim()) return true; // auto-expand matching items when searching
    if (expandedFolders.size === 0 && isRoot) return true; // expand root folders by default on initial load
    return expandedFolders.has(folderPath);
  }

  // Context Menu State
  type ContextMenuTarget =
    | { type: 'recent'; item: RecentItem }
    | { type: 'file'; path: string; name: string }
    | { type: 'folder'; path: string; name: string; isRoot: boolean };

  let contextMenu = $state<{ x: number; y: number; target: ContextMenuTarget } | null>(null);

  // Modal states
  let showDeleteModal = $state<{ pathOrId: string; title: string; isDiskFile: boolean } | null>(null);
  let showRenameModal = $state<{ pathOrId: string; title: string } | null>(null);
  let renameName = $state('');
  let renameInputEl = $state<HTMLInputElement | null>(null);

  let showNewNoteModal = $state<{ folderPath: string; folderName: string } | null>(null);
  let newNoteName = $state('');
  let newNoteInputEl = $state<HTMLInputElement | null>(null);

  let showNewSubfolderModal = $state<{ parentPath: string; parentName: string } | null>(null);
  let newSubfolderName = $state('');
  let newSubfolderInputEl = $state<HTMLInputElement | null>(null);

  let showAddTagModal = $state<RecentItem | null>(null);
  let newTagInput = $state('');
  let addTagInputEl = $state<HTMLInputElement | null>(null);

  // Drag-and-drop state
  let draggedIndex = $state<number | null>(null);
  let dragOverIndex = $state<number | null>(null);
  let dragPosition = $state<'before' | 'after' | null>(null);
  let isExternalDragOver = $state<boolean>(false);

  function handleRecentContextMenu(e: MouseEvent, item: RecentItem) {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 160;
    const menuHeight = 160;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
    contextMenu = { x, y, target: { type: 'recent', item } };
  }

  function handleFolderContextMenu(e: MouseEvent, path: string, name: string, isRoot: boolean) {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 180;
    const menuHeight = 160;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
    contextMenu = { x, y, target: { type: 'folder', path, name, isRoot } };
  }

  function handleFileContextMenu(e: MouseEvent, path: string, name: string) {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 160;
    const menuHeight = 120;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
    contextMenu = { x, y, target: { type: 'file', path, name } };
  }

  function promptNewNote(folderPath: string, folderName: string) {
    contextMenu = null;
    showNewNoteModal = { folderPath, folderName };
    newNoteName = '';
    setTimeout(() => {
      newNoteInputEl?.focus();
    }, 50);
  }

  function submitNewNote(e?: Event) {
    if (e) e.preventDefault();
    if (!showNewNoteModal || !newNoteName.trim()) return;
    let fileName = newNoteName.trim();
    if (!fileName.toLowerCase().endsWith('.md') && !fileName.toLowerCase().endsWith('.markdown')) {
      fileName += '.md';
    }
    if (onCreateFileInFolder) {
      onCreateFileInFolder(showNewNoteModal.folderPath, fileName);
    } else {
      onNewNote(showNewNoteModal.folderPath);
    }
    showNewNoteModal = null;
  }

  function promptNewSubfolder(parentPath: string, parentName: string) {
    contextMenu = null;
    showNewSubfolderModal = { parentPath, parentName };
    newSubfolderName = '';
    setTimeout(() => {
      newSubfolderInputEl?.focus();
    }, 50);
  }

  function submitNewSubfolder(e?: Event) {
    if (e) e.preventDefault();
    if (!showNewSubfolderModal || !newSubfolderName.trim()) return;
    onCreateSubfolder?.(showNewSubfolderModal.parentPath, newSubfolderName.trim());
    showNewSubfolderModal = null;
  }

  function promptAddTag(item: RecentItem) {
    contextMenu = null;
    showAddTagModal = item;
    newTagInput = '';
    setTimeout(() => {
      addTagInputEl?.focus();
    }, 50);
  }

  function submitAddTag(e?: Event) {
    if (e) e.preventDefault();
    if (!showAddTagModal || !newTagInput.trim()) return;
    if (!isValidTag(newTagInput)) return;
    onAddTagToNote?.(showAddTagModal, newTagInput.trim());
    showAddTagModal = null;
    newTagInput = '';
  }

  function promptRename(item: RecentItem) {
    contextMenu = null;
    const key = item.path || item.id || '';
    renameName = item.title;
    showRenameModal = { pathOrId: key, title: item.title };
    setTimeout(() => {
      renameInputEl?.focus();
      renameInputEl?.select();
    }, 50);
  }

  function promptRenameItem(path: string, name: string) {
    contextMenu = null;
    renameName = name.replace(/\.(md|markdown|txt)$/i, '');
    showRenameModal = { pathOrId: path, title: name };
    setTimeout(() => {
      renameInputEl?.focus();
      renameInputEl?.select();
    }, 50);
  }

  function submitRename(e?: Event) {
    if (e) e.preventDefault();
    if (!showRenameModal || !renameName.trim()) return;
    onRenameFile?.(showRenameModal.pathOrId, renameName.trim());
    showRenameModal = null;
  }

  function promptDelete(item: RecentItem) {
    contextMenu = null;
    const key = item.path || item.id || '';
    showDeleteModal = { pathOrId: key, title: item.title, isDiskFile: !!item.path };
  }

  function promptDeleteItem(path: string, name: string) {
    contextMenu = null;
    showDeleteModal = { pathOrId: path, title: name, isDiskFile: true };
  }

  function confirmDelete() {
    if (!showDeleteModal) return;
    onDeleteFile?.(showDeleteModal.pathOrId);
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

  function filterTreeItems(items: FileTreeItem[], query: string): FileTreeItem[] {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    const result: FileTreeItem[] = [];
    for (const item of items) {
      if (item.isDir) {
        const filteredChildren = filterTreeItems(item.children || [], query);
        if (filteredChildren.length > 0 || item.name.toLowerCase().includes(q)) {
          result.push({
            ...item,
            children: filteredChildren,
          });
        }
      } else {
        if (item.name.toLowerCase().includes(q) || item.path.toLowerCase().includes(q)) {
          result.push(item);
        }
      }
    }
    return result;
  }

  const availableTags = $derived(getAllTagsWithCounts(recentItems));
  const filteredRecentItems = $derived(filterNotes(recentItems, searchQuery, activeTagFilter, isTagSearchMode));

  // --- Drag and Drop Handlers for Recent Items ---
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
    if (draggedIndex === null) return;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    const targetEl = e.currentTarget as HTMLElement;
    const rect = targetEl.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    dragOverIndex = index;
    dragPosition = e.clientY < midY ? 'before' : 'after';
  }

  function handleItemDragLeave() {}

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
    if (!target.closest('.recent-item') && !target.closest('.tree-item')) {
      contextMenu = null;
    }
  }}
  onkeydown={(e) => {
    if (e.key === 'Escape') {
      contextMenu = null;
      showRenameModal = null;
      showDeleteModal = null;
      showNewNoteModal = null;
      showNewSubfolderModal = null;
      showAddTagModal = null;
    }
  }}
/>

{#snippet treeNode(item: FileTreeItem, depth: number, rootPath: string)}
  {#if item.isDir}
    {@const expanded = isFolderExpanded(item.path, false)}
    <div
      class="tree-item tree-dir"
      style="padding-left: {10 + depth * 14}px"
      onclick={() => toggleFolderExpanded(item.path)}
      oncontextmenu={(e) => handleFolderContextMenu(e, item.path, item.name, false)}
      role="treeitem"
      aria-selected={false}
      tabindex="0"
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleFolderExpanded(item.path);
        }
      }}
    >
      <span class="tree-chevron">
        {#if expanded}
          <ChevronDown size={12} />
        {:else}
          <ChevronRight size={12} />
        {/if}
      </span>
      {#if expanded}
        <FolderOpen size={13} class="tree-icon folder-icon" />
      {:else}
        <Folder size={13} class="tree-icon folder-icon" />
      {/if}
      <span class="tree-label" title={item.path}>{item.name}</span>
      <div class="tree-actions" role="group">
        <button
          class="tree-action-btn"
          title="New note in {item.name}"
          onclick={(e) => {
            e.stopPropagation();
            promptNewNote(item.path, item.name);
          }}
          type="button"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
    {#if expanded && item.children && item.children.length > 0}
      {#each item.children as child (child.path)}
        {@render treeNode(child, depth + 1, rootPath)}
      {/each}
    {:else if expanded}
      <div class="tree-empty" style="padding-left: {24 + depth * 14}px">
        <span>(empty)</span>
      </div>
    {/if}
  {:else}
    {@const isSelected = item.path === activeId}
    <div
      class="tree-item tree-file"
      class:active={isSelected}
      style="padding-left: {22 + depth * 14}px"
      onclick={() => onSelectNote({ path: item.path, title: item.name, lastOpened: Date.now() })}
      oncontextmenu={(e) => handleFileContextMenu(e, item.path, item.name)}
      role="treeitem"
      aria-selected={isSelected}
      tabindex="0"
      onkeydown={(e) => {
        if (e.key === 'Enter') {
          onSelectNote({ path: item.path, title: item.name, lastOpened: Date.now() });
        }
      }}
    >
      <FileText size={12} class="tree-icon file-icon" />
      <span class="tree-label" title={item.path}>{item.name}</span>
    </div>
  {/if}
{/snippet}

{#if isOpen}
  <aside class="sidebar" transition:slide={{ axis: 'x', duration: 160 }}>
    <!-- Header -->
    <div class="sidebar-header">
      <div class="workspace-meta">
        <span class="sidebar-title">Explorer</span>
      </div>

      <div class="header-actions">
        <button
          class="action-btn"
          title="New Note (Ctrl+N)"
          onclick={() => onNewNote()}
          type="button"
        >
          <Plus size={15} />
        </button>
        <button
          class="action-btn"
          title="Add Folder to Sidebar"
          onclick={() => onAddFolder ? onAddFolder() : onOpenFolder?.()}
          type="button"
        >
          <FolderPlus size={14} />
        </button>
        <button
          class="action-btn"
          title="Open File (Ctrl+O)"
          onclick={onOpenFile}
          type="button"
        >
          <FileText size={14} />
        </button>
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
          placeholder={isTagSearchMode ? 'Filter by tag (#...)' : 'Search notes & folders...'}
          bind:value={searchQuery}
          class="search-input"
        />
        {#if searchQuery || activeTagFilter}
          <button
            class="clear-search"
            onclick={() => {
              searchQuery = '';
              activeTagFilter = null;
              isTagSearchMode = false;
              onSelectTagFilter?.(null);
            }}
            type="button"
            title="Clear search"
          >
            <X size={12} />
          </button>
        {/if}
        <button
          class="tag-search-toggle"
          class:active={isTagSearchMode}
          onclick={() => {
            isTagSearchMode = !isTagSearchMode;
          }}
          type="button"
          title="Toggle tag search mode (or type #tag or tag:name)"
        >
          <Tag size={13} />
        </button>
      </div>
    </div>

    <!-- Available Tags Pill Tray -->
    {#if availableTags.length > 0}
      <div class="tags-tray" role="toolbar" aria-label="Tags filter">
        {#if activeTagFilter}
          <button
            class="tag-pill active tag-clear-pill"
            onclick={() => {
              activeTagFilter = null;
              onSelectTagFilter?.(null);
            }}
            type="button"
            title="Clear tag filter"
          >
            <span>#{activeTagFilter}</span>
            <X size={11} />
          </button>
        {/if}
        {#each availableTags as tag (tag.tag)}
          <button
            class="tag-pill"
            class:active={activeTagFilter === tag.tag}
            onclick={() => {
              if (activeTagFilter === tag.tag) {
                activeTagFilter = null;
              } else {
                activeTagFilter = tag.tag;
              }
              onSelectTagFilter?.(activeTagFilter);
            }}
            type="button"
            title="Filter notes by #{tag.tag}"
          >
            #{tag.tag} <span class="tag-count">{tag.count}</span>
          </button>
        {/each}
      </div>
    {/if}

    <!-- Scrollable Workspace & Notes List -->
    <div
      class="sidebar-content"
      class:external-drag-target={isExternalDragOver}
      ondragover={handleContainerDragOver}
      ondragleave={handleContainerDragLeave}
      ondrop={handleExternalDrop}
      role="region"
      aria-label="Workspace sidebar"
    >
      {#if isExternalDragOver}
        <div class="external-drop-overlay">
          <FileUp size={22} class="drop-icon" />
          <span>Drop folder or files here to add</span>
        </div>
      {/if}

      <!-- Section: Folders -->
      <div class="sidebar-section">
        <div
          class="section-header"
          onclick={() => { foldersSectionOpen = !foldersSectionOpen; }}
          role="button"
          tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') foldersSectionOpen = !foldersSectionOpen; }}
        >
          <div class="section-header-left">
            <span class="section-chevron">
              {#if foldersSectionOpen}
                <ChevronDown size={12} />
              {:else}
                <ChevronRight size={12} />
              {/if}
            </span>
            <span class="section-title">Folders</span>
            {#if folders.length > 0}
              <span class="section-count">{folders.length}</span>
            {/if}
          </div>
          <div class="section-header-actions" role="group">
            <button
              class="section-action-btn"
              title="Add Folder to Sidebar"
              onclick={(e) => {
                e.stopPropagation();
                if (onAddFolder) onAddFolder();
                else onOpenFolder?.();
              }}
              type="button"
            >
              <FolderPlus size={13} />
            </button>
          </div>
        </div>

        {#if foldersSectionOpen}
          <div class="section-body">
            {#if folders.length === 0}
              <div class="folders-empty-card">
                <FolderPlus size={18} class="empty-folder-icon" />
                <span class="empty-folder-text">No folders added</span>
                <span class="empty-folder-hint">Add folders (e.g. subject or class notes) to organize files</span>
                <button
                  class="btn-add-folder"
                  onclick={() => onAddFolder ? onAddFolder() : onOpenFolder?.()}
                  type="button"
                >
                  <Plus size={12} />
                  <span>Add Folder</span>
                </button>
              </div>
            {:else}
              <div class="folders-tree-list" role="tree">
                {#each folders as folder (folder.path)}
                  {@const expanded = isFolderExpanded(folder.path, true)}
                  {@const displayTree = searchQuery ? filterTreeItems(folder.tree, searchQuery) : folder.tree}
                  <div class="folder-root-block">
                    <div
                      class="tree-item folder-root-item"
                      onclick={() => toggleFolderExpanded(folder.path)}
                      oncontextmenu={(e) => handleFolderContextMenu(e, folder.path, folder.name, true)}
                      role="treeitem"
                      aria-selected={false}
                      tabindex="0"
                      onkeydown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleFolderExpanded(folder.path);
                        }
                      }}
                    >
                      <span class="tree-chevron">
                        {#if expanded}
                          <ChevronDown size={12} />
                        {:else}
                          <ChevronRight size={12} />
                        {/if}
                      </span>
                      {#if expanded}
                        <FolderOpen size={14} class="tree-icon folder-icon root-folder-icon" />
                      {:else}
                        <Folder size={14} class="tree-icon folder-icon root-folder-icon" />
                      {/if}
                      <span class="tree-label root-folder-label" title={folder.path}>{folder.name}</span>
                      <div class="tree-actions" role="group">
                        <button
                          class="tree-action-btn"
                          title="New note in {folder.name}"
                          onclick={(e) => {
                            e.stopPropagation();
                            promptNewNote(folder.path, folder.name);
                          }}
                          type="button"
                        >
                          <Plus size={12} />
                        </button>
                        {#if onRemoveFolder}
                          <button
                            class="tree-action-btn"
                            title="Remove folder from sidebar"
                            onclick={(e) => {
                              e.stopPropagation();
                              onRemoveFolder(folder.path);
                            }}
                            type="button"
                          >
                            <X size={12} />
                          </button>
                        {/if}
                      </div>
                    </div>

                    {#if expanded}
                      {#if displayTree.length === 0}
                        <div class="tree-empty" style="padding-left: 24px">
                          <span>(empty folder)</span>
                          <button
                            class="empty-add-note-btn"
                            type="button"
                            onclick={() => promptNewNote(folder.path, folder.name)}
                          >
                            + Add note
                          </button>
                        </div>
                      {:else}
                        {#each displayTree as item (item.path)}
                          {@render treeNode(item, 1, folder.path)}
                        {/each}
                      {/if}
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Section: Recent Notes -->
      <div class="sidebar-section">
        <div
          class="section-header"
          onclick={() => { recentSectionOpen = !recentSectionOpen; }}
          role="button"
          tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') recentSectionOpen = !recentSectionOpen; }}
        >
          <div class="section-header-left">
            <span class="section-chevron">
              {#if recentSectionOpen}
                <ChevronDown size={12} />
              {:else}
                <ChevronRight size={12} />
              {/if}
            </span>
            <span class="section-title">Recent</span>
            {#if recentItems.length > 0}
              <span class="section-count">{filteredRecentItems.length}</span>
            {/if}
          </div>
          <div class="section-header-actions" role="group">
            <button
              class="section-action-btn"
              title="New Note (Ctrl+N)"
              onclick={(e) => {
                e.stopPropagation();
                onNewNote();
              }}
              type="button"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {#if recentSectionOpen}
          <div class="section-body">
            {#if filteredRecentItems.length === 0}
              <div class="empty-state">
                {#if activeTagFilter}
                  <span>No notes with tag #{activeTagFilter}</span>
                  <div class="empty-action">
                    <button
                      class="btn-clear-tag-filter"
                      onclick={() => {
                        activeTagFilter = null;
                        onSelectTagFilter?.(null);
                      }}
                      type="button"
                    >
                      <X size={12} />
                      <span>Clear tag filter</span>
                    </button>
                  </div>
                {:else if searchQuery}
                  No matching notes
                {:else}
                  No recent notes
                  <div class="empty-action">
                    <button class="btn-create-note" onclick={() => onNewNote()} type="button">
                      <Plus size={13} />
                      <span>Create note</span>
                    </button>
                  </div>
                {/if}
              </div>
            {:else}
              <div class="recent-list" role="list">
                {#each filteredRecentItems as item, index (item.id || item.path || item.title)}
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
                    oncontextmenu={(e) => handleRecentContextMenu(e, item)}
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
                      {#if item.tags && item.tags.length > 0}
                        <div class="recent-item-tags">
                          {#each item.tags.slice(0, 3) as tag (tag)}
                            <span
                              class="item-tag"
                              role="button"
                              tabindex="0"
                              onclick={(e) => {
                                e.stopPropagation();
                                activeTagFilter = tag;
                                onSelectTagFilter?.(tag);
                              }}
                              onkeydown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.stopPropagation();
                                  activeTagFilter = tag;
                                  onSelectTagFilter?.(tag);
                                }
                              }}
                            >#{tag}</span>
                          {/each}
                          {#if item.tags.length > 3}
                            <span class="item-tag-more">+{item.tags.length - 3}</span>
                          {/if}
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
        {/if}
      </div>
    </div>

    <!-- Footer -->
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

<!-- Context Menu -->
{#if contextMenu}
  <div
    class="sidebar-context-menu"
    style="top: {contextMenu.y}px; left: {contextMenu.x}px;"
    role="menu"
  >
    {#if contextMenu.target.type === 'folder'}
      <div class="context-menu-header">
        <span class="context-menu-title">{contextMenu.target.name}</span>
      </div>
      <button
        class="context-menu-item"
        onclick={() => {
          const t = contextMenu!.target;
          if (t.type === 'folder') promptNewNote(t.path, t.name);
        }}
        type="button"
        role="menuitem"
      >
        <Plus size={13} />
        <span>New Note...</span>
      </button>
      <button
        class="context-menu-item"
        onclick={() => {
          const t = contextMenu!.target;
          if (t.type === 'folder') promptNewSubfolder(t.path, t.name);
        }}
        type="button"
        role="menuitem"
      >
        <FolderPlus size={13} />
        <span>New Subfolder...</span>
      </button>
      <button
        class="context-menu-item"
        onclick={() => {
          const t = contextMenu!.target;
          if (t.type === 'folder') onRefreshFolder?.(t.path);
          contextMenu = null;
        }}
        type="button"
        role="menuitem"
      >
        <RotateCw size={13} />
        <span>Refresh Folder</span>
      </button>
      {#if contextMenu.target.isRoot}
        <button
          class="context-menu-item danger"
          onclick={() => {
            const t = contextMenu!.target;
            if (t.type === 'folder') onRemoveFolder?.(t.path);
            contextMenu = null;
          }}
          type="button"
          role="menuitem"
        >
          <FolderX size={13} />
          <span>Remove from Sidebar</span>
        </button>
      {:else}
        <button
          class="context-menu-item"
          onclick={() => {
            const t = contextMenu!.target;
            if (t.type === 'folder') promptRenameItem(t.path, t.name);
          }}
          type="button"
          role="menuitem"
        >
          <Edit2 size={13} />
          <span>Rename Folder</span>
        </button>
        <button
          class="context-menu-item danger"
          onclick={() => {
            const t = contextMenu!.target;
            if (t.type === 'folder') promptDeleteItem(t.path, t.name);
          }}
          type="button"
          role="menuitem"
        >
          <Trash2 size={13} />
          <span>Delete Folder</span>
        </button>
      {/if}
    {:else if contextMenu.target.type === 'file'}
      <div class="context-menu-header">
        <span class="context-menu-title">{contextMenu.target.name}</span>
      </div>
      <button
        class="context-menu-item"
        onclick={() => {
          const t = contextMenu!.target;
          if (t.type === 'file') onSelectNote({ path: t.path, title: t.name, lastOpened: Date.now() });
          contextMenu = null;
        }}
        type="button"
        role="menuitem"
      >
        <FileText size={13} />
        <span>Open Note</span>
      </button>
      <button
        class="context-menu-item"
        onclick={() => {
          const t = contextMenu!.target;
          if (t.type === 'file') promptRenameItem(t.path, t.name);
        }}
        type="button"
        role="menuitem"
      >
        <Edit2 size={13} />
        <span>Rename</span>
      </button>
      <button
        class="context-menu-item danger"
        onclick={() => {
          const t = contextMenu!.target;
          if (t.type === 'file') promptDeleteItem(t.path, t.name);
        }}
        type="button"
        role="menuitem"
      >
        <Trash2 size={13} />
        <span>Delete</span>
      </button>
    {:else if contextMenu.target.type === 'recent'}
      <div class="context-menu-header">
        <span class="context-menu-title">{contextMenu.target.item.title}</span>
      </div>
      <button
        class="context-menu-item"
        onclick={() => {
          const t = contextMenu!.target;
          if (t.type === 'recent') promptAddTag(t.item);
        }}
        type="button"
        role="menuitem"
      >
        <Tag size={13} />
        <span>Add Tag...</span>
      </button>
      <button
        class="context-menu-item"
        onclick={() => {
          const t = contextMenu!.target;
          if (t.type === 'recent') promptRename(t.item);
        }}
        type="button"
        role="menuitem"
      >
        <Edit2 size={13} />
        <span>Rename</span>
      </button>
      <button
        class="context-menu-item danger"
        onclick={() => {
          const t = contextMenu!.target;
          if (t.type === 'recent') promptDelete(t.item);
        }}
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
            const t = contextMenu!.target;
            if (t.type === 'recent') onCloseNote(t.item, e);
            contextMenu = null;
          }}
          type="button"
          role="menuitem"
        >
          <X size={13} />
          <span>Close Note</span>
        </button>
      {/if}
    {/if}
  </div>
{/if}

<!-- New Note in Folder Modal -->
{#if showNewNoteModal}
  <div
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={() => { showNewNoteModal = null; }}
    onkeydown={(e) => { if (e.key === 'Escape') showNewNoteModal = null; }}
  >
    <div
      class="modal-card"
      role="document"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="modal-title">
        <span>New Note in "{showNewNoteModal.folderName}"</span>
      </div>
      <form onsubmit={submitNewNote}>
        <div class="modal-input-row">
          <input
            bind:this={newNoteInputEl}
            type="text"
            placeholder="Note name (e.g. Lecture 1, Syllabus)"
            bind:value={newNoteName}
            class="tui-modal-input"
          />
        </div>
        <div class="modal-actions">
          <button
            type="button"
            class="btn btn-secondary"
            onclick={() => { showNewNoteModal = null; }}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            disabled={!newNoteName.trim()}
          >
            Create
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- New Subfolder Modal -->
{#if showNewSubfolderModal}
  <div
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={() => { showNewSubfolderModal = null; }}
    onkeydown={(e) => { if (e.key === 'Escape') showNewSubfolderModal = null; }}
  >
    <div
      class="modal-card"
      role="document"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="modal-title">
        <span>New Subfolder in "{showNewSubfolderModal.parentName}"</span>
      </div>
      <form onsubmit={submitNewSubfolder}>
        <div class="modal-input-row">
          <input
            bind:this={newSubfolderInputEl}
            type="text"
            placeholder="Folder name (e.g. Assignments, Lab Notes)"
            bind:value={newSubfolderName}
            class="tui-modal-input"
          />
        </div>
        <div class="modal-actions">
          <button
            type="button"
            class="btn btn-secondary"
            onclick={() => { showNewSubfolderModal = null; }}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            disabled={!newSubfolderName.trim()}
          >
            Create
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Add Tag Modal -->
{#if showAddTagModal}
  <div
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={() => { showAddTagModal = null; }}
    onkeydown={(e) => { if (e.key === 'Escape') showAddTagModal = null; }}
  >
    <div
      class="modal-card add-tag-modal"
      role="document"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="modal-title">
        <Tag size={13} style="margin-right: 6px; color: var(--accent);" />
        <span>Add Tag</span>
      </div>
      <form onsubmit={submitAddTag}>
        <div class="modal-input-row">
          <input
            bind:this={addTagInputEl}
            type="text"
            placeholder="Tag name (e.g. project, todo)"
            bind:value={newTagInput}
            class="tui-modal-input"
          />
        </div>
        {#if availableTags.length > 0}
          {@const filteredSuggestions = availableTags
            .filter((t) => !(showAddTagModal?.tags || []).includes(t.tag))
            .filter((t) => {
              const q = normalizeTag(newTagInput);
              return !q || t.tag.includes(q);
            })
            .slice(0, 6)}
          {#if filteredSuggestions.length > 0}
            <div class="tag-suggestions">
              <span class="tag-suggestions-label">Suggestions:</span>
              <div class="tag-suggestions-list">
                {#each filteredSuggestions as suggestion}
                  <button
                    type="button"
                    class="tag-suggestion-chip"
                    onclick={() => {
                      newTagInput = suggestion.tag;
                      addTagInputEl?.focus();
                    }}
                  >
                    #{suggestion.tag}
                    <span class="tag-count">{suggestion.count}</span>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        {/if}
        <div class="modal-actions">
          <button
            type="button"
            class="btn btn-secondary"
            onclick={() => { showAddTagModal = null; }}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            disabled={!isValidTag(newTagInput)}
          >
            Add Tag
          </button>
        </div>
      </form>
    </div>
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
        <span>Rename</span>
      </div>
      <form onsubmit={submitRename}>
        <div class="modal-input-row">
          <input
            bind:this={renameInputEl}
            type="text"
            bind:value={renameName}
            class="tui-modal-input"
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
        <span>Delete Item</span>
      </div>
      <div class="modal-message">
        Are you sure you want to delete <strong class="file-highlight">"{showDeleteModal.title}"</strong>?
        {#if showDeleteModal.isDiskFile}
          <div class="warning-text">This will permanently remove it from disk.</div>
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
    width: 260px;
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

  .tag-search-toggle {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    transition: color 0.12s ease, background-color 0.12s ease;
    flex-shrink: 0;
  }

  .tag-search-toggle:hover {
    color: var(--text-bright);
    background-color: var(--bg-hover);
  }

  .tag-search-toggle.active {
    color: var(--accent);
    background-color: var(--bg-active);
  }

  /* Tag Filters Tray */
  .tags-tray {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--border-subtle);
    flex-wrap: wrap;
    max-height: 72px;
    overflow-y: auto;
    scrollbar-width: thin;
    background-color: var(--bg-sidebar);
  }

  .tags-tray::-webkit-scrollbar {
    width: 3px;
  }

  .tags-tray::-webkit-scrollbar-thumb {
    background-color: var(--border);
    border-radius: 2px;
  }

  .tag-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    font-size: 10px;
    font-family: var(--font-mono);
    color: var(--text-muted);
    background-color: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease;
    user-select: none;
  }

  .tag-pill:hover {
    background-color: var(--bg-hover);
    color: var(--text-bright);
    border-color: var(--border);
  }

  .tag-pill.active {
    background-color: var(--bg-active);
    color: var(--accent);
    border-color: var(--accent);
    font-weight: 600;
  }

  .tag-count {
    font-size: 9px;
    opacity: 0.75;
    background-color: rgba(255, 255, 255, 0.06);
    padding: 0 4px;
    border-radius: 6px;
  }

  .tag-pill.active .tag-count {
    background-color: rgba(56, 189, 248, 0.18);
  }

  .btn-clear-tag-filter {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    background-color: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--accent);
    font-size: 11px;
    font-family: var(--font-mono);
    cursor: pointer;
    transition: color 0.12s ease, border-color 0.12s ease, background-color 0.12s ease;
  }

  .btn-clear-tag-filter:hover {
    border-color: var(--accent);
    background-color: var(--bg-active);
  }

  /* Content */
  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px 4px;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
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

  /* Sections */
  .sidebar-section {
    display: flex;
    flex-direction: column;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 6px;
    cursor: pointer;
    border-radius: 3px;
    transition: background-color 0.12s ease;
    user-select: none;
  }

  .section-header:hover {
    background-color: var(--bg-hover);
  }

  .section-header-left {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .section-chevron {
    color: var(--text-muted);
    display: flex;
    align-items: center;
  }

  .section-title {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .section-count {
    font-size: 9.5px;
    color: var(--text-muted);
    background: var(--bg-subtle);
    padding: 1px 5px;
    border-radius: 10px;
    border: 1px solid var(--border-subtle);
  }

  .section-header-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .section-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: transparent;
    border: none;
    border-radius: 3px;
    color: var(--text-muted);
    cursor: pointer;
    transition: background-color 0.1s ease, color 0.1s ease;
  }

  .section-action-btn:hover {
    background-color: var(--bg-hover);
    color: var(--text-bright);
  }

  .section-body {
    margin-top: 2px;
  }

  /* Folders Empty Card */
  .folders-empty-card {
    margin: 4px;
    padding: 14px 10px;
    border: 1px dashed var(--border);
    border-radius: 5px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 6px;
    background-color: rgba(255, 255, 255, 0.01);
  }

  :global(.empty-folder-icon) {
    color: var(--text-muted);
    opacity: 0.7;
    margin-bottom: 2px;
  }

  .empty-folder-text {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-main);
  }

  .empty-folder-hint {
    font-size: 10px;
    color: var(--text-muted);
    line-height: 1.35;
  }

  .btn-add-folder {
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    background-color: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-bright);
    font-size: 10.5px;
    font-family: var(--font-mono);
    cursor: pointer;
    transition: all 0.12s ease;
  }

  .btn-add-folder:hover {
    background-color: var(--accent);
    border-color: var(--accent);
    color: #09090b;
  }

  /* Folder Root Block & Tree Items */
  .folder-root-block {
    margin-bottom: 2px;
  }

  .folders-tree-list {
    display: flex;
    flex-direction: column;
  }

  .tree-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border-radius: 3px;
    cursor: pointer;
    color: var(--text-main);
    font-size: 11px;
    transition: background-color 0.1s ease, color 0.1s ease;
    position: relative;
  }

  .tree-item:hover {
    background-color: var(--bg-hover);
    color: var(--text-bright);
  }

  .tree-item.active {
    background-color: var(--bg-active);
    color: var(--text-bright);
    font-weight: 600;
  }

  .tree-item.active :global(.file-icon) {
    color: var(--accent);
  }

  .tree-chevron {
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    flex-shrink: 0;
  }

  :global(.tree-icon) {
    flex-shrink: 0;
  }

  :global(.folder-icon) {
    color: #f59e0b;
  }

  :global(.root-folder-icon) {
    color: var(--accent);
  }

  :global(.file-icon) {
    color: var(--text-muted);
  }

  .tree-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .root-folder-label {
    font-weight: 600;
  }

  .tree-actions {
    display: none;
    align-items: center;
    gap: 2px;
    margin-left: auto;
  }

  .tree-item:hover .tree-actions {
    display: flex;
  }

  .tree-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background: transparent;
    border: none;
    border-radius: 3px;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0;
  }

  .tree-action-btn:hover {
    background-color: var(--bg-active);
    color: var(--text-bright);
  }

  .tree-empty {
    font-size: 10px;
    color: var(--text-muted);
    padding: 3px 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    opacity: 0.7;
  }

  .empty-add-note-btn {
    background: transparent;
    border: none;
    color: var(--accent);
    cursor: pointer;
    font-size: 10px;
    padding: 0;
    font-family: var(--font-mono);
  }

  .empty-add-note-btn:hover {
    text-decoration: underline;
  }

  /* Recent List Items */
  .empty-state {
    font-size: 11px;
    color: var(--text-muted);
    padding: 20px 12px;
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
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-main);
    font-size: 11px;
    font-family: var(--font-mono);
    cursor: pointer;
    transition: all 0.12s ease;
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
    padding: 6px 8px;
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

  .recent-item-tags {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 3px;
    padding-left: 20px;
    margin-top: 1px;
    margin-bottom: 2px;
  }

  .item-tag {
    font-size: 9.5px;
    color: var(--accent);
    background-color: rgba(56, 189, 248, 0.08);
    border: 1px solid rgba(56, 189, 248, 0.18);
    border-radius: 3px;
    padding: 0 4px;
    cursor: pointer;
    transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease;
    white-space: nowrap;
    line-height: 1.4;
    user-select: none;
  }

  .item-tag:hover {
    background-color: rgba(56, 189, 248, 0.2);
    border-color: var(--accent);
    color: var(--text-bright);
  }

  .item-tag-more {
    font-size: 9px;
    color: var(--text-muted);
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
    min-width: 160px;
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

  .add-tag-modal {
    width: 380px;
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

  .tag-suggestions {
    margin-top: -6px;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tag-suggestions-label {
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tag-suggestions-list {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    max-height: 80px;
    overflow-y: auto;
  }

  .tag-suggestion-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background-color: var(--bg-app);
    border: 1px solid var(--border);
    border-radius: 12px;
    color: var(--text-main);
    font-size: 11px;
    font-family: var(--font-mono);
    cursor: pointer;
    transition: all 0.12s ease;
  }

  .tag-suggestion-chip:hover {
    border-color: var(--accent);
    color: var(--accent);
    background-color: var(--bg-hover);
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
