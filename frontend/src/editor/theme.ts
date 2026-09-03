import { EditorView } from '@codemirror/view';

export function createFontSizeTheme(sizePx: number) {
  return EditorView.theme({
    '&': {
      fontSize: `${sizePx}px`,
    },
  });
}

export const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '15px',
    color: '#e4e4e7', // zinc-200
    backgroundColor: '#18181b', // zinc-900
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  '.cm-content': {
    caretColor: '#38bdf8', // sky-400
    padding: '24px 32px',
    lineHeight: '1.75',
    maxWidth: '850px',
    margin: '0 auto',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#38bdf8',
    borderLeftWidth: '2px',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(56, 189, 248, 0.25) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'inherit',
  },
  // Headings
  '.cm-heading': {
    fontWeight: '700',
    color: '#fafafa',
  },
  '.cm-heading-1': {
    fontSize: '2em',
    lineHeight: '1.3',
    paddingBottom: '0.25em',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    marginBottom: '0.5em',
  },
  '.cm-heading-2': {
    fontSize: '1.6em',
    lineHeight: '1.35',
    paddingBottom: '0.2em',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    marginTop: '0.75em',
  },
  '.cm-heading-3': {
    fontSize: '1.3em',
    lineHeight: '1.4',
    marginTop: '0.5em',
  },
  '.cm-heading-4': {
    fontSize: '1.15em',
    color: '#d4d4d8',
  },
  '.cm-heading-5': {
    fontSize: '1em',
    color: '#a1a1aa',
  },
  '.cm-heading-6': {
    fontSize: '0.9em',
    color: '#71717a',
    textTransform: 'uppercase',
  },
  // Typography inline decorations
  '.cm-bold': {
    fontWeight: '700',
    color: '#f4f4f5',
  },
  '.cm-italic': {
    fontStyle: 'italic',
    color: '#e4e4e7',
  },
  '.cm-strikethrough': {
    textDecoration: 'line-through',
    color: '#71717a',
  },
  '.cm-inline-code': {
    backgroundColor: '#27272a',
    color: '#38bdf8',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '0.9em',
  },
  '.cm-blockquote-line': {
    borderLeft: '3px solid #38bdf8',
    paddingLeft: '14px',
    color: '#a1a1aa',
    fontStyle: 'italic',
  },
  '.cm-hr': {
    border: 'none',
    borderTop: '1px solid #3f3f46',
    margin: '16px 0',
  },
  '.cm-task-checkbox': {
    marginRight: '8px',
    cursor: 'pointer',
    accentColor: '#38bdf8',
    transform: 'scale(1.15)',
    verticalAlign: 'middle',
  },
  // Search Panel Styling
  '.cm-panels': {
    backgroundColor: '#18181b',
    color: '#e4e4e7',
    borderBottom: '1px solid #27272a',
  },
  '.cm-panels-top': {
    borderBottom: '1px solid #27272a',
  },
  '.cm-search': {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    fontFamily: 'inherit',
  },
  '.cm-search input': {
    backgroundColor: '#27272a',
    border: '1px solid #3f3f46',
    borderRadius: '4px',
    color: '#fafafa',
    padding: '4px 8px',
    fontSize: '13px',
    outline: 'none',
  },
  '.cm-search input:focus': {
    borderColor: '#38bdf8',
  },
  '.cm-search button': {
    backgroundColor: '#27272a',
    border: '1px solid #3f3f46',
    borderRadius: '4px',
    color: '#e4e4e7',
    padding: '4px 10px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  '.cm-search button:hover': {
    backgroundColor: '#3f3f46',
    color: '#fff',
  },
  '.cm-search label': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#a1a1aa',
    cursor: 'pointer',
  },
  // KaTeX Widgets
  '.cm-katex-inline': {
    display: 'inline-block',
    padding: '0 4px',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  '.cm-katex-block': {
    padding: '12px 16px',
    margin: '12px 0',
    backgroundColor: '#1f1f23',
    borderRadius: '8px',
    textAlign: 'center',
    cursor: 'pointer',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  '.cm-katex-error': {
    color: '#f87171',
    fontFamily: 'monospace',
  },
  // Mermaid Widgets
  '.cm-mermaid-container': {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px',
    margin: '12px 0',
    backgroundColor: '#1c1c20',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    cursor: 'pointer',
    overflowX: 'auto',
  },
  '.cm-mermaid-container svg': {
    maxWidth: '100%',
    height: 'auto',
  },
  '.cm-mermaid-error': {
    color: '#f87171',
    padding: '12px',
    borderRadius: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    fontFamily: 'monospace',
    fontSize: '0.85em',
  },
  '.cm-mermaid-error-title': {
    fontWeight: '600',
    marginBottom: '4px',
  },
});
