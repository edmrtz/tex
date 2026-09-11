<script lang="ts">
  import type { AppSettings } from '../types';
  import { X, RotateCcw } from '@lucide/svelte';
  import { GetSystemFonts } from '../../wailsjs/go/main/App';

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

  let activeTab = $state<'editor' | 'keybinds'>('editor');
  let draft = $state<AppSettings>({ ...settings });
  let recordingKey = $state<string | null>(null);
  let systemFonts = $state<string[]>([]);

  $effect(() => {
    if (isOpen) {
      draft = { ...settings };
      recordingKey = null;
      if (systemFonts.length === 0) {
        GetSystemFonts()
          .then((fonts) => {
            if (fonts && fonts.length > 0) {
              systemFonts = fonts;
            }
          })
          .catch((err) => {
            console.error('Failed to load system fonts:', err);
          });
      }
    }
  });

  const availableSystemFonts = $derived.by(() => {
    const set = new Set(systemFonts);
    set.add('System UI');
    if (draft.systemFont) set.add(draft.systemFont);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  const availableEditorFonts = $derived.by(() => {
    const set = new Set(systemFonts);
    set.add('DM Mono');
    if (draft.editorFont) set.add(draft.editorFont);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    draft[key] = value;
    onSave({ ...draft });
  }

  export interface KeybindDef {
    id: string;
    label: string;
    defaultKey: string;
  }

  const KEYBIND_DEFS: KeybindDef[] = [
    { id: 'save', label: 'Save Note', defaultKey: 'Ctrl+S' },
    { id: 'quickSwitcher', label: 'Quick Switcher (Find)', defaultKey: 'Ctrl+P' },
    { id: 'toggleSidebar', label: 'Toggle Sidebar', defaultKey: 'Ctrl+B' },
    { id: 'toggleMode', label: 'Toggle Mode (Live/Raw)', defaultKey: 'Ctrl+\\' },
    { id: 'newNote', label: 'New Note', defaultKey: 'Ctrl+N' },
    { id: 'openFile', label: 'Open File', defaultKey: 'Ctrl+O' },
    { id: 'openFolder', label: 'Open Folder', defaultKey: 'Ctrl+Shift+O' },
    { id: 'saveAs', label: 'Save As...', defaultKey: 'Ctrl+Shift+S' },
    { id: 'exportHtml', label: 'Export Document (HTML)', defaultKey: 'Ctrl+Shift+E' },
    { id: 'findReplace', label: 'Find & Replace', defaultKey: 'Ctrl+F' },
    { id: 'preferences', label: 'Open Preferences', defaultKey: 'Ctrl+,' },
    { id: 'closeNote', label: 'Close Active Note', defaultKey: 'Ctrl+W' },
  ];

  function getKeybindValue(id: string, defaultKey: string): string {
    if (draft.keybinds && draft.keybinds[id]) {
      return draft.keybinds[id];
    }
    return defaultKey;
  }

  function startRecording(id: string) {
    recordingKey = id;
  }

  function resetAllKeybinds() {
    update('keybinds', {});
    recordingKey = null;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (recordingKey) {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        recordingKey = null;
        return;
      }

      // Modifier-only press: wait for final key
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        return;
      }

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');

      let mainKey = e.key;
      if (mainKey.length === 1) {
        mainKey = mainKey.toUpperCase();
      }
      parts.push(mainKey);

      const combo = parts.join('+');
      const nextKeybinds = { ...(draft.keybinds || {}) };
      nextKeybinds[recordingKey] = combo;
      update('keybinds', nextKeybinds);
      recordingKey = null;
      return;
    }

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
          <span class="tui-label">Preferences</span>
        </div>
        <button class="tui-btn-close" onclick={onClose} type="button" title="Close (Esc)">
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      <!-- Navigation Tabs for Clean UX -->
      <div class="settings-tabs">
        <button
          class="tab-btn"
          class:active={activeTab === 'editor'}
          onclick={() => { activeTab = 'editor'; recordingKey = null; }}
          type="button"
        >
          <span>[Editor & Appearance]</span>
        </button>
        <button
          class="tab-btn"
          class:active={activeTab === 'keybinds'}
          onclick={() => { activeTab = 'keybinds'; recordingKey = null; }}
          type="button"
        >
          <span>[Keybindings]</span>
        </button>
      </div>

      <div class="modal-body">
        {#if activeTab === 'editor'}
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
                <span>Light (snow)</span>
              </button>
            </div>
          </div>

          <!-- Section: System UI Font -->
          <div class="settings-group">
            <div class="group-header">
              <span class="group-name">System UI Font</span>
              <span class="scope-hint">Sidebar, top bar, file title, tags, modals</span>
            </div>
            <div class="tui-select-wrapper">
              <select
                class="tui-select"
                value={draft.systemFont}
                onchange={(e) => update('systemFont', e.currentTarget.value)}
              >
                {#each availableSystemFonts as font}
                  <option value={font}>{font}</option>
                {/each}
              </select>
            </div>
          </div>

          <!-- Section: Editor UI Font -->
          <div class="settings-group">
            <div class="group-header">
              <span class="group-name">Editor UI Font</span>
              <span class="scope-hint">Markdown editor (raw mode)</span>
            </div>
            <div class="tui-select-wrapper">
              <select
                class="tui-select"
                value={draft.editorFont}
                onchange={(e) => update('editorFont', e.currentTarget.value)}
              >
                {#each availableEditorFonts as font}
                  <option value={font}>{font}</option>
                {/each}
              </select>
            </div>
          </div>

          <!-- Section: Font Size -->
          <div class="settings-group">
            <div class="group-header">
              <span class="group-name">Editor Font Size</span>
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
                max="28"
                step="1"
                value={draft.fontSize}
                oninput={(e) => update('fontSize', Number(e.currentTarget.value))}
                class="tui-range"
              />
              <button
                class="stepper-btn"
                onclick={() => update('fontSize', Math.min(36, draft.fontSize + 1))}
                type="button"
              >
                +
              </button>
            </div>
          </div>

          <!-- Section: Editor Line Width -->
          <div class="settings-group">
            <div class="group-header">
              <span class="group-name">Editor Width</span>
            </div>
            <div class="tui-btn-group">
              <button
                class="tui-option-btn"
                class:selected={draft.editorWidth === 'full'}
                onclick={() => update('editorWidth', 'full')}
                type="button"
              >
                <span class="indicator">{draft.editorWidth === 'full' ? '[x]' : '[ ]'}</span>
                <span>Full</span>
              </button>
              <button
                class="tui-option-btn"
                class:selected={draft.editorWidth === 'wide'}
                onclick={() => update('editorWidth', 'wide')}
                type="button"
              >
                <span class="indicator">{draft.editorWidth === 'wide' ? '[x]' : '[ ]'}</span>
                <span>Wide (960px)</span>
              </button>
              <button
                class="tui-option-btn"
                class:selected={draft.editorWidth === 'centered'}
                onclick={() => update('editorWidth', 'centered')}
                type="button"
              >
                <span class="indicator">{draft.editorWidth === 'centered' ? '[x]' : '[ ]'}</span>
                <span>Centered (720px)</span>
              </button>
            </div>
          </div>
        {:else}
          <!-- Section: Keybindings Panel -->
          <div class="keybinds-panel">
            <div class="keybinds-header">
              <span class="group-name">Custom Keybindings</span>
              <button class="tui-reset-btn" onclick={resetAllKeybinds} type="button" title="Reset all shortcuts to defaults">
                <RotateCcw size={11} strokeWidth={1.5} />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div class="keybinds-hint">
              Click any shortcut badge below, then press your new key combination. (Esc to cancel)
            </div>

            <div class="keybinds-list">
              {#each KEYBIND_DEFS as kb}
                {@const isRecordingThis = recordingKey === kb.id}
                {@const currentCombo = getKeybindValue(kb.id, kb.defaultKey)}
                <div class="keybind-row">
                  <span class="keybind-label">{kb.label}</span>
                  <button
                    class="keybind-badge-btn"
                    class:recording={isRecordingThis}
                    onclick={() => startRecording(kb.id)}
                    type="button"
                    title={isRecordingThis ? 'Press keys now...' : 'Click to change shortcut'}
                  >
                    {#if isRecordingThis}
                      <span class="recording-text">Press key...</span>
                    {:else}
                      <span class="combo-text">[{currentCombo}]</span>
                    {/if}
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}
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
    background-color: rgba(0, 0, 0, 0.7);
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
    width: 520px;
    max-width: 95vw;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: settingsModalPop 0.16s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform, opacity;
  }

  @keyframes settingsBackdropFade {
    from { opacity: 0; }
    to { opacity: 1; }
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
    font-size: 11px;
    font-weight: 700;
    font-family: var(--font-mono);
  }

  .tui-label {
    color: var(--accent);
    text-transform: uppercase;
  }

  .tui-btn-close {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    transition: color 0.1s ease;
  }

  .tui-btn-close:hover {
    color: var(--text-bright);
  }

  /* Navigation Tabs */
  .settings-tabs {
    display: flex;
    border-bottom: 1px solid var(--border);
    background-color: var(--bg-app);
  }

  .tab-btn {
    flex: 1;
    padding: 6px 12px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.12s ease, border-color 0.12s ease;
    text-align: center;
  }

  .tab-btn:hover {
    color: var(--text-bright);
  }

  .tab-btn.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    background-color: var(--bg-hover);
  }

  .modal-body {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-height: 65vh;
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
    font-family: var(--font-mono);
  }

  .scope-hint {
    font-size: 10px;
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-style: italic;
  }

  .value-badge {
    font-size: 11px;
    color: var(--accent);
    font-weight: 600;
    font-family: var(--font-mono);
  }

  .tui-btn-group {
    display: flex;
    gap: 6px;
  }

  .tui-select-wrapper {
    width: 100%;
  }

  .tui-select {
    width: 100%;
    background-color: var(--bg-app);
    border: 1px solid var(--border);
    color: var(--text-main);
    font-family: var(--font-ui, var(--font-mono));
    font-size: 12px;
    padding: 7px 10px;
    border-radius: 0px;
    outline: none;
    cursor: pointer;
    transition: border-color 0.12s ease;
  }

  .tui-select:focus {
    border-color: var(--accent);
  }

  .tui-select option {
    background-color: var(--bg-card);
    color: var(--text-main);
  }

  .tui-option-btn {
    flex: 1;
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
    transition: background-color 0.12s ease, border-color 0.12s ease;
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
    color: var(--accent);
    font-weight: 700;
  }

  .stepper-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .stepper-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-app);
    border: 1px solid var(--border);
    border-radius: 0px;
    color: var(--text-bright);
    font-family: var(--font-mono);
    font-size: 14px;
    cursor: pointer;
    user-select: none;
    transition: border-color 0.1s ease, color 0.1s ease;
  }

  .stepper-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .tui-range {
    flex: 1;
    accent-color: var(--accent);
    cursor: pointer;
  }

  /* Keybinds Panel */
  .keybinds-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .keybinds-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .tui-reset-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 0px;
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 3px 7px;
    cursor: pointer;
    transition: all 0.12s ease;
  }

  .tui-reset-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .keybinds-hint {
    font-size: 10.5px;
    color: var(--text-muted);
    font-family: var(--font-mono);
    line-height: 1.4;
  }

  .keybinds-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    border: 1px solid var(--border);
    background-color: var(--bg-app);
    padding: 4px;
  }

  .keybind-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 8px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .keybind-row:last-child {
    border-bottom: none;
  }

  .keybind-label {
    font-size: 11px;
    color: var(--text-main);
    font-family: var(--font-mono);
  }

  .keybind-badge-btn {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0px;
    padding: 3px 8px;
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    color: var(--accent);
    transition: all 0.12s ease;
  }

  .keybind-badge-btn:hover {
    background: var(--bg-hover);
    border-color: var(--accent);
  }

  .keybind-badge-btn.recording {
    background: var(--accent);
    color: #09090b;
    border-color: var(--accent);
    animation: pulse 1s infinite alternate;
  }

  @keyframes pulse {
    from { opacity: 0.8; }
    to { opacity: 1; }
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
    transition: background-color 0.12s ease;
  }

  .tui-btn-done:hover {
    background-color: var(--accent-hover);
  }

  @media (prefers-reduced-motion: reduce) {
    .modal-backdrop,
    .settings-modal {
      animation: none !important;
    }
    .tui-option-btn,
    .tui-btn-done,
    .stepper-btn,
    .tab-btn {
      transition: none !important;
    }
  }
</style>
