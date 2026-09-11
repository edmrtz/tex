<script lang="ts">
  import { tick } from 'svelte';
  import { Tag, X, Plus } from '@lucide/svelte';
  import { isValidTag, normalizeTag } from '../utils/tags';

  interface Props {
    tags?: string[];
    allWorkspaceTags?: string[];
    onAddTag: (tag: string) => void;
    onRemoveTag: (tag: string) => void;
    onSelectTagFilter?: (tag: string) => void;
  }

  let {
    tags = [],
    allWorkspaceTags = [],
    onAddTag,
    onRemoveTag,
    onSelectTagFilter,
  }: Props = $props();

  let isAdding = $state(false);
  let inputValue = $state('');
  let selectedIndex = $state(-1);
  let inputEl = $state<HTMLInputElement | null>(null);

  // Suggestions from workspace tags not already in active note
  const suggestions = $derived.by(() => {
    const currentSet = new Set(tags.map((t) => normalizeTag(t)));
    const query = normalizeTag(inputValue);

    const seen = new Set<string>();
    const candidates: string[] = [];

    for (const raw of allWorkspaceTags) {
      const norm = normalizeTag(raw);
      if (norm && !currentSet.has(norm) && !seen.has(norm)) {
        seen.add(norm);
        candidates.push(norm);
      }
    }

    if (!query) {
      return candidates.slice(0, 10);
    }

    return candidates
      .filter((tag) => tag.includes(query))
      .slice(0, 10);
  });

  $effect(() => {
    if (selectedIndex >= suggestions.length) {
      selectedIndex = suggestions.length > 0 ? suggestions.length - 1 : -1;
    }
  });

  function cleanDisplayTag(tag: string): string {
    return tag.replace(/^#+/, '');
  }

  function startAdding() {
    isAdding = true;
    inputValue = '';
    selectedIndex = -1;
    tick().then(() => {
      inputEl?.focus();
    });
  }

  function cancelAdding() {
    isAdding = false;
    inputValue = '';
    selectedIndex = -1;
  }

  function addTag(rawTag: string) {
    const norm = normalizeTag(rawTag);
    if (norm && isValidTag(norm)) {
      if (!tags.some((t) => normalizeTag(t) === norm)) {
        onAddTag(norm);
      }
      return true;
    }
    return false;
  }

  function submitCurrentInput() {
    if (!inputValue.trim()) return;
    const added = addTag(inputValue);
    if (added) {
      inputValue = '';
      selectedIndex = -1;
    }
  }

  function selectSuggestion(tag: string) {
    addTag(tag);
    cancelAdding();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      if (suggestions.length > 0) {
        e.preventDefault();
        if (selectedIndex === -1) {
          selectedIndex = 0;
        } else {
          selectedIndex = (selectedIndex + 1) % suggestions.length;
        }
      }
    } else if (e.key === 'ArrowUp') {
      if (suggestions.length > 0) {
        e.preventDefault();
        if (selectedIndex === -1) {
          selectedIndex = suggestions.length - 1;
        } else {
          selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        selectSuggestion(suggestions[selectedIndex]);
      } else {
        submitCurrentInput();
      }
    } else if (e.key === ',') {
      e.preventDefault();
      submitCurrentInput();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelAdding();
    } else if (e.key === 'Backspace') {
      if (inputValue === '' && tags.length > 0) {
        e.preventDefault();
        const lastTag = tags[tags.length - 1];
        onRemoveTag(lastTag);
      }
    }
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const val = target.value;
    if (val.includes(',')) {
      const parts = val.split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed) {
          addTag(trimmed);
        }
      }
      inputValue = '';
      selectedIndex = -1;
    }
  }

  function handleBlur() {
    setTimeout(() => {
      if (isAdding) {
        if (inputValue.trim()) {
          submitCurrentInput();
        }
        cancelAdding();
      }
    }, 150);
  }
</script>

