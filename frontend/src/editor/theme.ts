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
  '@keyframes cm-blink': {
    '0%, 40%': { opacity: '1' },
    '55%': { opacity: '0' },
    '85%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  '@keyframes cm-blink2': {
    '0%, 40%': { opacity: '1' },
    '55%': { opacity: '0' },
    '85%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  '&.cm-focused > .cm-scroller > .cm-cursorLayer': {
    animation: 'cm-blink 1.05s ease-in-out infinite',
  },
  '.cm-cursorLayer': {
    pointerEvents: 'none',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--accent, #38bdf8)',
    borderLeftWidth: '2px',
    marginLeft: '-1px',
    borderRadius: '1px',
  },
  '.cm-cursor-primary': {
    borderLeftColor: 'var(--accent, #38bdf8)',
  },
  '.cm-cursor-secondary': {
    borderLeftColor: 'var(--accent, #38bdf8)',
    opacity: '0.6',
  },
  '@media (prefers-reduced-motion: reduce)': {
    '&.cm-focused > .cm-scroller > .cm-cursorLayer': {
      animation: 'none !important',
      opacity: '1 !important',
    },
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(56, 189, 248, 0.25) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    transition: 'background-color 0.15s ease',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'inherit',
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--border, rgba(255, 255, 255, 0.12)) transparent',
  },
  '.cm-scroller::-webkit-scrollbar': {
    width: '6px',
    height: '6px',
  },
  '.cm-scroller::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '.cm-scroller::-webkit-scrollbar-thumb': {
    backgroundColor: 'var(--border, rgba(255, 255, 255, 0.12))',
    borderRadius: '0px',
  },
  '.cm-scroller::-webkit-scrollbar-thumb:hover': {
    backgroundColor: 'var(--accent, #38bdf8)',
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
  // Headings with distinctive hierarchical colors
  '.cm-heading': {
    fontWeight: '700',
  },
  '.cm-heading-1': {
    fontSize: '1.8em',
    lineHeight: '1.3',
    paddingBottom: '0.25em',
    borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    marginBottom: '0.5em',
    color: '#38bdf8 !important', // Vibrant Sky / Cyan
  },
  '.cm-heading-2': {
    fontSize: '1.5em',
    lineHeight: '1.35',
    paddingBottom: '0.2em',
    borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
    marginTop: '0.75em',
    color: '#818cf8 !important', // Vibrant Indigo
  },
  '.cm-heading-3': {
    fontSize: '1.25em',
    lineHeight: '1.4',
    marginTop: '0.5em',
    color: '#c084fc !important', // Vibrant Purple / Violet
  },
  '.cm-heading-4': {
    fontSize: '1.1em',
    color: '#34d399 !important', // Vibrant Emerald / Teal
  },
  '.cm-heading-5': {
    fontSize: '1em',
    color: '#fbbf24 !important', // Vibrant Amber / Gold
  },
  '.cm-heading-6': {
    fontSize: '0.9em',
    color: '#f472b6 !important', // Vibrant Rose / Pink
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
  // Tables
  '.cm-table': {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '12px 0',
    fontSize: '0.95em',
  },
  '.cm-table th': {
    backgroundColor: 'var(--bg-code-header, #1f1f26)',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    padding: '6px 12px',
    fontWeight: '600',
    color: 'var(--text-main, #e4e4e7)',
  },
  '.cm-table td': {
    border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    padding: '6px 12px',
    backgroundColor: 'var(--bg-code, #18181d)',
    color: 'var(--text-main, #e4e4e7)',
  },
  '.cm-table tbody tr:nth-child(even) td': {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  '.cm-task-checkbox': {
    marginRight: '8px',
    cursor: 'pointer',
    accentColor: 'var(--accent, #38bdf8)',
    transform: 'scale(1.15)',
    verticalAlign: 'middle',
    transition: 'transform 0.12s ease',
  },
  '.cm-task-checkbox:active': {
    transform: 'scale(0.95)',
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
  // Bullet points in live preview
  '.cm-bullet-point': {
    color: 'var(--accent, #38bdf8)',
    fontWeight: 'bold',
    display: 'inline-block',
    marginRight: '0.5em',
    textAlign: 'center',
  },
  // Text highlights ==highlight==
  '.cm-text-highlight': {
    backgroundColor: 'rgba(250, 204, 21, 0.22)',
    color: '#fef08a',
    padding: '1px 5px',
    borderRadius: '2px',
    border: '1px solid rgba(250, 204, 21, 0.35)',
  },
  // GitHub-style callout notes
  '.cm-callout': {
    borderLeftWidth: '3px !important',
    borderLeftStyle: 'solid !important',
    paddingLeft: '12px !important',
  },
  '.cm-callout-note': {
    borderLeftColor: '#38bdf8 !important',
    backgroundColor: 'rgba(56, 189, 248, 0.07) !important',
  },
  '.cm-callout-tip': {
    borderLeftColor: '#4ade80 !important',
    backgroundColor: 'rgba(74, 222, 128, 0.07) !important',
  },
  '.cm-callout-important': {
    borderLeftColor: '#a855f7 !important',
    backgroundColor: 'rgba(168, 85, 247, 0.07) !important',
  },
  '.cm-callout-warning': {
    borderLeftColor: 'var(--dirty, #f59e0b) !important',
    backgroundColor: 'rgba(245, 158, 11, 0.07) !important',
  },
  '.cm-callout-caution': {
    borderLeftColor: 'var(--danger, #f43f5e) !important',
    backgroundColor: 'rgba(244, 63, 94, 0.07) !important',
  },
  '.cm-callout-badge': {
    fontWeight: '700',
    fontFamily: 'var(--font-mono)',
    marginRight: '6px',
    display: 'inline-block',
  },
  // Autocomplete popup
  '.cm-tooltip-autocomplete': {
    backgroundColor: 'var(--bg-card, #18181c) !important',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.14)) !important',
    borderRadius: '0px !important',
    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6) !important',
    fontFamily: 'var(--font-mono) !important',
    fontSize: '12px !important',
  },
  '.cm-tooltip-autocomplete > ul': {
    maxHeight: '260px',
    fontFamily: 'var(--font-mono)',
  },
  '.cm-tooltip-autocomplete > ul > li': {
    padding: '4px 10px !important',
    borderRadius: '0px !important',
    color: 'var(--text-main, #e4e4e7)',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--bg-active, rgba(255, 255, 255, 0.12)) !important',
    color: 'var(--accent, #38bdf8) !important',
  },
  '.cm-completionLabel': {
    fontWeight: '500',
  },
  '.cm-completionDetail': {
    color: 'var(--text-muted, #71717a) !important',
    fontStyle: 'italic',
    marginLeft: '8px',
    fontSize: '11px',
  },
  '.cm-completionMatchedText': {
    color: 'var(--accent, #38bdf8) !important',
    textDecoration: 'none !important',
    fontWeight: '700',
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
  '@keyframes cm-blink': {
    '0%, 40%': { opacity: '1' },
    '55%': { opacity: '0' },
    '85%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  '@keyframes cm-blink2': {
    '0%, 40%': { opacity: '1' },
    '55%': { opacity: '0' },
    '85%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  '&.cm-focused > .cm-scroller > .cm-cursorLayer': {
    animation: 'cm-blink 1.05s ease-in-out infinite',
  },
  '.cm-cursorLayer': {
    pointerEvents: 'none',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--accent, #0284c7)',
    borderLeftWidth: '2px',
    marginLeft: '-1px',
    borderRadius: '1px',
  },
  '.cm-cursor-primary': {
    borderLeftColor: 'var(--accent, #0284c7)',
  },
  '.cm-cursor-secondary': {
    borderLeftColor: 'var(--accent, #0284c7)',
    opacity: '0.6',
  },
  '@media (prefers-reduced-motion: reduce)': {
    '&.cm-focused > .cm-scroller > .cm-cursorLayer': {
      animation: 'none !important',
      opacity: '1 !important',
    },
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(2, 132, 199, 0.2) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    transition: 'background-color 0.15s ease',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'inherit',
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--border, rgba(0, 0, 0, 0.14)) transparent',
  },
  '.cm-scroller::-webkit-scrollbar': {
    width: '6px',
    height: '6px',
  },
  '.cm-scroller::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '.cm-scroller::-webkit-scrollbar-thumb': {
    backgroundColor: 'var(--border, rgba(0, 0, 0, 0.14))',
    borderRadius: '0px',
  },
  '.cm-scroller::-webkit-scrollbar-thumb:hover': {
    backgroundColor: 'var(--accent, #0284c7)',
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
  // Headings with distinctive hierarchical colors (Light theme)
  '.cm-heading': {
    fontWeight: '700',
  },
  '.cm-heading-1': {
    fontSize: '1.8em',
    lineHeight: '1.3',
    paddingBottom: '0.25em',
    borderBottom: '1px solid var(--border, rgba(0, 0, 0, 0.14))',
    marginBottom: '0.5em',
    color: '#0284c7 !important', // Deep Sky Blue
  },
  '.cm-heading-2': {
    fontSize: '1.5em',
    lineHeight: '1.35',
    paddingBottom: '0.2em',
    borderBottom: '1px solid var(--border-subtle, rgba(0, 0, 0, 0.07))',
    marginTop: '0.75em',
    color: '#4f46e5 !important', // Deep Indigo
  },
  '.cm-heading-3': {
    fontSize: '1.25em',
    lineHeight: '1.4',
    marginTop: '0.5em',
    color: '#7c3aed !important', // Deep Violet
  },
  '.cm-heading-4': {
    fontSize: '1.1em',
    color: '#059669 !important', // Deep Emerald
  },
  '.cm-heading-5': {
    fontSize: '1em',
    color: '#d97706 !important', // Deep Amber
  },
  '.cm-heading-6': {
    fontSize: '0.9em',
    color: '#db2777 !important', // Deep Rose
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
  // Tables
  '.cm-table': {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '12px 0',
    fontSize: '0.95em',
  },
  '.cm-table th': {
    backgroundColor: 'var(--bg-code-header, #eaeaf0)',
    border: '1px solid var(--border, rgba(0, 0, 0, 0.14))',
    padding: '6px 12px',
    fontWeight: '600',
    color: 'var(--text-main, #18181b)',
  },
  '.cm-table td': {
    border: '1px solid var(--border, rgba(0, 0, 0, 0.14))',
    padding: '6px 12px',
    backgroundColor: 'var(--bg-code, #fbfbfd)',
    color: 'var(--text-main, #18181b)',
  },
  '.cm-table tbody tr:nth-child(even) td': {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  '.cm-task-checkbox': {
    marginRight: '8px',
    cursor: 'pointer',
    accentColor: 'var(--accent, #0284c7)',
    transform: 'scale(1.15)',
    verticalAlign: 'middle',
    transition: 'transform 0.12s ease',
  },
  '.cm-task-checkbox:active': {
    transform: 'scale(0.95)',
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
  // Bullet points in live preview
  '.cm-bullet-point': {
    color: 'var(--accent, #0284c7)',
    fontWeight: 'bold',
    display: 'inline-block',
    marginRight: '0.5em',
    textAlign: 'center',
  },
  // Text highlights ==highlight==
  '.cm-text-highlight': {
    backgroundColor: 'rgba(250, 204, 21, 0.35)',
    color: '#854d0e',
    padding: '1px 5px',
    borderRadius: '2px',
    border: '1px solid rgba(250, 204, 21, 0.5)',
  },
  // GitHub-style callout notes
  '.cm-callout': {
    borderLeftWidth: '3px !important',
    borderLeftStyle: 'solid !important',
    paddingLeft: '12px !important',
  },
  '.cm-callout-note': {
    borderLeftColor: '#0284c7 !important',
    backgroundColor: 'rgba(2, 132, 199, 0.07) !important',
  },
  '.cm-callout-tip': {
    borderLeftColor: '#16a34a !important',
    backgroundColor: 'rgba(22, 163, 74, 0.07) !important',
  },
  '.cm-callout-important': {
    borderLeftColor: '#9333ea !important',
    backgroundColor: 'rgba(147, 51, 234, 0.07) !important',
  },
  '.cm-callout-warning': {
    borderLeftColor: 'var(--dirty, #d97706) !important',
    backgroundColor: 'rgba(217, 119, 6, 0.07) !important',
  },
  '.cm-callout-caution': {
    borderLeftColor: 'var(--danger, #e11d48) !important',
    backgroundColor: 'rgba(225, 29, 72, 0.07) !important',
  },
  '.cm-callout-badge': {
    fontWeight: '700',
    fontFamily: 'var(--font-mono)',
    marginRight: '6px',
    display: 'inline-block',
  },
  // Autocomplete popup
  '.cm-tooltip-autocomplete': {
    backgroundColor: 'var(--bg-card, #ffffff) !important',
    border: '1px solid var(--border, rgba(0, 0, 0, 0.16)) !important',
    borderRadius: '0px !important',
    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.16) !important',
    fontFamily: 'var(--font-mono) !important',
    fontSize: '12px !important',
  },
  '.cm-tooltip-autocomplete > ul': {
    maxHeight: '260px',
    fontFamily: 'var(--font-mono)',
  },
  '.cm-tooltip-autocomplete > ul > li': {
    padding: '4px 10px !important',
    borderRadius: '0px !important',
    color: 'var(--text-main, #18181b)',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--bg-active, rgba(0, 0, 0, 0.08)) !important',
    color: 'var(--accent, #0284c7) !important',
  },
  '.cm-completionLabel': {
    fontWeight: '500',
  },
  '.cm-completionDetail': {
    color: 'var(--text-muted, #64748b) !important',
    fontStyle: 'italic',
    marginLeft: '8px',
    fontSize: '11px',
  },
  '.cm-completionMatchedText': {
    color: 'var(--accent, #0284c7) !important',
    textDecoration: 'none !important',
    fontWeight: '700',
  },
});

