<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { EditorView } from '@codemirror/view';
  import {
    SearchQuery,
    setSearchQuery,
    findNext,
    findPrevious,
    replaceNext,
    replaceAll,
  } from '@codemirror/search';
  import {
    ChevronUp,
    ChevronDown,
    ChevronRight,
    X,
    Replace as ReplaceIcon,
  } from '@lucide/svelte';

  let {
    view,
    isOpen,
    onClose,
  }: {
    view: EditorView | null;
    isOpen: boolean;
    onClose: () => void;
  } = $props();

  let searchPrompt = $state('');
  let replacePrompt = $state('');
  let showReplace = $state(false);
  let searchInputEl = $state<HTMLInputElement | null>(null);

  interface ParsedQuery {
    pattern: string;
    isRegex: boolean;
    isCaseSensitive: boolean;
    isWholeWord: boolean;
  }

  function parsePrompt(raw: string): ParsedQuery {
    let text = raw;
    let isRegex = false;
    let isCaseSensitive = false;
    let isWholeWord = false;

    // Check for /regex/ or /regex/flags
    const regexSlashMatch = text.match(/^\/(.+)\/([gimsuy]*)$/);
    if (regexSlashMatch) {
      isRegex = true;
      text = regexSlashMatch[1];
      isCaseSensitive = !regexSlashMatch[2].includes('i');
      return { pattern: text, isRegex, isCaseSensitive, isWholeWord };
    }

    // Check for "whole word"
    if (text.startsWith('"') && text.endsWith('"') && text.length >= 2) {
      isWholeWord = true;
      text = text.slice(1, -1);
    }

    // Smart Case: if input contains uppercase letters, match case
    if (text.toLowerCase() !== text) {
      isCaseSensitive = true;
    }

    return { pattern: text, isRegex, isCaseSensitive, isWholeWord };
  }

  let parsed = $derived(parsePrompt(searchPrompt));

  let matchStats = $state<{ total: number; current: number }>({ total: 0, current: 0 });

  function updateSearch() {
    if (!view) return;

    if (!searchPrompt) {
      view.dispatch({
        effects: setSearchQuery.of(new SearchQuery({ search: '' })),
      });
      matchStats = { total: 0, current: 0 };
      return;
    }

    try {
      const query = new SearchQuery({
        search: parsed.pattern,
        caseSensitive: parsed.isCaseSensitive,
        regexp: parsed.isRegex,
        wholeWord: parsed.isWholeWord,
        replace: replacePrompt,
      });

      view.dispatch({
        effects: setSearchQuery.of(query),
      });

      // Count occurrences and find current position
      const cursor = query.getCursor(view.state.doc);
      let count = 0;
      let currentIdx = 0;
      const selFrom = view.state.selection.main.from;

      let cur = cursor.next();
      while (!cur.done) {
        count++;
        if (cur.value.from <= selFrom) {
          currentIdx = count;
        }
        cur = cursor.next();
      }

      matchStats = {
        total: count,
        current: count === 0 ? 0 : currentIdx || 1,
      };
    } catch {
      // Invalid regex pattern while user is typing
      matchStats = { total: 0, current: 0 };
    }
  }

  $effect(() => {
    // Re-run whenever searchPrompt, replacePrompt, or view changes
    const _ = [searchPrompt, replacePrompt, view];
    updateSearch();
  });

  $effect(() => {
    if (isOpen) {
      tick().then(() => {
        searchInputEl?.focus();
        searchInputEl?.select();
      });
    }
  });

  function handleNext() {
    if (!view) return;
    findNext(view);
    updateSearch();
  }

  function handlePrev() {
    if (!view) return;
    findPrevious(view);
    updateSearch();
  }

  function handleReplace() {
    if (!view) return;
    replaceNext(view);
    updateSearch();
  }

  function handleReplaceAll() {
    if (!view) return;
    replaceAll(view);
    updateSearch();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      view?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  }
</script>

