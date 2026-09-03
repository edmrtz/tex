<script lang="ts">
  import type { AppSettings } from '../types';
  import { X, Moon, Sun, Type, Code, Hash, Terminal } from '@lucide/svelte';

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
          <h3>Preferences</h3>
          <span class="header-sub">Configure Tex appearance & editor settings</span>
        </div>
        <button class="close-btn" onclick={onClose} type="button" title="Close (Esc)">
          <X size={16} />
        </button>
      </div>

      <div class="modal-body">
        <!-- Section: Theme -->
        <div class="settings-group">
          <div class="group-label">
            <span class="label-icon"><Moon size={15} /></span>
            <span class="label-text">Color Theme</span>
          </div>
          <div class="segmented-control">
            <button
              class="seg-btn"
              class:active={draft.theme === 'dark'}
              onclick={() => update('theme', 'dark')}
              type="button"
            >
              <Moon size={13} />
              <span>Dark</span>
            </button>
            <button
              class="seg-btn"
              class:active={draft.theme === 'light'}
              onclick={() => update('theme', 'light')}
              type="button"
            >
              <Sun size={13} />
              <span>Light</span>
            </button>
          </div>
        </div>

        <!-- Section: UI Font -->
        <div class="settings-group">
          <div class="group-label">
            <span class="label-icon"><Type size={15} /></span>
            <span class="label-text">UI Font</span>
          </div>
          <select
            class="settings-select"
            value={draft.uiFont}
            onchange={(e) => update('uiFont', e.currentTarget.value as any)}
          >
            <option value="system">System Default</option>
            <option value="inter">Inter / Modern Sans</option>
            <option value="serif">Serif / Reading</option>
          </select>
        </div>

        <!-- Section: Code Font -->
        <div class="settings-group">
          <div class="group-label">
            <span class="label-icon"><Code size={15} /></span>
            <span class="label-text">Monospace / Code Font</span>
          </div>
          <select
            class="settings-select"
            value={draft.monoFont}
            onchange={(e) => update('monoFont', e.currentTarget.value as any)}
          >
            <option value="default">System Monospace</option>
            <option value="jetbrains">JetBrains Mono</option>
            <option value="fira">Fira Code</option>
            <option value="consolas">Consolas</option>
          </select>
        </div>

        <!-- Section: Font Size -->
        <div class="settings-group">
          <div class="group-label">
            <span class="label-text">Base Font Size</span>
          </div>
          <div class="stepper-wrapper">
            <input
              type="range"
              min="12"
              max="24"
              step="1"
              value={draft.fontSize}
              oninput={(e) => update('fontSize', Number(e.currentTarget.value))}
              class="range-input"
            />
            <span class="range-val">{draft.fontSize}px</span>
          </div>
        </div>

        <!-- Section: Line Numbers -->
        <div class="settings-group switch-row">
          <div class="group-label">
            <span class="label-icon"><Hash size={15} /></span>
            <div>
              <span class="label-text">Line Numbers</span>
              <span class="sub-desc">Display line numbering along editor gutter</span>
            </div>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              checked={draft.lineNumbers}
              onchange={(e) => update('lineNumbers', e.currentTarget.checked)}
            />
            <span class="slider"></span>
          </label>
        </div>

        <!-- Section: Vim Mode -->
        <div class="settings-group switch-row">
          <div class="group-label">
            <span class="label-icon"><Terminal size={15} /></span>
            <div>
              <span class="label-text">Vim Keybindings</span>
              <span class="sub-desc">Enable standard modal Vim navigation</span>
            </div>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              checked={draft.vimMode}
              onchange={(e) => update('vimMode', e.currentTarget.checked)}
            />
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <div class="modal-footer">
        <button class="done-btn" onclick={onClose} type="button">Done</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.15s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .settings-modal {
    width: 440px;
    max-width: 90vw;
    background-color: #18181b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .header-title h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #f4f4f5;
  }

  .header-sub {
    font-size: 12px;
    color: #71717a;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: #71717a;
    padding: 4px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: #f4f4f5;
  }

  .modal-body {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 65vh;
    overflow-y: auto;
  }

  .settings-group {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .switch-row {
    padding-top: 4px;
  }

  .group-label {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .label-icon {
    color: #38bdf8;
    display: flex;
    align-items: center;
  }

  .label-text {
    font-size: 13px;
    font-weight: 500;
    color: #e4e4e7;
    display: block;
  }

  .sub-desc {
    font-size: 11px;
    color: #71717a;
    display: block;
    margin-top: 1px;
  }

  /* Segmented control */
  .segmented-control {
    display: flex;
    background-color: #121215;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    padding: 2px;
    gap: 2px;
  }

  .seg-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    color: #a1a1aa;
    font-size: 12px;
    font-family: inherit;
    padding: 5px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.12s ease, color 0.12s ease;
  }

  .seg-btn.active {
    background-color: #27272a;
    color: #ffffff;
    font-weight: 500;
  }

  /* Select */
  .settings-select {
    background-color: #121215;
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #f4f4f5;
    font-size: 12px;
    font-family: inherit;
    padding: 6px 12px;
    border-radius: 6px;
    outline: none;
    cursor: pointer;
    min-width: 140px;
  }

  .settings-select:focus {
    border-color: rgba(56, 189, 248, 0.4);
  }

  /* Range stepper */
  .stepper-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .range-input {
    accent-color: #38bdf8;
    cursor: pointer;
    width: 110px;
  }

  .range-val {
    font-size: 12px;
    color: #a1a1aa;
    font-family: monospace;
    min-width: 32px;
  }

  /* Toggle switch */
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background-color: #27272a;
    border-radius: 20px;
    transition: 0.2s;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 14px;
    width: 14px;
    left: 2px;
    bottom: 2px;
    background-color: #a1a1aa;
    border-radius: 50%;
    transition: 0.2s;
  }

  input:checked + .slider {
    background-color: #0284c7;
    border-color: #38bdf8;
  }

  input:checked + .slider:before {
    transform: translateX(16px);
    background-color: #ffffff;
  }

  /* Footer */
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    padding: 12px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    background-color: #141416;
  }

  .done-btn {
    background-color: #38bdf8;
    color: #09090b;
    border: none;
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    padding: 6px 16px;
    border-radius: 6px;
    cursor: pointer;
    transition: opacity 0.12s ease;
  }

  .done-btn:hover {
    opacity: 0.9;
  }
</style>
