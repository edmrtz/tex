import katex from 'katex';
import { WidgetType } from '@codemirror/view';

const inlineMathHtmlCache = new Map<string, string>();
const blockMathHtmlCache = new Map<string, string>();
const blockMathHeightCache = new Map<string, number>();

export class InlineMathWidget extends WidgetType {
  constructor(readonly math: string) {
    super();
  }

  eq(other: InlineMathWidget) {
    return other.math === this.math;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-katex-inline';
    span.title = 'Click to edit math';
    const cleanMath = this.math.trim();
    let html = inlineMathHtmlCache.get(cleanMath);
    if (!html) {
      try {
        html = katex.renderToString(cleanMath, {
          throwOnError: false,
          displayMode: false,
        });
      } catch (e) {
        html = `<span class="cm-katex-error">$${cleanMath}$</span>`;
      }
      inlineMathHtmlCache.set(cleanMath, html);
    }
    span.innerHTML = html;
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

export class BlockMathWidget extends WidgetType {
  constructor(readonly math: string) {
    super();
  }

  eq(other: BlockMathWidget) {
    return other.math === this.math;
  }

  get estimatedHeight(): number {
    const cleanMath = this.math.trim();
    const cached = blockMathHeightCache.get(cleanMath);
    if (cached !== undefined && cached > 0) {
      return cached;
    }
    const lines = Math.max(1, (cleanMath.match(/\\\\|\n/g) || []).length + 1);
    return Math.max(54, lines * 28 + 24);
  }

  toDOM() {
    const div = document.createElement('div');
    div.className = 'cm-katex-block';
    div.title = 'Click to edit formula';
    const cleanMath = this.math.trim();
    let html = blockMathHtmlCache.get(cleanMath);
    if (!html) {
      try {
        html = katex.renderToString(cleanMath, {
          throwOnError: false,
          displayMode: true,
        });
      } catch (e) {
        html = `<div class="cm-katex-error">$$\n${cleanMath}\n$$</div>`;
      }
      blockMathHtmlCache.set(cleanMath, html);
    }
    div.innerHTML = html;

    if (!blockMathHeightCache.has(cleanMath)) {
      requestAnimationFrame(() => {
        if (div.isConnected) {
          const h = div.getBoundingClientRect().height;
          if (h > 0) {
            blockMathHeightCache.set(cleanMath, Math.round(h));
          }
        }
      });
    }

    return div;
  }

  ignoreEvent() {
    return false;
  }
}

