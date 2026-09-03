import mermaid from 'mermaid';
import { WidgetType, type EditorView } from '@codemirror/view';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
  suppressErrorRendering: true,
});

let idCounter = 0;

export class MermaidWidget extends WidgetType {
  constructor(readonly code: string) {
    super();
  }

  eq(other: MermaidWidget) {
    return other.code === this.code;
  }

  toDOM(view: EditorView) {
    const container = document.createElement('div');
    container.className = 'cm-mermaid-container';
    container.title = 'Click to edit diagram';

    const cleanCode = this.code.trim();
    if (!cleanCode) {
      container.innerHTML = '<div class="cm-mermaid-placeholder">Empty Mermaid diagram</div>';
      return container;
    }

    const id = `mermaid_svg_${Date.now()}_${++idCounter}`;

    mermaid.render(id, cleanCode)
      .then(({ svg, bindFunctions }) => {
        container.innerHTML = svg;
        if (bindFunctions) {
          try {
            bindFunctions(container);
          } catch (e) {
            // ignore bind errors
          }
        }
        view?.requestMeasure?.();
      })
      .catch((err) => {
        container.innerHTML = `<div class="cm-mermaid-error">
          <div class="cm-mermaid-error-title">⚠️ Mermaid Syntax Error</div>
          <pre>${err?.message || 'Invalid syntax'}</pre>
        </div>`;
        view?.requestMeasure?.();
      });

    return container;
  }

  ignoreEvent() {
    return false;
  }
}