export const editorTheme = editorThemeDark;

export const markdownHighlightStyleDark = HighlightStyle.define([
  // Keywords and control flow
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.moduleKeyword], color: '#c084fc', fontWeight: '500' }, // purple-400
  // Functions and callable identifiers
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.function(t.name), t.labelName], color: '#60a5fa' }, // blue-400
  // Strings, characters, and insertions
  { tag: [t.string, t.special(t.string), t.inserted, t.character], color: '#4ade80' }, // green-400
  { tag: [t.escape, t.regexp], color: '#2dd4bf' }, // teal-400
  // Numbers and booleans
  { tag: [t.number, t.integer, t.float], color: '#fb923c' }, // orange-400
  { tag: [t.bool, t.atom, t.null], color: '#f472b6' }, // pink-400
  // Types, classes, and namespaces
  { tag: [t.typeName, t.className, t.standard(t.typeName), t.namespace, t.changed], color: '#facc15' }, // yellow-400
  // Properties and attributes
  { tag: [t.propertyName, t.attributeName], color: '#38bdf8' }, // sky-400
  // Variables and general identifiers (neutral readability, never glaring red)
  { tag: [t.variableName, t.attributeValue], color: '#f4f4f5' }, // zinc-100
  { tag: [t.name, t.definition(t.name)], color: '#e4e4e7' },
  { tag: [t.macroName, t.constant(t.name), t.standard(t.name)], color: '#fb923c' },
  // Delimiters, operators, and punctuation
  { tag: [t.operator, t.punctuation, t.bracket, t.paren, t.brace, t.separator], color: '#94a3b8' }, // slate-400
  // Comments and metadata
  { tag: [t.meta, t.annotation, t.modifier], color: '#a78bfa' }, // lavender
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: '#71717a', fontStyle: 'italic' }, // zinc-500
  // Markdown headings with distinctive colors
  { tag: t.heading1, color: '#38bdf8', fontWeight: '700' }, // Sky
  { tag: t.heading2, color: '#818cf8', fontWeight: '700' }, // Indigo
  { tag: t.heading3, color: '#c084fc', fontWeight: '600' }, // Violet
  { tag: t.heading4, color: '#34d399', fontWeight: '600' }, // Emerald
  { tag: t.heading5, color: '#fbbf24', fontWeight: '600' }, // Amber
  { tag: t.heading6, color: '#f472b6', fontWeight: '600' }, // Rose
  { tag: t.heading, color: '#ffffff', fontWeight: 'bold' },
  // Markdown formatting
  { tag: t.strong, fontWeight: 'bold', color: '#ffffff' },
  { tag: t.emphasis, fontStyle: 'italic', color: '#e4e4e7' },
  { tag: t.strikethrough, textDecoration: 'line-through', color: '#71717a' },
  { tag: t.monospace, color: '#38bdf8' },
  { tag: [t.link, t.url], color: '#38bdf8', textDecoration: 'underline' },
  { tag: t.quote, color: '#94a3b8', fontStyle: 'italic' },
  { tag: t.list, color: '#38bdf8' },
  // Errors and deletions
  { tag: t.deleted, color: '#f87171' },
  { tag: t.invalid, color: '#ef4444' },
]);

