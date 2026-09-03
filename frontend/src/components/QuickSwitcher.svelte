<script lang="ts">
  import { Search, FileText } from '@lucide/svelte';

  let {
    isOpen = $bindable(false),
    files = [],
    onSelectFile,
  }: {
    isOpen: boolean;
    files: string[];
    onSelectFile: (filePath: string) => void;
  } = $props();

  let query = $state('');
  let selectedIndex = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);

  // Filter files based on fuzzy query
  const filteredFiles = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files.slice(0, 30);
    return files
      .filter((f) => {
        const lower = f.toLowerCase();
        let qi = 0;
        for (let i = 0; i < lower.length && qi < q.length; i++) {
          if (lower[i] === q[qi]) qi++;
        }
        return qi === q.length;
      })
      .slice(0, 30);
  });

  $effect(() => {
    if (isOpen) {
      query = '';
      selectedIndex = 0;
      setTimeout(() => inputEl?.focus(), 30);
    }
  });

  $effect(() => {
    if (selectedIndex >= filteredFiles.length) {
      selectedIndex = Math.max(0, filteredFiles.length - 1);
    }
  });

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % Math.max(1, filteredFiles.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + Math.max(1, filteredFiles.length)) % Math.max(1, filteredFiles.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredFiles[selectedIndex]) {
        onSelectFile(filteredFiles[selectedIndex]);
        isOpen = false;
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      isOpen = false;
    }
  }

  function getBaseName(path: string): string {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
  }

  function getDirName(path: string): string {
    const parts = path.split(/[/\\]/);
    if (parts.length <= 1) return '';
    return parts.slice(0, -1).join('/');
  }
</script>

{#if isOpen}
  <div
    class="quick-switcher-overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={() => { isOpen = false; }}
    onkeydown={handleKeyDown}
  >
    <div
      class="quick-switcher-card"
      role="document"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="search-box">
        <span class="tui-bracket">[</span>
        <Search size={14} class="search-icon" />
        <input
          bind:this={inputEl}
          type="text"
          placeholder="Type to find note..."
          bind:value={query}
          class="switcher-input"
          onkeydown={handleKeyDown}
        />
        <span class="shortcut-hint">ESC to close</span>
        <span class="tui-bracket">]</span>
      </div>

      <div class="results-list">
        {#if filteredFiles.length === 0}
          <div class="empty-results">No notes found</div>
        {:else}
          {#each filteredFiles as file, index (file)}
            <button
              type="button"
              class="result-item"
              class:selected={index === selectedIndex}
              onclick={() => {
                onSelectFile(file);
                isOpen = false;
              }}
              onmouseenter={() => { selectedIndex = index; }}
            >
              <FileText size={14} class="result-icon" />
              <div class="result-text">
                <span class="file-title">{getBaseName(file)}</span>
                {#if getDirName(file)}
                  <span class="file-dir">{getDirName(file)}</span>
                {/if}
              </div>
              {#if index === selectedIndex}
                <span class="enter-badge">↵</span>
              {/if}
            </button>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .quick-switcher-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 15vh;
    z-index: 3000;
    backdrop-filter: blur(3px);
  }

  .quick-switcher-card {
    background-color: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0px;
    width: 540px;
    max-width: 90vw;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
    font-family: var(--font-mono);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .search-box {
    display: flex;
    align-items: center;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    gap: 8px;
    background-color: var(--bg-app);
  }

  .search-box :global(.search-icon) {
    color: var(--accent);
    flex-shrink: 0;
  }

  .switcher-input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-bright);
    font-family: var(--font-mono);
    font-size: 13px;
    outline: none;
  }

  .shortcut-hint {
    font-size: 10px;
    color: var(--text-muted);
  }

  .tui-bracket {
    color: var(--accent);
    font-weight: 700;
  }

  .results-list {
    max-height: 340px;
    overflow-y: auto;
    padding: 4px 0;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 14px;
    background: transparent;
    border: none;
    border-radius: 0px;
    color: var(--text-main);
    font-family: var(--font-mono);
    text-align: left;
    cursor: pointer;
    font-size: 12px;
    transition: background-color 0.1s ease;
  }

  .result-item.selected {
    background-color: var(--accent-subtle);
    color: var(--accent);
  }

  .result-item :global(.result-icon) {
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .result-item.selected :global(.result-icon) {
    color: var(--accent);
  }

  .result-text {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .file-title {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-dir {
    font-size: 10.5px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .enter-badge {
    font-size: 11px;
    color: var(--accent);
    padding: 1px 5px;
    border: 1px solid var(--accent);
    border-radius: 0px;
  }

  .empty-results {
    padding: 24px;
    text-align: center;
    color: var(--text-muted);
    font-size: 12px;
  }
</style>
