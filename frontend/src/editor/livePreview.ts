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

  // 1. Mermaid Code Blocks: ```mermaid ... ```
  const mermaidRegex = /```mermaid[^\n]*\r?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = mermaidRegex.exec(docText)) !== null) {
    const matchFrom = match.index;
    const matchTo = match.index + match[0].length;
    const hasCursor = cursorInside(state, matchFrom, matchTo);
    if (!hasCursor) {
      const mermaidCode = match[1];
      addReplacement(
        matchFrom,
        matchTo,
        Decoration.replace({
          widget: new MermaidWidget(mermaidCode),
          block: true,
        })
      );
    }
  }

  // 2. Block Math: $$ ... $$
  const blockMathRegex = /(?<!\\)\$\$([\s\S]+?)\$\$/g;
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

  // 3. Process Lezer Markdown AST
  syntaxTree(state).iterate({
    from: 0,
    to: state.doc.length,
    enter: (node) => {
      const nodeName = node.name;
      const nodeFrom = node.from;
      const nodeTo = node.to;

      // If this AST node is within a block that was already replaced (like Mermaid or Block Math), skip it
      if (isOccupied(nodeFrom, nodeTo)) return;

      // Header styling (ATXHeading1 to ATXHeading6)
      const headingMatch = nodeName.match(/^ATXHeading(\d)$/);
      if (headingMatch) {
        const level = headingMatch[1];
        const line = state.doc.lineAt(nodeFrom);
        const hasCursor = cursorOnSameLine(state, line.from, line.to);

        // Add styling to entire heading line
        ranges.push(
          Decoration.line({ class: `cm-heading cm-heading-${level}` }).range(line.from, line.from)
        );

        // Hide the '#' marks when cursor is elsewhere
        if (!hasCursor) {
          const lineText = state.doc.sliceString(nodeFrom, nodeTo);
          const hashPrefix = lineText.match(/^#{1,6}\s*/);
          if (hashPrefix) {
            addReplacement(
              nodeFrom,
              nodeFrom + hashPrefix[0].length,
              Decoration.replace({})
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

      // Blockquote line styling
      if (nodeName === 'Blockquote') {
        const line = state.doc.lineAt(nodeFrom);
        ranges.push(Decoration.line({ class: 'cm-blockquote-line' }).range(line.from, line.from));
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

export function createLivePreviewPlugin(): Extension {
  return [livePreviewField];
}
