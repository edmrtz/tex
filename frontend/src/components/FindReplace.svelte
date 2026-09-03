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
    top: 10px;
    right: 20px;
    z-index: 100;
    background-color: #18181b;
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    border-radius: 8px;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 320px;
    max-width: 440px;
    user-select: none;
    animation: fadeIn 0.12s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
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
    color: #71717a;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 4px;
  }

  .toggle-replace-btn:hover {
    color: #e4e4e7;
    background-color: rgba(255, 255, 255, 0.05);
  }

  :global(.rotate-down) {
    transform: rotate(90deg);
    transition: transform 0.15s ease;
  }

  .replace-spacer {
    width: 21px;
    flex-shrink: 0;
  }

  .input-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    background-color: #121215;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    padding: 4px 8px;
    gap: 6px;
    min-width: 0;
  }

  .input-wrapper:focus-within {
    border-color: rgba(56, 189, 248, 0.4);
  }

  .find-input {
    background: transparent;
    border: none;
    outline: none;
    color: #f4f4f5;
    font-size: 12px;
    font-family: inherit;
    width: 100%;
    min-width: 0;
  }

  .find-input::placeholder {
    color: #52525b;
  }

  .mode-pills {
    display: flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
  }

  .pill {
    font-size: 10px;
    font-family: monospace;
    font-weight: 600;
    padding: 1px 4px;
    border-radius: 3px;
    background-color: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.3);
  }

  .match-count {
    font-size: 11px;
    color: #a1a1aa;
    white-space: nowrap;
    min-width: 48px;
    text-align: right;
  }

  .no-match {
    color: #f87171;
  }

  .action-buttons {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .btn-icon {
    background: transparent;
    border: none;
    color: #a1a1aa;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.12s ease, color 0.12s ease;
  }

  .btn-icon:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.08);
    color: #f4f4f5;
  }

  .btn-icon:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .btn-close:hover {
    color: #f87171;
  }

  .replace-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .btn-text {
    background-color: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #d4d4d8;
    padding: 3px 8px;
    font-size: 11px;
    font-family: inherit;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.12s ease, color 0.12s ease;
  }

  .btn-text:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }

  .btn-text:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>
