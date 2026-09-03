import {
  EditorState,
  Compartment,
  type Extension,
} from '@codemirror/state';
import {
  EditorView,
  keymap,
  highlightActiveLine,
  dropCursor,
  lineNumbers,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { search, highlightSelectionMatches } from '@codemirror/search';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting } from '@codemirror/language';
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { vim } from '@replit/codemirror-vim';
import { createLivePreviewPlugin } from './livePreview';
import {
  editorThemeDark,
  editorThemeLight,
  markdownHighlightStyleDark,
  markdownHighlightStyleLight,
  createFontTheme,
  createEditorWidthTheme,
} from './theme';
import type { CursorPosition, EditorMode, AppSettings } from '../types';

export interface EditorCallbacks {
  onChange: (newContent: string) => void;
  onCursorChange: (pos: CursorPosition) => void;
  onSaveShortcut: () => void;
  onFindShortcut: () => void;
  onPasteImage?: (file: File) => void;
  getWorkspaceFiles?: () => string[];
}

export function createMarkdownEditor(
  parent: HTMLElement,
  initialContent: string,
  mode: EditorMode,
  settings: AppSettings,
  callbacks: EditorCallbacks,
  readOnly: boolean = false
) {
  const modeCompartment = new Compartment();
  const themeCompartment = new Compartment();
  const highlightCompartment = new Compartment();
  const fontCompartment = new Compartment();
  const lineNumbersCompartment = new Compartment();
  const vimCompartment = new Compartment();
  const widthCompartment = new Compartment();

  function getModeExtension(m: EditorMode): Extension {
    return m === 'live' ? [createLivePreviewPlugin()] : [];
  }

  function getThemeExtension(t: 'dark' | 'light'): Extension {
    return t === 'light' ? editorThemeLight : editorThemeDark;
  }

  function getHighlightExtension(t: 'dark' | 'light'): Extension {
    return syntaxHighlighting(
      t === 'light' ? markdownHighlightStyleLight : markdownHighlightStyleDark,
      { fallback: true }
    );
  }

  function getFontExtension(s: AppSettings): Extension {
    return createFontTheme(s.fontSize, s.uiFont, s.monoFont);
  }

  function getWidthExtension(w: 'full' | 'wide' | 'centered' = 'full'): Extension {
    return createEditorWidthTheme(w);
  }

  function getLineNumbersExtension(enabled: boolean): Extension {
    return enabled ? lineNumbers() : [];
  }

  function getVimExtension(enabled: boolean): Extension {
    return enabled ? vim() : [];
  }

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      callbacks.onChange(update.state.doc.toString());
    }

    if (update.selectionSet || update.docChanged) {
      const { head } = update.state.selection.main;
      const line = update.state.doc.lineAt(head);
      const col = head - line.from + 1;
      const fullText = update.state.doc.toString();
      const wordCount = (fullText.match(/\S+/g) || []).length;
      const charCount = fullText.length;

      callbacks.onCursorChange({
        line: line.number,
        col,
        wordCount,
        charCount,
      });
    }
  });

  function handleListEnter(v: EditorView): boolean {
    const { state } = v;
    const { main } = state.selection;
    if (!main.empty) return false;

    const line = state.doc.lineAt(main.head);
    const text = line.text;

    // Checklists: e.g. - [ ] or - [x]
    const checkMatch = text.match(/^(\s*)([-*+]\s+\[[ xX]\]\s+)(.*)$/);
    if (checkMatch) {
      const [_, indent, prefix, rest] = checkMatch;
      if (rest.trim() === '') {
        v.dispatch({
          changes: { from: line.from, to: line.to, insert: '' },
        });
        return true;
      }
      const nextPrefix = '\n' + indent + '- [ ] ';
      v.dispatch({
        changes: { from: main.head, insert: nextPrefix },
        selection: { anchor: main.head + nextPrefix.length },
      });
      return true;
    }

    // Bullet lists: - , * , +
    const bulletMatch = text.match(/^(\s*)([-*+]\s+)(.*)$/);
    if (bulletMatch) {
      const [_, indent, prefix, rest] = bulletMatch;
      if (rest.trim() === '') {
        v.dispatch({
          changes: { from: line.from, to: line.to, insert: '' },
        });
        return true;
      }
      const nextPrefix = '\n' + indent + prefix;
      v.dispatch({
        changes: { from: main.head, insert: nextPrefix },
        selection: { anchor: main.head + nextPrefix.length },
      });
      return true;
    }

    // Numbered lists: 1. , 2.
    const numMatch = text.match(/^(\s*)(\d+)(\.\s+)(.*)$/);
    if (numMatch) {
      const [_, indent, numStr, sep, rest] = numMatch;
      if (rest.trim() === '') {
        v.dispatch({
          changes: { from: line.from, to: line.to, insert: '' },
        });
        return true;
      }
      const nextNum = parseInt(numStr, 10) + 1;
      const nextPrefix = '\n' + indent + `${nextNum}${sep}`;
      v.dispatch({
        changes: { from: main.head, insert: nextPrefix },
        selection: { anchor: main.head + nextPrefix.length },
      });
      return true;
    }

    return false;
  }

  function handleListTab(v: EditorView, isShift: boolean): boolean {
    const { state } = v;
    const { main } = state.selection;
    const line = state.doc.lineAt(main.head);
    const text = line.text;
    if (/^\s*([*+-]|\d+\.)\s+/.test(text)) {
      if (isShift) {
        if (text.startsWith('  ')) {
          v.dispatch({
            changes: { from: line.from, to: line.from + 2, insert: '' },
          });
          return true;
        } else if (text.startsWith(' ')) {
          v.dispatch({
            changes: { from: line.from, to: line.from + 1, insert: '' },
          });
          return true;
        }
      } else {
        v.dispatch({
          changes: { from: line.from, insert: '  ' },
        });
        return true;
      }
    }
    return false;
  }

  const customKeymap = keymap.of([
    {
      key: 'Enter',
      run: (v) => handleListEnter(v),
    },
    {
      key: 'Tab',
      run: (v) => handleListTab(v, false),
    },
    {
      key: 'Shift-Tab',
      run: (v) => handleListTab(v, true),
    },
    indentWithTab,
    {
      key: 'Mod-s',
      run: () => {
        callbacks.onSaveShortcut();
        return true;
      },
    },
    {
      key: 'Mod-f',
      run: () => {
        callbacks.onFindShortcut();
        return true;
      },
    },
  ]);

  const wikiAutocomplete = autocompletion({
    override: [
      (context: CompletionContext): CompletionResult | null => {
        const word = context.matchBefore(/\[\[([^\]]*)/);
        if (!word) return null;
        const query = word.text.slice(2).toLowerCase();
        const files = callbacks.getWorkspaceFiles ? callbacks.getWorkspaceFiles() : [];
        return {
          from: word.from + 2,
          options: files.map((file) => {
            const clean = file.replace(/\.md$/i, '');
            return {
              label: clean,
              type: 'text',
              apply: `${clean}]]`,
            };
          }).filter((opt) => opt.label.toLowerCase().includes(query)),
        };
      },
    ],
  });

  const domEventHandlers = EditorView.domEventHandlers({
    paste(event, view) {
      const items = event.clipboardData?.items;
      if (!items) return false;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            event.preventDefault();
            callbacks.onPasteImage?.(file);
            return true;
          }
        }
      }
      return false;
    },
    drop(event, view) {
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return false;
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          event.preventDefault();
          callbacks.onPasteImage?.(files[i]);
          return true;
        }
      }
      return false;
    },
  });

  const state = EditorState.create({
    doc: initialContent,
    extensions: [
      history(),
      dropCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      search({ top: true }),
      customKeymap,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
        addKeymap: true,
      }),
      wikiAutocomplete,
      domEventHandlers,
      vimCompartment.of(getVimExtension(settings.vimMode)),
      lineNumbersCompartment.of(getLineNumbersExtension(settings.lineNumbers)),
      widthCompartment.of(getWidthExtension(settings.editorWidth)),
      modeCompartment.of(getModeExtension(mode)),
      themeCompartment.of(getThemeExtension(settings.theme)),
      highlightCompartment.of(getHighlightExtension(settings.theme)),
      fontCompartment.of(getFontExtension(settings)),
      updateListener,
      EditorView.lineWrapping,
      readOnly ? EditorState.readOnly.of(true) : [],
    ],
  });

  const view = new EditorView({
    state,
    parent,
  });

  return {
    view,
    setContent(content: string) {
      if (view.state.doc.toString() !== content) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: content },
        });
      }
    },
    setMode(newMode: EditorMode) {
      view.dispatch({
        effects: modeCompartment.reconfigure(getModeExtension(newMode)),
      });
    },
    applySettings(newSettings: AppSettings) {
      view.dispatch({
        effects: [
          themeCompartment.reconfigure(getThemeExtension(newSettings.theme)),
          highlightCompartment.reconfigure(getHighlightExtension(newSettings.theme)),
          fontCompartment.reconfigure(getFontExtension(newSettings)),
          lineNumbersCompartment.reconfigure(getLineNumbersExtension(newSettings.lineNumbers)),
          vimCompartment.reconfigure(getVimExtension(newSettings.vimMode)),
          widthCompartment.reconfigure(getWidthExtension(newSettings.editorWidth)),
        ],
      });
    },
    focus() {
      view.focus();
    },
    insertTextAtCursor(text: string) {
      const { main } = view.state.selection;
      view.dispatch({
        changes: { from: main.from, to: main.to, insert: text },
        selection: { anchor: main.from + text.length },
      });
      view.focus();
    },
    destroy() {
      view.destroy();
    },
  };
}