<div class="tag-bar" role="toolbar" aria-label="Document tags">
  <div class="tag-bar-header">
    <Tag size={13} strokeWidth={1.5} class="tag-header-icon" />
    <span class="tag-header-label">Tags</span>
  </div>

  <div class="tag-list">
    {#each tags as tag (tag)}
      <div class="tag-pill">
        {#if onSelectTagFilter}
          <button
            type="button"
            class="tag-text-btn"
            onclick={() => onSelectTagFilter(tag)}
            title="Filter by #{cleanDisplayTag(tag)}"
          >
            #{cleanDisplayTag(tag)}
          </button>
        {:else}
          <span class="tag-text">#{cleanDisplayTag(tag)}</span>
        {/if}

        <button
          type="button"
          class="tag-remove-btn"
          onclick={(e) => {
            e.stopPropagation();
            onRemoveTag(tag);
          }}
          title="Remove #{cleanDisplayTag(tag)}"
          aria-label="Remove #{cleanDisplayTag(tag)}"
        >
          <X size={11} strokeWidth={1.5} />
        </button>
      </div>
    {/each}

    {#if tags.length === 0 && !isAdding}
      <span class="tag-empty-placeholder">No tags</span>
    {/if}

    {#if isAdding}
      <div class="tag-input-container">
        <div class="tag-input-pill">
          <span class="tag-input-hash">#</span>
          <input
            bind:this={inputEl}
            type="text"
            class="tag-input"
            bind:value={inputValue}
            onkeydown={handleKeyDown}
            oninput={handleInput}
            onblur={handleBlur}
            placeholder="add tag..."
            aria-label="New tag name"
          />
        </div>

        {#if suggestions.length > 0}
          <div class="tag-suggestions-dropdown" role="listbox">
            {#each suggestions as suggestion, i}
              <button
                type="button"
                role="option"
                aria-selected={i === selectedIndex}
                class="tag-suggestion-item"
                class:selected={i === selectedIndex}
                onmousedown={(e) => {
                  e.preventDefault();
                  selectSuggestion(suggestion);
                }}
              >
                <span class="suggestion-hash">#</span>{cleanDisplayTag(suggestion)}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {:else}
      <button
        type="button"
        class="add-tag-btn"
        onclick={startAdding}
        title="Add tag"
      >
        <Plus size={11} strokeWidth={1.5} />
        <span>Add Tag</span>
      </button>
    {/if}
  </div>
</div>

<style>
  .tag-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    background-color: var(--bg-card);
    border-bottom: 1px solid var(--border-subtle);
    font-family: var(--font-ui);
    font-size: 12px;
    user-select: none;
    min-height: 34px;
    box-sizing: border-box;
  }

  .tag-bar-header {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
    margin-right: 4px;
  }

  :global(.tag-header-icon) {
    opacity: 0.7;
    flex-shrink: 0;
  }

  .tag-list {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    flex: 1;
  }

  .tag-pill {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    background-color: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: 4px;
    padding: 1px 4px 1px 7px;
    font-size: 11.5px;
    color: var(--text-main);
    transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
  }

  .tag-pill:hover {
    border-color: var(--border);
    background-color: var(--bg-hover);
  }

  .tag-text,
  .tag-text-btn {
    font-family: var(--font-ui);
    font-size: 11.5px;
    color: var(--text-main);
    letter-spacing: 0.2px;
  }

  .tag-text-btn {
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
    transition: color 0.15s ease;
  }

  .tag-text-btn:hover {
    color: var(--accent);
  }

  .tag-remove-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    padding: 2px;
    margin-left: 2px;
    border-radius: 3px;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.12s ease, background-color 0.12s ease;
  }

  .tag-remove-btn:hover {
    color: var(--danger, #f87171);
    background-color: rgba(248, 113, 113, 0.12);
  }

  .tag-empty-placeholder {
    font-size: 11px;
    color: var(--text-muted);
    font-style: italic;
    opacity: 0.75;
  }

  .add-tag-btn {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: transparent;
    border: 1px dashed var(--border-subtle);
    border-radius: 4px;
    padding: 2px 7px;
    font-size: 11px;
    font-family: var(--font-ui);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .add-tag-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    background-color: var(--accent-subtle);
  }

  .tag-input-container {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .tag-input-pill {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    background-color: var(--bg-app);
    border: 1px solid var(--border-focus);
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 11.5px;
    box-shadow: 0 0 0 1px var(--accent-subtle);
  }

  .tag-input-hash {
    color: var(--accent);
    font-size: 11.5px;
    user-select: none;
  }

  .tag-input {
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-main);
    font-family: var(--font-ui);
    font-size: 11.5px;
    width: 80px;
    min-width: 60px;
    padding: 0;
  }

  .tag-input::placeholder {
    color: var(--text-muted);
    opacity: 0.7;
    font-size: 11px;
  }

  .tag-suggestions-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 1000;
    min-width: 140px;
    max-height: 180px;
    overflow-y: auto;
    background-color: var(--bg-card);
    border: 1px solid var(--border);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
    border-radius: 4px;
    padding: 3px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .tag-suggestion-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 4px 8px;
    background: transparent;
    border: none;
    border-radius: 3px;
    color: var(--text-main);
    font-family: var(--font-ui);
    font-size: 11px;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.1s ease, color 0.1s ease;
  }

  .tag-suggestion-item:hover,
  .tag-suggestion-item.selected {
    background-color: var(--accent-subtle);
    color: var(--accent);
  }

  .suggestion-hash {
    color: var(--text-muted);
    margin-right: 1px;
  }

  .tag-suggestion-item:hover .suggestion-hash,
  .tag-suggestion-item.selected .suggestion-hash {
    color: var(--accent);
  }
</style>
