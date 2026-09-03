import { EditorView } from '@codemirror/view';
import { HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

export function getUiFontFamily(fontKey: string): string {
  switch (fontKey) {
    case 'inter':
      return '"Inter", system-ui, -apple-system, sans-serif';
    case 'serif':
      return '"Georgia", Cambria, "Times New Roman", serif';
    case 'system':
    default:
      return 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  }
}

export function getMonoFontFamily(fontKey: string): string {
  switch (fontKey) {
    case 'jetbrains':
      return '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
    case 'fira':
      return '"Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace';
    case 'consolas':
      return '"Consolas", "Courier New", monospace';
    case 'default':
    default:
      return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  }
}

export function createFontTheme(fontSizePx: number, uiFontKey: string, monoFontKey: string) {
  const uiFont = getUiFontFamily(uiFontKey);
  const monoFont = getMonoFontFamily(monoFontKey);
  return EditorView.theme({
    '&': {
      fontSize: `${fontSizePx}px`,
      fontFamily: uiFont,
    },
    '.cm-codeblock-line, .cm-inline-code': {
      fontFamily: monoFont,
    },
  });
}

// Backward compatibility alias
export const createFontSizeTheme = (sizePx: number) => createFontTheme(sizePx, 'system', 'default');

export const editorThemeDark = EditorView.theme({
  '&': {
    height: '100%',
    color: '#e4e4e7',
    backgroundColor: '#18181b',
  },
  '.cm-content': {
    caretColor: '#38bdf8',
    padding: '28px 36px',
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
  '.cm-gutters': {
    backgroundColor: '#141416',
    color: '#52525b',
    border: 'none',
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: '#38bdf8',
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
  // Inline typography
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
    fontSize: '0.9em',
  },
  // Fenced Code Blocks
  '.cm-codeblock-header': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121215',
    padding: '4px 14px',
    borderTopLeftRadius: '6px',
    borderTopRightRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderBottom: 'none',
    marginTop: '12px',
  },
  '.cm-codeblock-lang': {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.06em',
    color: '#71717a',
    textTransform: 'uppercase',
  },
  '.cm-codeblock-line': {
    backgroundColor: '#161619',
    fontSize: '0.9em',
    paddingLeft: '16px',
    paddingRight: '16px',
    lineHeight: '1.6',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
  },
  '.cm-codeblock-line-last': {
    borderBottomLeftRadius: '6px',
    borderBottomRightRadius: '6px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '6px',
    marginBottom: '12px',
  },
  '.cm-codeblock-fence': {
    color: '#52525b',
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
  // Math containers
  '.cm-math-container': {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px 0',
    margin: '8px 0',
    backgroundColor: '#1a1a1e',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    cursor: 'pointer',
    overflowX: 'auto',
    transition: 'border-color 0.15s ease',
  },
  '.cm-math-container:hover': {
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  '.cm-math-inline': {
    cursor: 'pointer',
    padding: '1px 3px',
    borderRadius: '3px',
    transition: 'background-color 0.15s ease',
  },
  '.cm-math-inline:hover': {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  // Mermaid containers
  '.cm-mermaid-container': {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px 16px',
    margin: '12px 0',
    backgroundColor: '#1a1a1e',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    cursor: 'pointer',
    overflowX: 'auto',
    minHeight: '60px',
    transition: 'border-color 0.15s ease',
  },
  '.cm-mermaid-container:hover': {
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  '.cm-mermaid-container svg': {
    maxWidth: '100%',
    height: 'auto',
  },
  '.cm-mermaid-placeholder': {
    color: '#71717a',
    fontStyle: 'italic',
    fontSize: '13px',
  },
  '.cm-mermaid-error': {
    color: '#f87171',
    padding: '12px',
    borderRadius: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    fontSize: '13px',
    width: '100%',
  },
  '.cm-mermaid-error-title': {
    fontWeight: '600',
    marginBottom: '4px',
  },
  '.cm-mermaid-error pre': {
    margin: 0,
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#fca5a5',
  },
});

export const editorThemeLight = EditorView.theme({
  '&': {
    height: '100%',
    color: '#18181b',
    backgroundColor: '#ffffff',
  },
  '.cm-content': {
    caretColor: '#0284c7',
    padding: '28px 36px',
    lineHeight: '1.75',
    maxWidth: '850px',
    margin: '0 auto',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#0284c7',
    borderLeftWidth: '2px',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(2, 132, 199, 0.2) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(0, 0, 0, 0.025)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'inherit',
  },
  '.cm-gutters': {
    backgroundColor: '#f8fafc',
    color: '#94a3b8',
    border: 'none',
    borderRight: '1px solid rgba(0, 0, 0, 0.06)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: '#0284c7',
  },
  // Headings
  '.cm-heading': {
    fontWeight: '700',
    color: '#09090b',
  },
  '.cm-heading-1': {
    fontSize: '2em',
    lineHeight: '1.3',
    paddingBottom: '0.25em',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    marginBottom: '0.5em',
  },
  '.cm-heading-2': {
    fontSize: '1.6em',
    lineHeight: '1.35',
    paddingBottom: '0.2em',
    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
    marginTop: '0.75em',
  },
  '.cm-heading-3': {
    fontSize: '1.3em',
    lineHeight: '1.4',
    marginTop: '0.5em',
  },
  '.cm-heading-4': {
    fontSize: '1.15em',
    color: '#27272a',
  },
  '.cm-heading-5': {
    fontSize: '1em',
    color: '#52525b',
  },
  '.cm-heading-6': {
    fontSize: '0.9em',
    color: '#71717a',
    textTransform: 'uppercase',
  },
  // Inline typography
  '.cm-bold': {
    fontWeight: '700',
    color: '#09090b',
  },
  '.cm-italic': {
    fontStyle: 'italic',
    color: '#27272a',
  },
  '.cm-strikethrough': {
    textDecoration: 'line-through',
    color: '#a1a1aa',
  },
  '.cm-inline-code': {
    backgroundColor: '#f1f5f9',
    color: '#0284c7',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.9em',
  },
  // Fenced Code Blocks
  '.cm-codeblock-header': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    padding: '4px 14px',
    borderTopLeftRadius: '6px',
    borderTopRightRadius: '6px',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    borderBottom: 'none',
    marginTop: '12px',
  },
  '.cm-codeblock-lang': {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.06em',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  '.cm-codeblock-line': {
    backgroundColor: '#f8fafc',
    fontSize: '0.9em',
    paddingLeft: '16px',
    paddingRight: '16px',
    lineHeight: '1.6',
    borderLeft: '1px solid rgba(0, 0, 0, 0.08)',
    borderRight: '1px solid rgba(0, 0, 0, 0.08)',
  },
  '.cm-codeblock-line-last': {
    borderBottomLeftRadius: '6px',
    borderBottomRightRadius: '6px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
    paddingBottom: '6px',
    marginBottom: '12px',
  },
  '.cm-codeblock-fence': {
    color: '#94a3b8',
  },
  '.cm-blockquote-line': {
    borderLeft: '3px solid #0284c7',
    paddingLeft: '14px',
    color: '#475569',
    fontStyle: 'italic',
  },
  '.cm-hr': {
    border: 'none',
    borderTop: '1px solid #e2e8f0',
    margin: '16px 0',
  },
  '.cm-task-checkbox': {
    marginRight: '8px',
    cursor: 'pointer',
    accentColor: '#0284c7',
    transform: 'scale(1.15)',
    verticalAlign: 'middle',
  },
  // Math containers
  '.cm-math-container': {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px 0',
    margin: '8px 0',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    cursor: 'pointer',
    overflowX: 'auto',
    transition: 'border-color 0.15s ease',
  },
  '.cm-math-container:hover': {
    borderColor: 'rgba(2, 132, 199, 0.4)',
  },
  '.cm-math-inline': {
    cursor: 'pointer',
    padding: '1px 3px',
    borderRadius: '3px',
    transition: 'background-color 0.15s ease',
  },
  '.cm-math-inline:hover': {
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
  },
  // Mermaid containers
  '.cm-mermaid-container': {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px 16px',
    margin: '12px 0',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    cursor: 'pointer',
    overflowX: 'auto',
    minHeight: '60px',
    transition: 'border-color 0.15s ease',
  },
  '.cm-mermaid-container:hover': {
    borderColor: 'rgba(2, 132, 199, 0.4)',
  },
  '.cm-mermaid-container svg': {
    maxWidth: '100%',
    height: 'auto',
  },
  '.cm-mermaid-placeholder': {
    color: '#94a3b8',
    fontStyle: 'italic',
    fontSize: '13px',
  },
  '.cm-mermaid-error': {
    color: '#dc2626',
    padding: '12px',
    borderRadius: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    fontSize: '13px',
    width: '100%',
  },
  '.cm-mermaid-error-title': {
    fontWeight: '600',
    marginBottom: '4px',
  },
  '.cm-mermaid-error pre': {
    margin: 0,
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#dc2626',
  },
});

export const editorTheme = editorThemeDark;

export const markdownHighlightStyleDark = HighlightStyle.define([
  { tag: t.keyword, color: '#c084fc', fontWeight: '500' }, // purple-400
  { tag: [t.name, t.deleted, t.character, t.macroName], color: '#f87171' }, // red-400
  { tag: [t.propertyName], color: '#38bdf8' }, // sky-400
  { tag: [t.variableName], color: '#f4f4f5' }, // zinc-100
  { tag: [t.function(t.variableName), t.labelName], color: '#60a5fa' }, // blue-400
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#fb923c' }, // orange-400
  { tag: [t.definition(t.name), t.separator], color: '#e4e4e7' },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#facc15' }, // yellow-400
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#2dd4bf' }, // teal-400
  { tag: [t.meta, t.comment], color: '#71717a', fontStyle: 'italic' }, // zinc-500
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: '#38bdf8', textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: '#ffffff' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#f472b6' }, // pink-400
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#4ade80' }, // green-400
  { tag: t.invalid, color: '#ef4444' },
]);

export const markdownHighlightStyleLight = HighlightStyle.define([
  { tag: t.keyword, color: '#9333ea', fontWeight: '500' }, // purple-600
  { tag: [t.name, t.deleted, t.character, t.macroName], color: '#dc2626' }, // red-600
  { tag: [t.propertyName], color: '#0284c7' }, // sky-600
  { tag: [t.variableName], color: '#18181b' }, // zinc-900
  { tag: [t.function(t.variableName), t.labelName], color: '#2563eb' }, // blue-600
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#ea580c' }, // orange-600
  { tag: [t.definition(t.name), t.separator], color: '#27272a' },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#d97706' }, // amber-600
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#0d9488' }, // teal-600
  { tag: [t.meta, t.comment], color: '#64748b', fontStyle: 'italic' }, // slate-500
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: '#0284c7', textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: '#09090b' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#db2777' }, // pink-600
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#16a34a' }, // green-600
  { tag: t.invalid, color: '#dc2626' },
]);

export const markdownHighlightStyle = markdownHighlightStyleDark;