{#if isOpen}
  <div class="find-replace-container" role="search" onkeydown={handleKeyDown}>
    <div class="find-row">
      <button
        class="toggle-replace-btn"
        class:active={showReplace}
        title="Toggle Replace"
        onclick={() => { showReplace = !showReplace; }}
        type="button"
      >
        <ChevronRight size={13} class={showReplace ? 'rotate-down' : ''} />
      </button>

      <div class="input-wrapper">
        <input
          bind:this={searchInputEl}
          bind:value={searchPrompt}
          placeholder="Find (e.g. word, &quot;exact&quot;, /regex/)..."
          class="find-input"
          type="text"
        />

        <!-- Natural mode detection indicators -->
        <div class="mode-pills">
          {#if parsed.isCaseSensitive}
            <span class="pill active" title="Smart Case: Case Sensitive (auto-detected)">Aa</span>
          {/if}
          {#if parsed.isRegex}
            <span class="pill active" title="Regex Mode (auto-detected from /pattern/)">.*</span>
          {/if}
          {#if parsed.isWholeWord}
            <span class="pill active" title="Whole Word (auto-detected from &quot;word&quot;)">\b</span>
          {/if}
        </div>
      </div>

      <div class="match-count">
        {#if searchPrompt}
          {#if matchStats.total > 0}
            <span>{matchStats.current} of {matchStats.total}</span>
          {:else}
            <span class="no-match">No results</span>
          {/if}
        {/if}
      </div>

      <div class="action-buttons">
        <button
          class="btn-icon"
          title="Previous Match (Shift+Enter)"
          onclick={handlePrev}
          disabled={matchStats.total === 0}
          type="button"
        >
          <ChevronUp size={14} />
        </button>
        <button
          class="btn-icon"
          title="Next Match (Enter)"
          onclick={handleNext}
          disabled={matchStats.total === 0}
          type="button"
        >
          <ChevronDown size={14} />
        </button>
        <button
          class="btn-icon btn-close"
          title="Close (Escape)"
          onclick={() => {
            onClose();
            view?.focus();
          }}
          type="button"
        >
          <X size={14} />
        </button>
      </div>
    </div>

    {#if showReplace}
      <div class="replace-row">
        <div class="replace-spacer"></div>
        <div class="input-wrapper">
          <input
            bind:value={replacePrompt}
            placeholder="Replace with..."
            class="find-input"
            type="text"
            onkeydown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleReplace();
              }
            }}
          />
        </div>

        <div class="replace-actions">
          <button
            class="btn-text"
            onclick={handleReplace}
            disabled={matchStats.total === 0}
            type="button"
          >
            Replace
          </button>
          <button
            class="btn-text"
            onclick={handleReplaceAll}
            disabled={matchStats.total === 0}
            type="button"
          >
            All
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .find-replace-container {
    position: absolute;
    top: 8px;
    right: 12px;
    z-index: 100;
    background-color: var(--bg-card);
    border: 1px solid var(--border);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    border-radius: 0px;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 320px;
    max-width: 440px;
    user-select: none;
    font-family: var(--font-mono);
    animation: fadeIn 0.1s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-3px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .find-row,
  .replace-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .toggle-replace-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 0px;
  }

  .toggle-replace-btn:hover {
    color: var(--text-main);
    background-color: var(--bg-hover);
  }

  :global(.rotate-down) {
    transform: rotate(90deg);
    transition: transform 0.12s ease;
  }

  .replace-spacer {
    width: 21px;
    flex-shrink: 0;
  }

  .input-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    background-color: var(--bg-app);
    border: 1px solid var(--border);
    border-radius: 0px;
    padding: 3px 8px;
    gap: 6px;
    min-width: 0;
  }

  .input-wrapper:focus-within {
    border-color: var(--border-focus);
  }

  .find-input {
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-bright);
    font-size: 11.5px;
    font-family: var(--font-mono);
    width: 100%;
    min-width: 0;
  }

  .find-input::placeholder {
    color: var(--text-muted);
  }

  .mode-pills {
    display: flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
  }

  .pill {
    font-size: 9.5px;
    font-family: var(--font-mono);
    font-weight: 700;
    padding: 1px 3px;
    border-radius: 0px;
    background-color: var(--accent-subtle);
    color: var(--accent);
    border: 1px solid var(--accent);
  }

  .match-count {
    font-size: 11px;
    color: var(--text-muted);
    font-family: var(--font-mono);
    white-space: nowrap;
    min-width: 46px;
    text-align: right;
  }

  .no-match {
    color: var(--danger);
  }

  .action-buttons {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .btn-icon {
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-muted);
    padding: 3px;
    border-radius: 0px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.1s ease, color 0.1s ease;
  }

  .btn-icon:hover:not(:disabled) {
    background-color: var(--bg-hover);
    border-color: var(--border);
    color: var(--text-bright);
  }

  .btn-icon:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .btn-close:hover {
    background-color: var(--danger);
    color: #fff;
    border-color: var(--danger);
  }

  .replace-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .btn-text {
    background-color: var(--bg-hover);
    border: 1px solid var(--border);
    color: var(--text-main);
    padding: 2px 7px;
    font-size: 11px;
    font-family: var(--font-mono);
    border-radius: 0px;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.1s ease, color 0.1s ease;
  }

  .btn-text:hover:not(:disabled) {
    background-color: var(--bg-active);
    color: var(--text-bright);
  }

  .btn-text:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>
