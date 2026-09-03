<script lang="ts">
  import type { AppSettings } from '../types';
  import { X, Moon, Sun, Hash, Terminal } from '@lucide/svelte';

  let {
    isOpen,
    settings,
    onSave,
    onClose,
  }: {
    isOpen: boolean;
    settings: AppSettings;
    onSave: (newSettings: AppSettings) => void;
    onClose: () => void;
  } = $props();

  let draft = $state<AppSettings>({ ...settings });

  $effect(() => {
    if (isOpen) {
      draft = { ...settings };
    }
  });

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    draft[key] = value;
    onSave({ ...draft });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }
</script>

{#if isOpen}
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={onClose}
    onkeydown={handleKeyDown}
  >
    <div
      class="settings-modal"
      role="document"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="modal-header">
        <div class="header-title">
          <span class="tui-bracket">[</span>
          <span class="tui-label">preferences</span>
          <span class="tui-bracket">]</span>
        </div>
        <button class="tui-btn-close" onclick={onClose} type="button" title="Close (Esc)">
          <X size={14} />
        </button>
      </div>

      <div class="modal-body">
        <!-- Section: Theme -->
        <div class="settings-group">
          <div class="group-header">
            <span class="group-name">Color Theme</span>
          </div>
          <div class="tui-btn-group">
            <button
              class="tui-option-btn"
              class:selected={draft.theme === 'dark'}
              onclick={() => update('theme', 'dark')}
              type="button"
            >
              <span class="indicator">{draft.theme === 'dark' ? '[x]' : '[ ]'}</span>
              <span>Dark (midnight)</span>
            </button>
            <button
              class="tui-option-btn"
              class:selected={draft.theme === 'light'}
              onclick={() => update('theme', 'light')}
              type="button"
            >
              <span class="indicator">{draft.theme === 'light' ? '[x]' : '[ ]'}</span>
              <span>Light (daylight)</span>
            </button>
          </div>
        </div>

        <!-- Section: UI Font -->
        <div class="settings-group">
          <div class="group-header">
            <span class="group-name">UI Typography</span>
          </div>
          <div class="tui-btn-grid">
            <button
              class="tui-option-btn"
              class:selected={draft.uiFont === 'system'}
              onclick={() => update('uiFont', 'system')}
              type="button"
            >
              <span class="indicator">{draft.uiFont === 'system' ? '[x]' : '[ ]'}</span>
              <span>DM Mono (TUI Default)</span>
            </button>
            <button
              class="tui-option-btn"
              class:selected={draft.uiFont === 'inter'}
              onclick={() => update('uiFont', 'inter')}
              type="button"
            >
              <span class="indicator">{draft.uiFont === 'inter' ? '[x]' : '[ ]'}</span>
              <span>Inter (Modern Sans)</span>
            </button>
            <button
              class="tui-option-btn"
              class:selected={draft.uiFont === 'serif'}
              onclick={() => update('uiFont', 'serif')}
              type="button"
            >
              <span class="indicator">{draft.uiFont === 'serif' ? '[x]' : '[ ]'}</span>
              <span>Serif (Editorial)</span>
            </button>
          </div>
        </div>

        <!-- Section: Code Font -->
        <div class="settings-group">
          <div class="group-header">
            <span class="group-name">Monospace / Code Font</span>
          </div>
          <div class="tui-btn-grid">
            <button
              class="tui-option-btn"
              class:selected={draft.monoFont === 'default'}
              onclick={() => update('monoFont', 'default')}
              type="button"
            >
              <span class="indicator">{draft.monoFont === 'default' ? '[x]' : '[ ]'}</span>
              <span>DM Mono</span>
            </button>
            <button
              class="tui-option-btn"
              class:selected={draft.monoFont === 'jetbrains'}
              onclick={() => update('monoFont', 'jetbrains')}
              type="button"
            >
              <span class="indicator">{draft.monoFont === 'jetbrains' ? '[x]' : '[ ]'}</span>
              <span>JetBrains Mono</span>
            </button>
            <button
              class="tui-option-btn"
              class:selected={draft.monoFont === 'fira'}
              onclick={() => update('monoFont', 'fira')}
              type="button"
            >
              <span class="indicator">{draft.monoFont === 'fira' ? '[x]' : '[ ]'}</span>
              <span>Fira Code</span>
            </button>
            <button
              class="tui-option-btn"
              class:selected={draft.monoFont === 'consolas'}
              onclick={() => update('monoFont', 'consolas')}
              type="button"
            >
              <span class="indicator">{draft.monoFont === 'consolas' ? '[x]' : '[ ]'}</span>
              <span>Consolas</span>
            </button>
          </div>
        </div>

        <!-- Section: Font Size -->
        <div class="settings-group">
          <div class="group-header">
            <span class="group-name">Font Size</span>
            <span class="value-badge">{draft.fontSize}px</span>
          </div>
          <div class="stepper-row">
            <button
              class="stepper-btn"
              onclick={() => update('fontSize', Math.max(10, draft.fontSize - 1))}
              type="button"
            >
              [-]
            </button>
            <input
              type="range"
              min="11"
              max="24"
              step="1"
              value={draft.fontSize}
              oninput={(e) => update('fontSize', Number(e.currentTarget.value))}
              class="tui-range"
            />
            <button
              class="stepper-btn"
              onclick={() => update('fontSize', Math.min(32, draft.fontSize + 1))}
              type="button"
            >
              [+]
            </button>
          </div>
        </div>

        <!-- Section: Line Numbers & Vim -->
        <div class="tui-toggle-row">
          <div class="toggle-item">
            <button
              class="tui-option-btn full-width"
              class:selected={draft.lineNumbers}
              onclick={() => update('lineNumbers', !draft.lineNumbers)}
              type="button"
            >
              <span class="indicator">{draft.lineNumbers ? '[x]' : '[ ]'}</span>
              <span>Line Numbers</span>
            </button>
          </div>
          <div class="toggle-item">
            <button
              class="tui-option-btn full-width"
              class:selected={draft.vimMode}
              onclick={() => update('vimMode', !draft.vimMode)}
              type="button"
            >
              <span class="indicator">{draft.vimMode ? '[x]' : '[ ]'}</span>
              <span>Vim Navigation</span>
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="tui-btn-done" onclick={onClose} type="button">
          [ done ]
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    user-select: none;
  }

  .settings-modal {
    background-color: var(--bg-card);
    border: 1px solid var(--border);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
    border-radius: 0px;
    width: 480px;
    max-width: 95vw;
    font-family: var(--font-mono);
    color: var(--text-main);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    background-color: var(--bg-app);
  }

  .header-title {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .tui-bracket {
    color: var(--text-muted);
  }

  .tui-label {
    color: var(--accent);
    text-transform: uppercase;
  }

  .tui-btn-close {
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-muted);
    padding: 2px 6px;
    cursor: pointer;
    border-radius: 0px;
    display: flex;
    align-items: center;
  }

  .tui-btn-close:hover {
    background-color: var(--danger);
    color: #fff;
    border-color: var(--danger);
  }

  .modal-body {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-height: 75vh;
    overflow-y: auto;
  }

  .settings-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .group-name {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .value-badge {
    font-size: 11px;
    color: var(--accent);
    font-weight: 600;
  }

  .tui-btn-group {
    display: flex;
    gap: 6px;
  }

  .tui-btn-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .tui-toggle-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding-top: 4px;
  }

  .tui-option-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    font-size: 11.5px;
    font-family: var(--font-mono);
    color: var(--text-main);
    background-color: var(--bg-app);
    border: 1px solid var(--border);
    border-radius: 0px;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.1s ease, border-color 0.1s ease;
  }

  .full-width {
    width: 100%;
  }

  .tui-option-btn:hover {
    background-color: var(--bg-hover);
    border-color: var(--accent);
  }

  .tui-option-btn.selected {
    border-color: var(--accent);
    color: var(--text-bright);
    background-color: var(--accent-subtle);
  }

  .indicator {
    font-weight: 700;
    color: var(--accent);
    flex-shrink: 0;
  }

  .stepper-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: var(--bg-app);
    padding: 4px 8px;
    border: 1px solid var(--border);
  }

  .stepper-btn {
    background: transparent;
    border: none;
    color: var(--accent);
    font-family: var(--font-mono);
    font-weight: 700;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
  }

  .tui-range {
    flex: 1;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .modal-footer {
    padding: 8px 12px;
    border-top: 1px solid var(--border);
    background-color: var(--bg-app);
    display: flex;
    justify-content: flex-end;
  }

  .tui-btn-done {
    background-color: var(--accent);
    color: #09090b;
    border: 1px solid var(--accent);
    font-family: var(--font-mono);
    font-size: 11.5px;
    font-weight: 700;
    padding: 4px 14px;
    cursor: pointer;
    border-radius: 0px;
    transition: background-color 0.1s ease;
  }

  .tui-btn-done:hover {
    background-color: var(--accent-hover);
  }
</style>
