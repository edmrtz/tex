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
import { vim } from '@replit/codemirror-vim';
import { createLivePreviewPlugin } from './livePreview';
import {
  editorThemeDark,
  editorThemeLight,
  markdownHighlightStyleDark,
  markdownHighlightStyleLight,
  createFontTheme,
} from './theme';
import type { CursorPosition, EditorMode, AppSettings } from '../types';

export interface EditorCallbacks {
  onChange: (newContent: string) => void;
  onCursorChange: (pos: CursorPosition) => void;
  onSaveShortcut: () => void;
  onFindShortcut: () => void;
}

export function createMarkdownEditor(
  parent: HTMLElement,
  initialContent: string,
  mode: EditorMode,
  settings: AppSettings,
  callbacks: EditorCallbacks
) {
  const modeCompartment = new Compartment();
  const themeCompartment = new Compartment();
  const highlightCompartment = new Compartment();
  const fontCompartment = new Compartment();
  const lineNumbersCompartment = new Compartment();
  const vimCompartment = new Compartment();

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

  const customKeymap = keymap.of([
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
      vimCompartment.of(getVimExtension(settings.vimMode)),
      lineNumbersCompartment.of(getLineNumbersExtension(settings.lineNumbers)),
      modeCompartment.of(getModeExtension(mode)),
      themeCompartment.of(getThemeExtension(settings.theme)),
      highlightCompartment.of(getHighlightExtension(settings.theme)),
      fontCompartment.of(getFontExtension(settings)),
      updateListener,
      EditorView.lineWrapping,
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
        ],
      });
    },
    focus() {
      view.focus();
    },
    destroy() {
      view.destroy();
    },
  };
}
