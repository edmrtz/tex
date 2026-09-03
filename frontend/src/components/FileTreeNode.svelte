<script lang="ts">
  import type { FileTreeItem } from '../types';
  import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown } from '@lucide/svelte';
  import FileTreeNode from './FileTreeNode.svelte';

  let {
    item,
    activePath,
    onSelectFile,
    depth = 0,
  }: {
    item: FileTreeItem;
    activePath: string | null;
    onSelectFile: (path: string) => void;
    depth?: number;
  } = $props();

  let isOpen = $state(false);

  const isActive = $derived(activePath !== null && activePath === item.path);

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    if (item.isDir) {
      isOpen = !isOpen;
    } else {
      onSelectFile(item.path);
    }
  }
</script>

<div class="tree-node" style="--depth: {depth}">
  <button
    type="button"
    class="tree-row"
    class:active={isActive}
    class:is-dir={item.isDir}
    onclick={handleClick}
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
    padding: 5px 8px 5px calc(8px + var(--depth) * 12px);
    background: transparent;
    border: none;
    border-radius: 6px;
    color: #a1a1aa;
    font-size: 13px;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.12s ease, color 0.12s ease;
    gap: 6px;
  }

  .tree-row:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: #e4e4e7;
  }

  .tree-row.active {
    background-color: rgba(56, 189, 248, 0.12);
    color: #38bdf8;
    font-weight: 500;
  }

  .tree-chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    color: #71717a;
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
    color: #f59e0b;
  }

  .file-icon {
    color: #94a3b8;
  }

  .tree-row.active .file-icon {
    color: #38bdf8;
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
