import mermaid from 'mermaid';
import { WidgetType } from '@codemirror/view';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

let idCounter = 0;

export class MermaidWidget extends WidgetType {
  constructor(readonly code: string) {
    super();
  }

  eq(other: MermaidWidget) {
    return other.code === this.code;
  }

  toDOM() {
    const container = document.createElement('div');
    container.className = 'cm-mermaid-container';

    const id = `mermaid-render-${Date.now()}-${++idCounter}`;
    const cleanCode = this.code.trim();

    // Asynchronously render SVG
    mermaid.render(id, cleanCode)
      .then(({ svg }) => {
        container.innerHTML = svg;
      })
      .catch((err) => {
        container.innerHTML = `<div class="cm-mermaid-error">
          <div class="cm-mermaid-error-title">⚠️ Mermaid Syntax Error</div>
          <pre>${err?.message || 'Invalid syntax'}</pre>
        </div>`;
      });

    return container;
  }

  ignoreEvent() {
    return false;
  }
}
