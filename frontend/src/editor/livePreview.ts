import {
  ViewPlugin,
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import { RangeSetBuilder, Range } from '@codemirror/state';
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

// Check if cursor or selection overlaps [from, to] (inclusive of cursor at boundary)
function cursorOverlaps(view: EditorView, from: number, to: number): boolean {
  for (const range of view.state.selection.ranges) {
    // If range touches anywhere from - 1 to to + 1
    if (range.empty) {
      if (range.head >= from - 1 && range.head <= to + 1) return true;
    } else {
      if (range.to >= from && range.from <= to) return true;
    }
  }
  return false;
}

// Check if cursor is on the same line as [from, to]
function cursorOnSameLine(view: EditorView, lineFrom: number, lineTo: number): boolean {
  for (const range of view.state.selection.ranges) {
    if (range.head >= lineFrom && range.head <= lineTo) return true;
  }
  return false;
}

export function createLivePreviewPlugin() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.computeDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = this.computeDecorations(update.view);
        }
      }

      computeDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const { state } = view;
        const docText = state.doc.toString();

        // 1. Process Lezer Markdown AST in the visible viewport
        for (const { from, to } of view.visibleRanges) {
          syntaxTree(state).iterate({
            from,
            to,
            enter: (node) => {
              const nodeName = node.name;
              const nodeFrom = node.from;
              const nodeTo = node.to;

              // Header styling (ATXHeading1 to ATXHeading6)
              const headingMatch = nodeName.match(/^ATXHeading(\d)$/);
              if (headingMatch) {
                const level = headingMatch[1];
                const line = state.doc.lineAt(nodeFrom);
                const hasCursor = cursorOnSameLine(view, line.from, line.to);

                // Add styling to entire heading line
                builder.add(
                  line.from,
                  line.from,
                  Decoration.line({ class: `cm-heading cm-heading-${level}` })
                );

                // Hide the '#' marks when cursor is elsewhere
                if (!hasCursor) {
                  const lineText = state.doc.sliceString(nodeFrom, nodeTo);
                  const hashPrefix = lineText.match(/^#{1,6}\s*/);
                  if (hashPrefix) {
                    builder.add(
                      nodeFrom,
                      nodeFrom + hashPrefix[0].length,
                      Decoration.replace({})
                    );
                  }
                }
              }

              // Strong / Bold (**text**)
              if (nodeName === 'StrongEmphasis') {
                const hasCursor = cursorOverlaps(view, nodeFrom, nodeTo);
                if (!hasCursor) {
                  const raw = state.doc.sliceString(nodeFrom, nodeTo);
                  if (raw.startsWith('**') && raw.endsWith('**') && raw.length >= 4) {
                    builder.add(nodeFrom, nodeFrom + 2, Decoration.replace({}));
                    builder.add(nodeFrom + 2, nodeTo - 2, Decoration.mark({ class: 'cm-bold' }));
                    builder.add(nodeTo - 2, nodeTo, Decoration.replace({}));
                  }
                } else {
                  builder.add(nodeFrom, nodeTo, Decoration.mark({ class: 'cm-bold' }));
                }
              }

              // Emphasis / Italic (*text* or _text_)
              if (nodeName === 'Emphasis') {
                const hasCursor = cursorOverlaps(view, nodeFrom, nodeTo);
                if (!hasCursor) {
                  const raw = state.doc.sliceString(nodeFrom, nodeTo);
                  const marker = raw[0];
                  if ((marker === '*' || marker === '_') && raw.endsWith(marker) && raw.length >= 2) {
                    builder.add(nodeFrom, nodeFrom + 1, Decoration.replace({}));
                    builder.add(nodeFrom + 1, nodeTo - 1, Decoration.mark({ class: 'cm-italic' }));
                    builder.add(nodeTo - 1, nodeTo, Decoration.replace({}));
                  }
                } else {
                  builder.add(nodeFrom, nodeTo, Decoration.mark({ class: 'cm-italic' }));
                }
              }

              // Strikethrough (~~text~~)
              if (nodeName === 'Strikethrough') {
                const hasCursor = cursorOverlaps(view, nodeFrom, nodeTo);
                if (!hasCursor) {
                  const raw = state.doc.sliceString(nodeFrom, nodeTo);
                  if (raw.startsWith('~~') && raw.endsWith('~~') && raw.length >= 4) {
                    builder.add(nodeFrom, nodeFrom + 2, Decoration.replace({}));
                    builder.add(nodeFrom + 2, nodeTo - 2, Decoration.mark({ class: 'cm-strikethrough' }));
                    builder.add(nodeTo - 2, nodeTo, Decoration.replace({}));
                  }
                } else {
                  builder.add(nodeFrom, nodeTo, Decoration.mark({ class: 'cm-strikethrough' }));
                }
              }

              // Blockquote line styling
              if (nodeName === 'Blockquote') {
                const line = state.doc.lineAt(nodeFrom);
                builder.add(line.from, line.from, Decoration.line({ class: 'cm-blockquote-line' }));
              }

              // Task List Checkboxes
              if (nodeName === 'Task') {
                const text = state.doc.sliceString(nodeFrom, Math.min(nodeFrom + 4, nodeTo));
                const match = text.match(/^\[([ xX])\]/);
                if (match) {
                  const isChecked = match[1].toLowerCase() === 'x';
                  const hasCursor = cursorOverlaps(view, nodeFrom, nodeFrom + 3);
                  if (!hasCursor) {
                    // Replace [ ] with interactive widget
                    builder.add(
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
                const hasCursor = cursorOverlaps(view, nodeFrom, nodeTo);
                if (!hasCursor) {
                  const raw = state.doc.sliceString(nodeFrom, nodeTo);
                  if (raw.startsWith('`') && raw.endsWith('`') && raw.length >= 2) {
                    builder.add(nodeFrom, nodeFrom + 1, Decoration.replace({}));
                    builder.add(nodeFrom + 1, nodeTo - 1, Decoration.mark({ class: 'cm-inline-code' }));
                    builder.add(nodeTo - 1, nodeTo, Decoration.replace({}));
                  }
                } else {
                  builder.add(nodeFrom, nodeTo, Decoration.mark({ class: 'cm-inline-code' }));
                }
              }

              // Horizontal Rule (---)
              if (nodeName === 'HorizontalRule') {
                const hasCursor = cursorOverlaps(view, nodeFrom, nodeTo);
                if (!hasCursor) {
                  builder.add(
                    nodeFrom,
                    nodeTo,
                    Decoration.replace({
                      widget: new (class extends WidgetType {
                        toDOM() {
                          const hr = document.createElement('hr');
                          hr.className = 'cm-hr';
                          return hr;
                        }
                      })(),
                    })
                  );
                }
              }
            },
          });
        }

        // 2. Math ($inline$ and $$block$$) and Mermaid fenced code blocks
        // We scan regex matches across the doc text in visible range
        const viewFrom = view.visibleRanges[0]?.from ?? 0;
        const viewTo = view.visibleRanges[view.visibleRanges.length - 1]?.to ?? docText.length;
        const extraDecorations: Range<Decoration>[] = [];

        // Block Math: $$ ... $$
        const blockMathRegex = /\$\$\n?([\s\S]*?)\n?\$\$/g;
        let match: RegExpExecArray | null;
        while ((match = blockMathRegex.exec(docText)) !== null) {
          const matchFrom = match.index;
          const matchTo = match.index + match[0].length;
          if (matchTo < viewFrom || matchFrom > viewTo) continue;

          const hasCursor = cursorOverlaps(view, matchFrom, matchTo);
          if (!hasCursor) {
            const mathContent = match[1];
            extraDecorations.push(
              Decoration.replace({
                widget: new BlockMathWidget(mathContent),
                block: true,
              }).range(matchFrom, matchTo)
            );
          }
        }

        // Inline Math: $...$ (not preceded or followed by $)
        const inlineMathRegex = /(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g;
        while ((match = inlineMathRegex.exec(docText)) !== null) {
          const matchFrom = match.index;
          const matchTo = match.index + match[0].length;
          if (matchTo < viewFrom || matchFrom > viewTo) continue;

          // Skip if inside block math
          const hasCursor = cursorOverlaps(view, matchFrom, matchTo);
          if (!hasCursor) {
            const mathContent = match[1];
            extraDecorations.push(
              Decoration.replace({
                widget: new InlineMathWidget(mathContent),
              }).range(matchFrom, matchTo)
            );
          }
        }

        // Mermaid Code Blocks: ```mermaid ... ```
        const mermaidRegex = /```mermaid\r?\n([\s\S]*?)```/g;
        while ((match = mermaidRegex.exec(docText)) !== null) {
          const matchFrom = match.index;
          const matchTo = match.index + match[0].length;
          if (matchTo < viewFrom || matchFrom > viewTo) continue;

          const hasCursor = cursorOverlaps(view, matchFrom, matchTo);
          if (!hasCursor) {
            const mermaidCode = match[1];
            extraDecorations.push(
              Decoration.replace({
                widget: new MermaidWidget(mermaidCode),
                block: true,
              }).range(matchFrom, matchTo)
            );
          }
        }

        // Sort and add extra decorations safely
        extraDecorations.sort((a, b) => a.from - b.from);
        for (const deco of extraDecorations) {
          try {
            builder.add(deco.from, deco.to, deco.value);
          } catch (e) {
            // Overlap handling fallback
          }
        }

        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );
}
