import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from '@codemirror/view';
import {
  StateField,
  RangeSet,
  type Range,
  type EditorState,
  type Extension,
} from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { InlineMathWidget, BlockMathWidget } from './mathWidget';
import { MermaidWidget } from './mermaidWidget';

class TaskCheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean, readonly pos: number) {
    super();
  }

  eq(other: TaskCheckboxWidget) {
    return other.checked === this.checked && other.pos === this.pos;
  }

  toDOM(view: EditorView) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = this.checked;
    input.className = 'cm-task-checkbox';
    input.addEventListener('mousedown', (e) => {
      e.preventDefault();
      // Toggle [ ] <-> [x] in the document
      const char = this.checked ? ' ' : 'x';
      view.dispatch({
        changes: { from: this.pos, to: this.pos + 1, insert: char },
      });
    });
    return input;
  }

  ignoreEvent() {
    return false;
  }
}

class CodeBlockHeaderWidget extends WidgetType {
  constructor(readonly lang: string) {
    super();
  }

  eq(other: CodeBlockHeaderWidget) {
    return other.lang === this.lang;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-codeblock-lang-badge';
    span.textContent = `[${this.lang ? this.lang.toLowerCase() : 'code'}]`;
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

class HorizontalRuleWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement('hr');
    hr.className = 'cm-hr';
    return hr;
  }

  ignoreEvent() {
    return false;
  }
}

class WikiLinkWidget extends WidgetType {
  constructor(readonly linkTarget: string, readonly displayText: string) {
    super();
  }

  eq(other: WikiLinkWidget) {
    return other.linkTarget === this.linkTarget && other.displayText === this.displayText;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-wikilink';
    span.textContent = `[[${this.displayText}]]`;
    span.title = `Open note: ${this.linkTarget}`;
    span.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('tex:open-wikilink', { detail: this.linkTarget }));
    });
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

