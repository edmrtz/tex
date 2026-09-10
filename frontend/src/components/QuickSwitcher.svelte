<script lang="ts">
  import { Search, FileText } from '@lucide/svelte';
  import { ReadFile } from '../../wailsjs/go/main/App';

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

  let previewContent = $state<string>('');
  let previewLoading = $state<boolean>(false);
  const previewCache = new Map<string, string>();

  // Filter files based on fuzzy query
  const filteredFiles = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files.slice(0, 40);
    return files
      .filter((f) => {
        const lower = f.toLowerCase();
        let qi = 0;
        for (let i = 0; i < lower.length && qi < q.length; i++) {
          if (lower[i] === q[qi]) qi++;
        }
        return qi === q.length;
      })
      .slice(0, 40);
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

  // Load preview for currently highlighted file
  $effect(() => {
    if (!isOpen) return;
    const targetFile = filteredFiles[selectedIndex];
    if (!targetFile) {
      previewContent = '';
      return;
    }

    if (previewCache.has(targetFile)) {
      previewContent = previewCache.get(targetFile)!;
      return;
    }

    previewLoading = true;
    ReadFile(targetFile)
      .then((res) => {
        const text = res?.content || '(Empty document)';
        previewCache.set(targetFile, text);
        if (filteredFiles[selectedIndex] === targetFile) {
          previewContent = text;
        }
      })
      .catch(() => {
        if (filteredFiles[selectedIndex] === targetFile) {
          previewContent = '(Unable to load preview)';
        }
      })
      .finally(() => {
        previewLoading = false;
      });
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
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="switcher-layout">
        <!-- Left: Search and File Results -->
        <div class="switcher-list-pane">
          <div class="search-box">
            <Search size={14} class="search-icon" />
            <input
              bind:this={inputEl}
              type="text"
              placeholder="Type to find note..."
              bind:value={query}
              class="switcher-input"
              onkeydown={handleKeyDown}
            />
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

        <!-- Right: Real-time File Preview Pane -->
        <div class="switcher-preview-pane">
          <div class="preview-header">
            <span class="preview-title" title={filteredFiles[selectedIndex] || ''}>
              {filteredFiles[selectedIndex] ? getBaseName(filteredFiles[selectedIndex]) : 'Preview'}
            </span>
            <span class="shortcut-hint">ESC to close</span>
          </div>

          <div class="preview-body">
            {#if previewLoading}
              <div class="preview-status">Loading note content...</div>
            {:else if previewContent}
              <pre class="preview-content-box">{previewContent}</pre>
            {:else}
              <div class="preview-status">Select a note to preview</div>
            {/if}
          </div>
        </div>
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
    padding-top: 12vh;
    z-index: 3000;
    animation: switcherOverlayFade 0.15s ease-out;
  }

  .quick-switcher-card {
    background-color: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0px;
    width: 820px;
    max-width: 92vw;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65);
    font-family: var(--font-mono);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: switcherCardPop 0.16s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform, opacity;
  }

  @keyframes switcherOverlayFade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes switcherCardPop {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .switcher-layout {
    display: flex;
    height: 400px;
    max-height: 70vh;
  }

  .switcher-list-pane {
    width: 360px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
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

  .results-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 7px 12px;
    background: transparent;
    border: none;
    border-radius: 0px;
    color: var(--text-main);
    font-family: var(--font-mono);
    text-align: left;
    cursor: pointer;
    font-size: 12px;
    transition: background-color 0.1s ease, color 0.1s ease;
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
    font-size: 10px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 1px;
  }

  .enter-badge {
    font-size: 10.5px;
    color: var(--accent);
    font-weight: bold;
    padding: 1px 4px;
    border: 1px solid var(--border);
    border-radius: 2px;
    background: var(--bg-hover);
  }

  .empty-results {
    padding: 24px 16px;
    text-align: center;
    color: var(--text-muted);
    font-size: 12px;
  }

  /* Preview Pane */
  .switcher-preview-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background-color: var(--bg-app);
  }

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 14px;
    border-bottom: 1px solid var(--border);
    background-color: var(--bg-app);
    min-height: 38px;
    box-sizing: border-box;
  }

  .preview-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--accent);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shortcut-hint {
    font-size: 10px;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .preview-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
  }

  .preview-status {
    color: var(--text-muted);
    font-size: 11px;
    font-style: italic;
    padding-top: 20px;
    text-align: center;
  }

  .preview-content-box {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 11.5px;
    line-height: 1.6;
    color: var(--text-main);
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
