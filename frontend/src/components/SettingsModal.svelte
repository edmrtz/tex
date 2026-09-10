<script lang="ts">
  import type { AppSettings } from '../types';
  import { X } from '@lucide/svelte';

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

  const HEADING_COLORS = [
    { label: 'Default', value: 'default', color: '#38bdf8' },
    { label: 'Sky', value: '#38bdf8', color: '#38bdf8' },
    { label: 'Emerald', value: '#34d399', color: '#34d399' },
    { label: 'Amber', value: '#fbbf24', color: '#fbbf24' },
    { label: 'Rose', value: '#f472b6', color: '#f472b6' },
    { label: 'Purple', value: '#c084fc', color: '#c084fc' },
  ];

  const TEXT_COLORS = [
    { label: 'Default', value: 'default', color: '#e4e4e7' },
    { label: 'Soft White', value: '#ffffff', color: '#ffffff' },
    { label: 'Light Gray', value: '#d4d4d8', color: '#d4d4d8' },
    { label: 'Amber', value: '#fde68a', color: '#fde68a' },
    { label: 'Cyan', value: '#a5f3fc', color: '#a5f3fc' },
    { label: 'Green', value: '#bbf7d0', color: '#bbf7d0' },
  ];
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
          <span class="tui-label">Preferences</span>
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

        <!-- Section: Editor Width -->
        <div class="settings-group">
          <div class="group-header">
            <span class="group-name">Editor Layout / Width</span>
          </div>
          <div class="tui-btn-group">
            <button
              class="tui-option-btn"
              class:selected={draft.editorWidth === 'full'}
              onclick={() => update('editorWidth', 'full')}
              type="button"
            >
              <span class="indicator">{draft.editorWidth === 'full' ? '[x]' : '[ ]'}</span>
              <span>Full Width</span>
            </button>
            <button
              class="tui-option-btn"
              class:selected={draft.editorWidth === 'wide'}
              onclick={() => update('editorWidth', 'wide')}
              type="button"
            >
              <span class="indicator">{draft.editorWidth === 'wide' ? '[x]' : '[ ]'}</span>
              <span>Wide (1200px)</span>
            </button>
            <button
              class="tui-option-btn"
              class:selected={draft.editorWidth === 'centered'}
              onclick={() => update('editorWidth', 'centered')}
              type="button"
            >
              <span class="indicator">{draft.editorWidth === 'centered' ? '[x]' : '[ ]'}</span>
              <span>Centered (860px)</span>
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
              -
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
              +
            </button>
          </div>
        </div>
        <!-- Section: Heading Color -->
        <div class="settings-group">
          <div class="group-header">
            <span class="group-name">Heading Color</span>
            <span class="value-badge">{draft.headingColor || 'default'}</span>
          </div>
          <div class="tui-color-grid">
            {#each HEADING_COLORS as c}
              <button
                class="tui-color-btn"
                class:selected={(draft.headingColor || 'default') === c.value}
                onclick={() => update('headingColor', c.value)}
                type="button"
              >
                <span class="color-dot" style="background-color: {c.color};"></span>
                <span>{c.label}</span>
              </button>
            {/each}
            <div class="custom-color-item">
              <label class="custom-color-label" title="Custom color picker">
                <input
                  type="color"
                  class="native-color-picker"
                  value={draft.headingColor && draft.headingColor !== 'default' ? draft.headingColor : '#38bdf8'}
                  oninput={(e) => update('headingColor', e.currentTarget.value)}
                />
                <span>Custom</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Section: Normal Text Color -->
        <div class="settings-group">
          <div class="group-header">
            <span class="group-name">Normal Text Color</span>
            <span class="value-badge">{draft.textColor || 'default'}</span>
          </div>
          <div class="tui-color-grid">
            {#each TEXT_COLORS as c}
              <button
                class="tui-color-btn"
                class:selected={(draft.textColor || 'default') === c.value}
                onclick={() => update('textColor', c.value)}
                type="button"
              >
                <span class="color-dot" style="background-color: {c.color};"></span>
                <span>{c.label}</span>
              </button>
            {/each}
            <div class="custom-color-item">
              <label class="custom-color-label" title="Custom color picker">
                <input
                  type="color"
                  class="native-color-picker"
                  value={draft.textColor && draft.textColor !== 'default' ? draft.textColor : '#e4e4e7'}
                  oninput={(e) => update('textColor', e.currentTarget.value)}
                />
                <span>Custom</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Section: Vim Navigation -->
        <div class="tui-toggle-row">
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
          Done
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
    animation: settingsBackdropFade 0.15s ease-out;
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
    animation: settingsModalPop 0.16s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform, opacity;
  }

  @keyframes settingsBackdropFade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes settingsModalPop {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
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
    grid-template-columns: 1fr;
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
    transition: background-color 0.12s ease, border-color 0.12s ease, transform 0.08s ease;
  }

  .tui-option-btn:active {
    transform: scale(0.98);
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
    transition: transform 0.08s ease, color 0.1s ease;
  }

  .stepper-btn:active {
    transform: scale(0.92);
  }

  .tui-range {
    flex: 1;
    accent-color: var(--accent);
    cursor: pointer;
  }
  .tui-color-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .tui-color-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--text-main);
    background-color: var(--bg-app);
    border: 1px solid var(--border);
    border-radius: 0px;
    cursor: pointer;
    transition: background-color 0.12s ease, border-color 0.12s ease;
  }

  .tui-color-btn:hover {
    background-color: var(--bg-hover);
    border-color: var(--accent);
  }

  .tui-color-btn.selected {
    border-color: var(--accent);
    color: var(--text-bright);
    background-color: var(--accent-subtle);
  }

  .color-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .custom-color-item {
    display: flex;
  }

  .custom-color-label {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 4px 8px;
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--text-muted);
    background-color: var(--bg-app);
    border: 1px solid var(--border);
    border-radius: 0px;
    cursor: pointer;
  }

  .custom-color-label:hover {
    border-color: var(--accent);
    color: var(--text-bright);
  }

  .native-color-picker {
    width: 16px;
    height: 16px;
    padding: 0;
    border: none;
    background: transparent;
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
    transition: background-color 0.12s ease, transform 0.08s ease;
  }

  .tui-btn-done:hover {
    background-color: var(--accent-hover);
  }

  .tui-btn-done:active {
    transform: scale(0.97);
  }

  @media (prefers-reduced-motion: reduce) {
    .modal-backdrop,
    .settings-modal {
      animation: none !important;
    }
    .tui-option-btn,
    .tui-btn-done,
    .stepper-btn {
      transition: none !important;
    }
  }
</style>