export const markdownHighlightStyleLight = HighlightStyle.define([
  // Keywords and control flow
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.moduleKeyword], color: '#9333ea', fontWeight: '500' }, // purple-600
  // Functions and callable identifiers
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.function(t.name), t.labelName], color: '#2563eb' }, // blue-600
  // Strings, characters, and insertions
  { tag: [t.string, t.special(t.string), t.inserted, t.character], color: '#16a34a' }, // green-600
  { tag: [t.escape, t.regexp], color: '#0d9488' }, // teal-600
  // Numbers and booleans
  { tag: [t.number, t.integer, t.float], color: '#ea580c' }, // orange-600
  { tag: [t.bool, t.atom, t.null], color: '#db2777' }, // pink-600
  // Types, classes, and namespaces
  { tag: [t.typeName, t.className, t.standard(t.typeName), t.namespace, t.changed], color: '#d97706' }, // amber-600
  // Properties and attributes
  { tag: [t.propertyName, t.attributeName], color: '#0284c7' }, // sky-600
  // Variables and general identifiers
  { tag: [t.variableName, t.attributeValue], color: '#18181b' }, // zinc-900
  { tag: [t.name, t.definition(t.name)], color: '#27272a' },
  { tag: [t.macroName, t.constant(t.name), t.standard(t.name)], color: '#ea580c' },
  // Delimiters, operators, and punctuation
  { tag: [t.operator, t.punctuation, t.bracket, t.paren, t.brace, t.separator], color: '#475569' }, // slate-600
  // Comments and metadata
  { tag: [t.meta, t.annotation, t.modifier], color: '#7c3aed' }, // purple-600
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: '#64748b', fontStyle: 'italic' }, // slate-500
  // Markdown headings with distinctive colors
  { tag: t.heading1, color: '#0284c7', fontWeight: '700' }, // Sky
  { tag: t.heading2, color: '#4f46e5', fontWeight: '700' }, // Indigo
  { tag: t.heading3, color: '#7c3aed', fontWeight: '600' }, // Violet
  { tag: t.heading4, color: '#059669', fontWeight: '600' }, // Emerald
  { tag: t.heading5, color: '#d97706', fontWeight: '600' }, // Amber
  { tag: t.heading6, color: '#db2777', fontWeight: '600' }, // Rose
  { tag: t.heading, color: '#09090b', fontWeight: 'bold' },
  // Markdown formatting
  { tag: t.strong, fontWeight: 'bold', color: '#000000' },
  { tag: t.emphasis, fontStyle: 'italic', color: '#18181b' },
  { tag: t.strikethrough, textDecoration: 'line-through', color: '#64748b' },
  { tag: t.monospace, color: '#0284c7' },
  { tag: [t.link, t.url], color: '#0284c7', textDecoration: 'underline' },
  { tag: t.quote, color: '#475569', fontStyle: 'italic' },
  { tag: t.list, color: '#0284c7' },
  // Errors and deletions
  { tag: t.deleted, color: '#dc2626' },
  { tag: t.invalid, color: '#dc2626' },
]);

export const markdownHighlightStyle = markdownHighlightStyleDark;
