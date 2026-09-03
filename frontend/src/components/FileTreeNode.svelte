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
