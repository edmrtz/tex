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
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { search, searchKeymap, openSearchPanel } from '@codemirror/search';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { createLivePreviewPlugin } from './livePreview';
import { editorTheme, createFontSizeTheme } from './theme';
import type { CursorPosition, EditorMode } from '../types';

export interface EditorCallbacks {
  onChange: (newContent: string) => void;
  onCursorChange: (pos: CursorPosition) => void;
  onSaveShortcut: () => void;
}

export function createMarkdownEditor(
  parent: HTMLElement,
  initialContent: string,
  mode: EditorMode,
  initialFontSize: number,
  callbacks: EditorCallbacks
) {
  const modeCompartment = new Compartment();
  const fontSizeCompartment = new Compartment();

  function getModeExtension(m: EditorMode): Extension {
    return m === 'live' ? [createLivePreviewPlugin()] : [];
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
    ...searchKeymap,
  ]);

  const state = EditorState.create({
    doc: initialContent,
    extensions: [
      history(),
      dropCursor(),
      highlightActiveLine(),
      search({ top: true }),
      customKeymap,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
        addKeymap: true,
      }),
      modeCompartment.of(getModeExtension(mode)),
      fontSizeCompartment.of(createFontSizeTheme(initialFontSize)),
      editorTheme,
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
    setFontSize(sizePx: number) {
      view.dispatch({
        effects: fontSizeCompartment.reconfigure(createFontSizeTheme(sizePx)),
      });
    },
    openSearch() {
      openSearchPanel(view);
    },
    focus() {
      view.focus();
    },
    destroy() {
      view.destroy();
    },
  };
}
