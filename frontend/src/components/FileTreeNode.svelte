<script lang="ts">
  import type { FileTreeItem } from '../types';
  import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown } from '@lucide/svelte';
  import FileTreeNode from './FileTreeNode.svelte';

  let {
    item,
    activePath,
    onSelectFile,
    onContextMenu,
    onDragStartNode,
    onDragEndNode,
    onDropNode,
    depth = 0,
  }: {
    item: FileTreeItem;
    activePath: string | null;
    onSelectFile: (path: string) => void;
    onContextMenu?: (e: MouseEvent, item: FileTreeItem) => void;
    onDragStartNode?: (e: DragEvent, item: FileTreeItem) => void;
    onDragEndNode?: () => void;
    onDropNode?: (targetDir: string) => void;
    depth?: number;
  } = $props();

  let isOpen = $state(false);
  let isDragOver = $state(false);
  let isDragging = $state(false);

  const isActive = $derived(activePath !== null && activePath === item.path);

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    if (item.isDir) {
      isOpen = !isOpen;
    } else {
      onSelectFile(item.path);
    }
  }

  function handleContextMenu(e: MouseEvent) {
    if (onContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e, item);
    }
  }

  function handleDragStart(e: DragEvent) {
    isDragging = true;
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', item.path);
      e.dataTransfer.effectAllowed = 'move';
    }
    onDragStartNode?.(e, item);
  }

  function handleDragEnd() {
    isDragging = false;
    onDragEndNode?.();
  }

  function handleDragOver(e: DragEvent) {
    if (item.isDir) {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
      isDragOver = true;
    }
  }

  function handleDragLeave(e: DragEvent) {
    if (item.isDir) {
      isDragOver = false;
    }
  }

  function handleDrop(e: DragEvent) {
    if (item.isDir) {
      e.preventDefault();
      e.stopPropagation();
      isDragOver = false;
      onDropNode?.(item.path);
    }
  }
</script>

<div class="tree-node" style="--depth: {depth}">
  <button
    type="button"
    class="tree-row"
    class:active={isActive}
    class:is-dir={item.isDir}
    class:drag-over={isDragOver}
    class:is-dragging={isDragging}
    draggable={true}
    onclick={handleClick}
    oncontextmenu={handleContextMenu}
    ondragstart={handleDragStart}
    ondragend={handleDragEnd}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    title={item.path}
  >
    {#if item.isDir}
      <span class="tree-chevron">
        {#if isOpen}
          <ChevronDown size={14} />
        {:else}
          <ChevronRight size={14} />
        {/if}
      </span>
      <span class="tree-icon dir-icon">
        {#if isOpen}
          <FolderOpen size={15} />
        {:else}
          <Folder size={15} />
        {/if}
      </span>
    {:else}
      <span class="tree-chevron spacer"></span>
      <span class="tree-icon file-icon">
        <FileText size={14} />
      </span>
    {/if}
    <span class="tree-label">{item.name}</span>
  </button>

  {#if item.isDir && isOpen && item.children && item.children.length > 0}
    <div class="tree-children">
      {#each item.children as child (child.path)}
        <FileTreeNode
          item={child}
          {activePath}
          {onSelectFile}
          {onContextMenu}
          {onDragStartNode}
          {onDragEndNode}
          {onDropNode}
          depth={depth + 1}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .tree-node {
    user-select: none;
  }

  .tree-row {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 4px 6px 4px calc(6px + var(--depth) * 12px);
    background: transparent;
    border: none;
    border-radius: 0px;
    color: var(--text-main);
    font-size: 11.5px;
    font-family: var(--font-mono);
    text-align: left;
    cursor: pointer;
    transition: background-color 0.1s ease, color 0.1s ease;
    gap: 6px;
  }

  .tree-row:hover {
    background-color: var(--bg-hover);
    color: var(--text-bright);
  }

  .tree-row.active {
    background-color: var(--accent-subtle);
    color: var(--accent);
    font-weight: 600;
  }

  .tree-row.drag-over {
    background-color: var(--bg-hover) !important;
    outline: 1px dashed var(--accent) !important;
    outline-offset: -1px;
    color: var(--accent) !important;
  }

  .tree-row.is-dragging {
    opacity: 0.35;
  }

  .tree-chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .tree-chevron.spacer {
    visibility: hidden;
  }

  .tree-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .dir-icon {
    color: var(--dirty);
  }

  .file-icon {
    color: var(--text-muted);
  }

  .tree-row.active .file-icon {
    color: var(--accent);
  }

  .tree-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .tree-children {
    display: flex;
    flex-direction: column;
  }
</style>