class BulletWidget extends WidgetType {
  eq(other: BulletWidget) {
    return true;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-bullet-point';
    span.textContent = '•';
    span.style.color = 'var(--accent, #38bdf8)';
    span.style.fontWeight = 'bold';
    span.style.display = 'inline-block';
    span.style.marginRight = '0.5em';
    span.style.textAlign = 'center';
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

class CalloutHeaderWidget extends WidgetType {
  constructor(readonly calloutType: string) {
    super();
  }

  eq(other: CalloutHeaderWidget) {
    return other.calloutType.toLowerCase() === this.calloutType.toLowerCase();
  }

  toDOM() {
    const span = document.createElement('span');
    const type = this.calloutType.toLowerCase();
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    span.className = `cm-callout-badge cm-callout-badge-${type}`;
    span.textContent = `[${label}]`;

    const colors: Record<string, string> = {
      note: 'var(--accent, #38bdf8)',
      tip: '#4ade80',
      important: '#a855f7',
      warning: 'var(--dirty, #eab308)',
      caution: 'var(--danger, #f43f5e)',
    };
    span.style.color = colors[type] || 'var(--accent, #38bdf8)';
    span.style.fontWeight = '700';
    span.style.fontFamily = 'var(--font-mono, monospace)';
    span.style.marginRight = '6px';
    span.style.display = 'inline-block';
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

// Check if cursor or selection is strictly inside [from, to] (inclusive of boundaries)
function cursorInside(state: EditorState, from: number, to: number): boolean {
  for (const range of state.selection.ranges) {
    if (range.empty) {
      if (range.head >= from && range.head <= to) return true;
    } else {
      if (range.to >= from && range.from <= to) return true;
    }
  }
  return false;
}

// Check if cursor is on the same line as [from, to]
function cursorOnSameLine(state: EditorState, lineFrom: number, lineTo: number): boolean {
  for (const range of state.selection.ranges) {
    if (range.head >= lineFrom && range.head <= lineTo) return true;
  }
  return false;
}

function computeDecorations(state: EditorState): DecorationSet {
  const docText = state.doc.toString();
  const ranges: Range<Decoration>[] = [];
  const occupiedReplacements: { from: number; to: number }[] = [];

  const codeRanges: { from: number; to: number }[] = [];

  function isInsideCode(from: number, to: number): boolean {
    return codeRanges.some((r) => Math.max(from, r.from) < Math.min(to, r.to));
  }

  function isOccupied(from: number, to: number): boolean {
    return occupiedReplacements.some(
      (r) => Math.max(from, r.from) < Math.min(to, r.to)
    );
  }

  function addReplacement(from: number, to: number, deco: Decoration) {
    if (!isOccupied(from, to)) {
      ranges.push(deco.range(from, to));
      occupiedReplacements.push({ from, to });
      return true;
    }
    return false;
  }

  // 1. Block Math: $$ ... $$
  const blockMathRegex = /(?<!\\)\$\$([\s\S]+?)\$\$/g;
  let match: RegExpExecArray | null;
  while ((match = blockMathRegex.exec(docText)) !== null) {
    const matchFrom = match.index;
    const matchTo = match.index + match[0].length;
    if (isOccupied(matchFrom, matchTo)) continue;

    const hasCursor = cursorInside(state, matchFrom, matchTo);
    if (!hasCursor) {
      const mathContent = match[1];
      addReplacement(
        matchFrom,
        matchTo,
        Decoration.replace({
          widget: new BlockMathWidget(mathContent),
          block: true,
        })
      );
    }
  }

  // 2. Process Lezer Markdown AST
  syntaxTree(state).iterate({
    from: 0,
    to: state.doc.length,
    enter: (node) => {
      const nodeName = node.name;
      const nodeFrom = node.from;
      const nodeTo = node.to;

      // If this AST node is within a block that was already replaced (like Mermaid or Block Math), skip it
      if (isOccupied(nodeFrom, nodeTo)) return;

      // Fenced Code Blocks (```language ... ``` and ```mermaid ... ```)
      if (nodeName === 'FencedCode') {
        codeRanges.push({ from: nodeFrom, to: nodeTo });
        let info = '';
        let code = '';
        const cursor = node.node.cursor();
        if (cursor.firstChild()) {
          do {
            if (cursor.name === 'CodeInfo') {
              info = state.doc.sliceString(cursor.from, cursor.to).trim().toLowerCase();
            } else if (cursor.name === 'CodeText') {
              code = state.doc.sliceString(cursor.from, cursor.to);
            }
          } while (cursor.nextSibling());
        }

        const hasCursor = cursorInside(state, nodeFrom, nodeTo);

        // Mermaid diagrams render as SVG widget when cursor is outside
        if (info === 'mermaid') {
          if (!hasCursor) {
            addReplacement(
              nodeFrom,
              nodeTo,
              Decoration.replace({
                widget: new MermaidWidget(code),
                block: true,
              })
            );
            return;
          }
        }

        const startLine = state.doc.lineAt(nodeFrom);
        const endLine = state.doc.lineAt(nodeTo);

        if (!hasCursor && startLine.number < endLine.number) {
          // Opening header line
          ranges.push(
            Decoration.line({ class: 'cm-codeblock-header-line' }).range(startLine.from, startLine.from)
          );
          addReplacement(
            startLine.from,
            startLine.to,
            Decoration.replace({
              widget: new CodeBlockHeaderWidget(info),
            })
          );

          // Interior code lines
          for (let l = startLine.number + 1; l < endLine.number; l++) {
            const line = state.doc.line(l);
            ranges.push(
              Decoration.line({ class: 'cm-codeblock-line' }).range(line.from, line.from)
            );
          }

          // Closing footer line
          ranges.push(
            Decoration.line({ class: 'cm-codeblock-footer-line' }).range(endLine.from, endLine.from)
          );
          addReplacement(
            endLine.from,
            endLine.to,
            Decoration.replace({})
          );
        } else {
          // While editing inside the block: reveal fences and style lines
          for (let l = startLine.number; l <= endLine.number; l++) {
            const line = state.doc.line(l);
            ranges.push(
              Decoration.line({ class: 'cm-codeblock-line' }).range(line.from, line.from)
            );
          }
        }
      }

      // CodeMark and CodeInfo inside FencedCode (subtle styling for fences when editing)
      if ((nodeName === 'CodeMark' || nodeName === 'CodeInfo') && node.node.parent?.name === 'FencedCode') {
        ranges.push(Decoration.mark({ class: 'cm-codeblock-fence' }).range(nodeFrom, nodeTo));
      }

      // Header styling (ATXHeading1 to ATXHeading6, SetextHeading1 to SetextHeading2)
      const headingMatch = nodeName.match(/^(?:ATX|Setext)Heading(\d)$/);
      if (headingMatch) {
        const level = headingMatch[1];
        const startLine = state.doc.lineAt(nodeFrom);
        const endLine = state.doc.lineAt(nodeTo);
        const lineText = state.doc.sliceString(startLine.from, startLine.to);

        if (nodeName.startsWith('ATX')) {
          // Do not style lines that only consist of hash marks without content or space
          // (e.g. user backspaced to '#' or typed a single '#')
          if (/^#{1,6}$/.test(lineText.trim())) {
            return;
          }

          const hasCursor = cursorOnSameLine(state, startLine.from, startLine.to);

          // Add styling to entire heading line
          ranges.push(
            Decoration.line({ class: `cm-heading cm-heading-${level}` }).range(startLine.from, startLine.from)
          );

          // Hide the '#' marks when cursor is elsewhere
          if (!hasCursor) {
            const hashPrefix = lineText.match(/^#{1,6}\s*/);
            if (hashPrefix) {
              addReplacement(
                startLine.from,
                startLine.from + hashPrefix[0].length,
                Decoration.replace({})
              );
            }
          }
        } else {
          // Setext heading
          const hasCursor = cursorOnSameLine(state, startLine.from, endLine.to);

          ranges.push(
            Decoration.line({ class: `cm-heading cm-heading-${level}` }).range(startLine.from, startLine.from)
          );

          if (!hasCursor && endLine.number > startLine.number) {
            addReplacement(endLine.from, endLine.to, Decoration.replace({}));
          }
        }
      }

      // Bullet list items (- , * , + )
      if (nodeName === 'ListMark') {
        const parent = node.node.parent;
        // Verify it is inside a BulletList and not an OrderedList
        const isBullet = parent?.parent?.name === 'BulletList';
        // Verify it is NOT a Task item (- [ ] / - [x])
        const isTask = !!parent?.getChild('Task');

        if (isBullet && !isTask) {
          const line = state.doc.lineAt(nodeFrom);
          const restOfLine = state.doc.sliceString(nodeTo, line.to);
          const spaceMatch = restOfLine.match(/^\s+/);
          const replaceTo = spaceMatch ? nodeTo + spaceMatch[0].length : nodeTo;

          const hasCursor = cursorInside(state, nodeFrom, replaceTo);
          if (!hasCursor) {
            addReplacement(
              nodeFrom,
              replaceTo,
              Decoration.replace({
                widget: new BulletWidget(),
              })
            );
          }
        }
      }

      // Strong / Bold (**text**)
      if (nodeName === 'StrongEmphasis') {
        const hasCursor = cursorInside(state, nodeFrom, nodeTo);
        if (!hasCursor) {
          const raw = state.doc.sliceString(nodeFrom, nodeTo);
          if (raw.startsWith('**') && raw.endsWith('**') && raw.length >= 4) {
            addReplacement(nodeFrom, nodeFrom + 2, Decoration.replace({}));
            ranges.push(Decoration.mark({ class: 'cm-bold' }).range(nodeFrom + 2, nodeTo - 2));
            addReplacement(nodeTo - 2, nodeTo, Decoration.replace({}));
          }
        } else {
          ranges.push(Decoration.mark({ class: 'cm-bold' }).range(nodeFrom, nodeTo));
        }
      }

      // Emphasis / Italic (*text* or _text_)
      if (nodeName === 'Emphasis') {
        const hasCursor = cursorInside(state, nodeFrom, nodeTo);
        if (!hasCursor) {
          const raw = state.doc.sliceString(nodeFrom, nodeTo);
          const marker = raw[0];
          if ((marker === '*' || marker === '_') && raw.endsWith(marker) && raw.length >= 2) {
            addReplacement(nodeFrom, nodeFrom + 1, Decoration.replace({}));
            ranges.push(Decoration.mark({ class: 'cm-italic' }).range(nodeFrom + 1, nodeTo - 1));
            addReplacement(nodeTo - 1, nodeTo, Decoration.replace({}));
          }
        } else {
          ranges.push(Decoration.mark({ class: 'cm-italic' }).range(nodeFrom, nodeTo));
        }
      }

      // Strikethrough (~~text~~)
      if (nodeName === 'Strikethrough') {
        const hasCursor = cursorInside(state, nodeFrom, nodeTo);
        if (!hasCursor) {
          const raw = state.doc.sliceString(nodeFrom, nodeTo);
          if (raw.startsWith('~~') && raw.endsWith('~~') && raw.length >= 4) {
            addReplacement(nodeFrom, nodeFrom + 2, Decoration.replace({}));
            ranges.push(Decoration.mark({ class: 'cm-strikethrough' }).range(nodeFrom + 2, nodeTo - 2));
            addReplacement(nodeTo - 2, nodeTo, Decoration.replace({}));
          }
        } else {
          ranges.push(Decoration.mark({ class: 'cm-strikethrough' }).range(nodeFrom, nodeTo));
        }
      }

      // Blockquote & Callout line styling
      if (nodeName === 'Blockquote') {
        const startLine = state.doc.lineAt(nodeFrom);
        const endLine = state.doc.lineAt(nodeTo);
        const firstLineText = startLine.text;

        // Detect GitHub-style callouts: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]
        const calloutMatch = firstLineText.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);

        if (calloutMatch) {
          const calloutType = calloutMatch[1].toLowerCase();

          // Apply line decoration to each line in the callout
          for (let l = startLine.number; l <= endLine.number; l++) {
            const line = state.doc.line(l);
            ranges.push(
              Decoration.line({
                class: `cm-callout cm-callout-${calloutType}`,
              }).range(line.from, line.from)
            );
          }

          // Replace [!TYPE] marker outside cursor
          const markerRegex = /(>\s*)(\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\])/i;
          const markerMatch = firstLineText.match(markerRegex);
          if (markerMatch && markerMatch.index !== undefined) {
            const markerStart = startLine.from + markerMatch.index + markerMatch[1].length;
            const markerEnd = markerStart + markerMatch[2].length;

            const hasCursor = cursorInside(state, markerStart, markerEnd);
            if (!hasCursor) {
              addReplacement(
                markerStart,
                markerEnd,
                Decoration.replace({
                  widget: new CalloutHeaderWidget(calloutType),
                })
              );
            }
          }
        } else {
          // Regular blockquote styling for all lines
          for (let l = startLine.number; l <= endLine.number; l++) {
            const line = state.doc.line(l);
            ranges.push(Decoration.line({ class: 'cm-blockquote-line' }).range(line.from, line.from));
          }
        }
      }

      // Task List Checkboxes
      if (nodeName === 'Task') {
        const text = state.doc.sliceString(nodeFrom, Math.min(nodeFrom + 4, nodeTo));
        const match = text.match(/^\[([ xX])\]/);
        if (match) {
          const isChecked = match[1].toLowerCase() === 'x';
          const hasCursor = cursorInside(state, nodeFrom, nodeFrom + 3);
          if (!hasCursor) {
            addReplacement(
              nodeFrom,
              nodeFrom + 3,
              Decoration.replace({
                widget: new TaskCheckboxWidget(isChecked, nodeFrom + 1),
              })
            );
          }
        }
      }

      // Inline Code (`code`)
      if (nodeName === 'InlineCode') {
        codeRanges.push({ from: nodeFrom, to: nodeTo });
        const hasCursor = cursorInside(state, nodeFrom, nodeTo);
        if (!hasCursor) {
          const raw = state.doc.sliceString(nodeFrom, nodeTo);
          if (raw.startsWith('`') && raw.endsWith('`') && raw.length >= 2) {
            addReplacement(nodeFrom, nodeFrom + 1, Decoration.replace({}));
            ranges.push(Decoration.mark({ class: 'cm-inline-code' }).range(nodeFrom + 1, nodeTo - 1));
            addReplacement(nodeTo - 1, nodeTo, Decoration.replace({}));
          }
        } else {
          ranges.push(Decoration.mark({ class: 'cm-inline-code' }).range(nodeFrom, nodeTo));
        }
      }

      // Horizontal Rule (---)
      if (nodeName === 'HorizontalRule') {
        const hasCursor = cursorInside(state, nodeFrom, nodeTo);
        if (!hasCursor) {
          addReplacement(
            nodeFrom,
            nodeTo,
            Decoration.replace({
              widget: new HorizontalRuleWidget(),
            })
          );
        }
      }
    },
  });

  // 4. Inline Math: $math$ (not preceded or followed by $, not inside code or existing replacements)
  const inlineMathRegex = /(?<!\\|\$)\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\$)/g;
  while ((match = inlineMathRegex.exec(docText)) !== null) {
    const matchFrom = match.index;
    const matchTo = match.index + match[0].length;
    if (isOccupied(matchFrom, matchTo)) continue;

    const hasCursor = cursorInside(state, matchFrom, matchTo);
    if (!hasCursor) {
      const mathContent = match[1];
      addReplacement(
        matchFrom,
        matchTo,
        Decoration.replace({
          widget: new InlineMathWidget(mathContent),
        })
      );
    }
  }

  // 5. Wiki-links: [[Target]] or [[Target|Display]]
  const wikiLinkRegex = /\[\[([^[\]\n]+?)\]\]/g;
  while ((match = wikiLinkRegex.exec(docText)) !== null) {
    const matchFrom = match.index;
    const matchTo = match.index + match[0].length;
    if (isOccupied(matchFrom, matchTo)) continue;

    const raw = match[1];
    let target = raw;
    let display = raw;
    if (raw.includes('|')) {
      const parts = raw.split('|');
      target = parts[0].trim();
      display = parts[1].trim() || target;
    }

    const hasCursor = cursorInside(state, matchFrom, matchTo);
    if (!hasCursor) {
      addReplacement(
        matchFrom,
        matchTo,
        Decoration.replace({
          widget: new WikiLinkWidget(target, display),
        })
      );
    } else {
      ranges.push(Decoration.mark({ class: 'cm-wikilink-edit' }).range(matchFrom, matchTo));
    }
  }

  // 6. Colored text spans: <span style="color: ...">text</span> and <font color="...">text</font>
  const spanColorRegex = /<span\b[^>]*?\bstyle\s*=\s*["']([^"']*?color\s*:\s*([^;"']+)[^"']*?)["'][^>]*>([\s\S]+?)<\/span>/gi;
  while ((match = spanColorRegex.exec(docText)) !== null) {
    const matchFrom = match.index;
    const matchTo = match.index + match[0].length;
    const color = match[2].trim();
    const openTagEnd = matchFrom + match[0].indexOf('>') + 1;
    const closeTagStart = matchTo - 7;
    const innerFrom = openTagEnd;
    const innerTo = closeTagStart;

    if (isInsideCode(matchFrom, matchTo)) continue;
    if (isOccupied(matchFrom, openTagEnd) || isOccupied(closeTagStart, matchTo)) continue;

    const hasCursor = cursorInside(state, matchFrom, matchTo);
    if (!hasCursor) {
      addReplacement(matchFrom, openTagEnd, Decoration.replace({}));
      if (innerFrom < innerTo) {
        ranges.push(
          Decoration.mark({
            attributes: { style: `color: ${color}` },
          }).range(innerFrom, innerTo)
        );
      }
      addReplacement(closeTagStart, matchTo, Decoration.replace({}));
    }
  }

  const fontColorRegex = /<font\b[^>]*?\bcolor\s*=\s*["']([^"']+?)["'][^>]*>([\s\S]+?)<\/font>/gi;
  while ((match = fontColorRegex.exec(docText)) !== null) {
    const matchFrom = match.index;
    const matchTo = match.index + match[0].length;
    const color = match[1].trim();
    const openTagEnd = matchFrom + match[0].indexOf('>') + 1;
    const closeTagStart = matchTo - 7;
    const innerFrom = openTagEnd;
    const innerTo = closeTagStart;

    if (isInsideCode(matchFrom, matchTo)) continue;
    if (isOccupied(matchFrom, openTagEnd) || isOccupied(closeTagStart, matchTo)) continue;

    const hasCursor = cursorInside(state, matchFrom, matchTo);
    if (!hasCursor) {
      addReplacement(matchFrom, openTagEnd, Decoration.replace({}));
      if (innerFrom < innerTo) {
        ranges.push(
          Decoration.mark({
            attributes: { style: `color: ${color}` },
          }).range(innerFrom, innerTo)
        );
      }
      addReplacement(closeTagStart, matchTo, Decoration.replace({}));
    }
  }

  // 7. Markdown Highlight syntax: ==highlight==
  const highlightRegex = /(?<![\\=])==(?!=)([^=\n]+?)(?<!=)==(?!=)/g;
  while ((match = highlightRegex.exec(docText)) !== null) {
    const matchFrom = match.index;
    const matchTo = match.index + match[0].length;
    if (isInsideCode(matchFrom, matchTo)) continue;
    if (isOccupied(matchFrom, matchFrom + 2) || isOccupied(matchTo - 2, matchTo)) continue;

    const hasCursor = cursorInside(state, matchFrom, matchTo);
    if (!hasCursor) {
      addReplacement(matchFrom, matchFrom + 2, Decoration.replace({}));
      ranges.push(Decoration.mark({ class: 'cm-text-highlight' }).range(matchFrom + 2, matchTo - 2));
      addReplacement(matchTo - 2, matchTo, Decoration.replace({}));
    } else {
      ranges.push(Decoration.mark({ class: 'cm-text-highlight' }).range(matchFrom, matchTo));
    }
  }

  return RangeSet.of(ranges, true);
}

export const livePreviewField = StateField.define<DecorationSet>({
  create(state) {
    return computeDecorations(state);
  },
  update(decorations, tr) {
    if (tr.docChanged || tr.selection) {
      return computeDecorations(tr.state);
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const livePreviewTheme = EditorView.baseTheme({
  '.cm-bullet-point': {
    color: 'var(--accent, #38bdf8)',
    fontWeight: 'bold',
    display: 'inline-block',
    marginRight: '0.5em',
    textAlign: 'center',
  },
  '.cm-callout': {
    paddingLeft: '14px',
    margin: '4px 0',
  },
  '.cm-callout-note': {
    borderLeft: '3px solid var(--accent, #38bdf8) !important',
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
  },
  '.cm-callout-tip': {
    borderLeft: '3px solid #4ade80 !important',
    backgroundColor: 'rgba(74, 222, 128, 0.06)',
  },
  '.cm-callout-important': {
    borderLeft: '3px solid #a855f7 !important',
    backgroundColor: 'rgba(168, 85, 247, 0.06)',
  },
  '.cm-callout-warning': {
    borderLeft: '3px solid var(--dirty, #eab308) !important',
    backgroundColor: 'rgba(234, 179, 8, 0.06)',
  },
  '.cm-callout-caution': {
    borderLeft: '3px solid var(--danger, #f43f5e) !important',
    backgroundColor: 'rgba(244, 63, 94, 0.06)',
  },
  '.cm-callout-badge': {
    fontFamily: 'var(--font-mono, monospace)',
    fontWeight: '700',
    fontSize: '0.9em',
    marginRight: '6px',
    display: 'inline-block',
  },
  '.cm-callout-badge-note': {
    color: 'var(--accent, #38bdf8)',
  },
  '.cm-callout-badge-tip': {
    color: '#4ade80',
  },
  '.cm-callout-badge-important': {
    color: '#a855f7',
  },
  '.cm-callout-badge-warning': {
    color: 'var(--dirty, #eab308)',
  },
  '.cm-callout-badge-caution': {
    color: 'var(--danger, #f43f5e)',
  },
  '.cm-text-highlight': {
    backgroundColor: 'rgba(234, 179, 8, 0.3)',
    color: 'inherit',
    padding: '1px 4px',
    borderRadius: '0px',
    borderBottom: '1px solid rgba(234, 179, 8, 0.6)',
  },
});

export function createLivePreviewPlugin(): Extension {
  return [livePreviewField, livePreviewTheme];
}
