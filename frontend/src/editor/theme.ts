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
      return "'DM Mono', 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace";
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
      return "'DM Mono', 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace";
  }
}

export function createFontTheme(fontSizePx: number, uiFontKey: string, monoFontKey: string) {
  const uiFont = getUiFontFamily(uiFontKey);
  const monoFont = getMonoFontFamily(monoFontKey);
  return EditorView.theme({
    '&': {
      fontSize: `${fontSizePx}px`,
      fontFamily: uiFont,
      letterSpacing: '-0.02ch',
    },
    '.cm-codeblock-line, .cm-inline-code, .cm-codeblock-header-line': {
      fontFamily: monoFont,
    },
  });
}

export function createEditorWidthTheme(mode: 'full' | 'wide' | 'centered' = 'full') {
  if (mode === 'centered') {
    return EditorView.theme({
      '.cm-scroller': {
        justifyContent: 'center',
      },
      '.cm-content': {
        maxWidth: '860px !important',
        width: '100% !important',
      },
    });
  }
  if (mode === 'wide') {
    return EditorView.theme({
      '.cm-scroller': {
        justifyContent: 'center',
      },
      '.cm-content': {
        maxWidth: '1200px !important',
        width: '100% !important',
      },
    });
  }
  // 'full' mode (default)
  return EditorView.theme({
    '.cm-scroller': {
      justifyContent: 'flex-start',
    },
    '.cm-content': {
      maxWidth: 'none !important',
      width: '100% !important',
    },
  });
}

// Backward compatibility alias
export const createFontSizeTheme = (sizePx: number) => createFontTheme(sizePx, 'system', 'default');

export const editorThemeDark = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--text-main, #e4e4e7)',
    backgroundColor: 'var(--bg-app, #121214)',
  },
  '.cm-content': {
    caretColor: 'var(--accent, #38bdf8)',
    padding: '20px 48px 64px 36px',
    lineHeight: '1.7',
    maxWidth: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--accent, #38bdf8)',
    borderLeftWidth: '2px',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(56, 189, 248, 0.25) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'inherit',
  },
  // Line Numbers Gutters
  '.cm-gutters': {
    backgroundColor: 'var(--bg-app, #121214)',
    color: 'var(--text-muted, #71717a)',
    border: 'none',
    borderRight: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    paddingRight: '8px',
    paddingLeft: '4px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85em',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--accent, #38bdf8)',
    fontWeight: 'bold',
  },
  // Search Match Highlighting
  '.cm-searchMatch': {
    backgroundColor: '#facc15 !important', // bright amber
    color: '#000000 !important',
    borderRadius: '1px',
    padding: '0 2px',
    fontWeight: '600',
  },
  '.cm-searchMatch-selected': {
    backgroundColor: '#38bdf8 !important', // bright cyan
    color: '#000000 !important',
    outline: '1px solid #0284c7',
    borderRadius: '1px',
    padding: '0 2px',
    fontWeight: '600',
  },
  // Headings
  '.cm-heading': {
    fontWeight: '700',
    color: '#fafafa',
  },
  '.cm-heading-1': {
    fontSize: '1.8em',
    lineHeight: '1.3',
    paddingBottom: '0.25em',
    borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    marginBottom: '0.5em',
  },
  '.cm-heading-2': {
    fontSize: '1.5em',
    lineHeight: '1.35',
    paddingBottom: '0.2em',
    borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
    marginTop: '0.75em',
  },
  '.cm-heading-3': {
    fontSize: '1.25em',
    lineHeight: '1.4',
    marginTop: '0.5em',
  },
  '.cm-heading-4': {
    fontSize: '1.1em',
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
    backgroundColor: 'var(--bg-card, #19191d)',
    color: 'var(--accent, #38bdf8)',
    padding: '1px 5px',
    borderRadius: '0px',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    fontSize: '0.9em',
  },
  // Contiguous TUI Code Blocks
  '.cm-codeblock-header-line': {
    backgroundColor: 'var(--bg-code-header, #1c1c22) !important',
    borderTop: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    borderLeft: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    borderRight: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    padding: '4px 12px !important',
    lineHeight: '1.4 !important',
    margin: '12px 0 0 0 !important',
  },
  '.cm-codeblock-lang-badge': {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--accent, #38bdf8)',
    fontFamily: 'var(--font-mono)',
  },
  '.cm-codeblock-line': {
    backgroundColor: 'var(--bg-code, #16161a) !important',
    fontSize: '0.9em',
    paddingLeft: '14px !important',
    paddingRight: '14px !important',
    lineHeight: '1.6 !important',
    borderLeft: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    borderRight: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
  },
  '.cm-codeblock-footer-line': {
    backgroundColor: 'var(--bg-code, #16161a) !important',
    borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    borderLeft: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    borderRight: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    height: '6px !important',
    minHeight: '6px !important',
    lineHeight: '0 !important',
    padding: '0 !important',
    margin: '0 0 12px 0 !important',
  },
  '.cm-codeblock-fence': {
    color: 'var(--text-muted, #71717a)',
    fontWeight: '500',
  },
  '.cm-blockquote-line': {
    borderLeft: '3px solid var(--accent, #38bdf8)',
    paddingLeft: '14px',
    color: 'var(--text-muted, #a1a1aa)',
    fontStyle: 'italic',
  },
  '.cm-hr': {
    border: 'none',
    borderTop: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    margin: '16px 0',
  },
  '.cm-task-checkbox': {
    marginRight: '8px',
    cursor: 'pointer',
    accentColor: 'var(--accent, #38bdf8)',
    transform: 'scale(1.15)',
    verticalAlign: 'middle',
  },
  // Math containers
  '.cm-math-container': {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px 0',
    margin: '8px 0',
    backgroundColor: 'var(--bg-card, #19191d)',
    borderRadius: '0px',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    cursor: 'pointer',
    overflowX: 'auto',
    transition: 'border-color 0.1s ease',
  },
  '.cm-math-container:hover': {
    borderColor: 'var(--accent, #38bdf8)',
  },
  '.cm-math-inline': {
    cursor: 'pointer',
    padding: '1px 4px',
    borderRadius: '0px',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  // Mermaid containers
  '.cm-mermaid-container': {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px 16px',
    margin: '12px 0',
    backgroundColor: 'var(--bg-card, #19191d)',
    borderRadius: '0px',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    cursor: 'pointer',
    overflowX: 'auto',
    minHeight: '60px',
  },
  '.cm-mermaid-container:hover': {
    borderColor: 'var(--accent, #38bdf8)',
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
    color: 'var(--danger, #f87171)',
    padding: '10px 14px',
    borderRadius: '0px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid var(--danger, #f87171)',
    fontSize: '12px',
    width: '100%',
  },
  '.cm-mermaid-error-title': {
    fontWeight: '700',
    marginBottom: '4px',
  },
  '.cm-mermaid-error pre': {
    margin: 0,
    whiteSpace: 'pre-wrap',
    fontFamily: 'var(--font-mono)',
    fontSize: '11.5px',
    color: '#fca5a5',
  },
});

export const editorThemeLight = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--text-main, #18181b)',
    backgroundColor: 'var(--bg-app, #f4f4f6)',
  },
  '.cm-content': {
    caretColor: 'var(--accent, #0284c7)',
    padding: '20px 48px 64px 36px',
    lineHeight: '1.7',
    maxWidth: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--accent, #0284c7)',
    borderLeftWidth: '2px',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(2, 132, 199, 0.2) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'inherit',
  },
  // Line Numbers Gutters
  '.cm-gutters': {
    backgroundColor: 'var(--bg-app, #f4f4f6)',
    color: 'var(--text-muted, #64748b)',
    border: 'none',
    borderRight: '1px solid var(--border, rgba(0, 0, 0, 0.14))',
    paddingRight: '8px',
    paddingLeft: '4px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85em',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--accent, #0284c7)',
    fontWeight: 'bold',
  },
  // Search Match Highlighting
  '.cm-searchMatch': {
    backgroundColor: '#facc15 !important',
    color: '#000000 !important',
    borderRadius: '1px',
    padding: '0 2px',
    fontWeight: '600',
  },
  '.cm-searchMatch-selected': {
    backgroundColor: '#0284c7 !important',
    color: '#ffffff !important',
    outline: '1px solid #0369a1',
    borderRadius: '1px',
    padding: '0 2px',
    fontWeight: '600',
  },
  // Headings
  '.cm-heading': {
    fontWeight: '700',
    color: '#09090b',
  },
  '.cm-heading-1': {
    fontSize: '1.8em',
    lineHeight: '1.3',
    paddingBottom: '0.25em',
    borderBottom: '1px solid var(--border, rgba(0, 0, 0, 0.14))',
    marginBottom: '0.5em',
  },
  '.cm-heading-2': {
    fontSize: '1.5em',
    lineHeight: '1.35',
    paddingBottom: '0.2em',
    borderBottom: '1px solid var(--border-subtle, rgba(0, 0, 0, 0.07))',
    marginTop: '0.75em',
  },
  '.cm-heading-3': {
    fontSize: '1.25em',
    lineHeight: '1.4',
    marginTop: '0.5em',
  },
  '.cm-heading-4': {
    fontSize: '1.1em',
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
    backgroundColor: 'var(--bg-card, #ffffff)',
    color: 'var(--accent, #0284c7)',
    padding: '1px 5px',
    borderRadius: '0px',
    border: '1px solid var(--border, rgba(0, 0, 0, 0.14))',
    fontSize: '0.9em',
  },
  // Contiguous TUI Code Blocks
  '.cm-codeblock-header-line': {
    backgroundColor: 'var(--bg-code-header, #eaeaf0) !important',
    borderTop: '1px solid var(--border, rgba(0, 0, 0, 0.14))',
    borderLeft: '1px solid var(--border, rgba(0, 0, 0, 0.14))',
    borderRight: '1px solid var(--border, rgba(0, 0, 0, 0.14))',
    padding: '4px 12px !important',
    lineHeight: '1.4 !important',
    margin: '12px 0 0 0 !important',
  },
  '.cm-codeblock-lang-badge': {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--accent, #0284c7)',
    fontFamily: 'var(--font-mono)',
  },
  '.cm-codeblock-line': {
    backgroundColor: 'var(--bg-code, #fbfbfd) !important',
    fontSize: '0.9em',
    paddingLeft: '14px !important',
    paddingRight: '14px !important',
    lineHeight: '1.6 !important',
    borderLeft: '1px solid var(--border, rgba(0, 0, 0, 0.14))',
    borderRight: '1px solid var(--border, rgba(0, 0, 0, 0.14))',
  },
  '.cm-codeblock-footer-line': {
    backgroundColor: 'var(--bg-code, #fbfbfd) !important',
    borderBottom: '1px solid var(--border, rgba(0, 0, 0, 0.14))',
    borderLeft: '1px solid var(--border, rgba(0, 0, 0, 0.14))',
    borderRight: '1px solid var(--border, rgba(0, 0, 0, 0.14))',
    height: '6px !important',
    minHeight: '6px !important',
    lineHeight: '0 !important',
    padding: '0 !important',
    margin: '0 0 12px 0 !important',
  },
  '.cm-codeblock-fence': {
    color: 'var(--text-muted, #64748b)',
    fontWeight: '500',
  },
  '.cm-blockquote-line': {
    borderLeft: '3px solid var(--accent, #0284c7)',
    paddingLeft: '14px',
    color: '#475569',
    fontStyle: 'italic',
  },
  '.cm-hr': {
    border: 'none',
    borderTop: '1px solid var(--border, rgba(0, 0, 0, 0.14))',
    margin: '16px 0',
  },
  '.cm-task-checkbox': {
    marginRight: '8px',
    cursor: 'pointer',
    accentColor: 'var(--accent, #0284c7)',
    transform: 'scale(1.15)',
    verticalAlign: 'middle',
  },
  // Math containers
  '.cm-math-container': {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px 0',
    margin: '8px 0',
    backgroundColor: 'var(--bg-card, #ffffff)',
    borderRadius: '0px',
    border: '1px solid var(--border, rgba(0, 0, 0, 0.14))',
    cursor: 'pointer',
    overflowX: 'auto',
  },
  '.cm-math-container:hover': {
    borderColor: 'var(--accent, #0284c7)',
  },
  '.cm-math-inline': {
    cursor: 'pointer',
    padding: '1px 4px',
    borderRadius: '0px',
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
  },
  // Mermaid containers
  '.cm-mermaid-container': {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px 16px',
    margin: '12px 0',
    backgroundColor: 'var(--bg-card, #ffffff)',
    borderRadius: '0px',
    border: '1px solid var(--border, rgba(0, 0, 0, 0.14))',
    cursor: 'pointer',
    overflowX: 'auto',
    minHeight: '60px',
  },
  '.cm-mermaid-container:hover': {
    borderColor: 'var(--accent, #0284c7)',
  },
  '.cm-mermaid-container svg': {
    maxWidth: '100%',
    height: 'auto',
  },
  '.cm-mermaid-placeholder': {
    color: '#64748b',
    fontStyle: 'italic',
    fontSize: '13px',
  },
  '.cm-mermaid-error': {
    color: 'var(--danger, #dc2626)',
    padding: '10px 14px',
    borderRadius: '0px',
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    border: '1px solid var(--danger, #dc2626)',
    fontSize: '12px',
    width: '100%',
  },
  '.cm-mermaid-error-title': {
    fontWeight: '700',
    marginBottom: '4px',
  },
  '.cm-mermaid-error pre': {
    margin: 0,
    whiteSpace: 'pre-wrap',
    fontFamily: 'var(--font-mono)',
    fontSize: '11.5px',
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
