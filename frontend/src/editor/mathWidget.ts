import katex from 'katex';
import { WidgetType } from '@codemirror/view';

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
    try {
      katex.render(cleanMath, span, {
        throwOnError: false,
        displayMode: false,
      });
    } catch (e) {
      span.textContent = `$${cleanMath}$`;
      span.className += ' cm-katex-error';
    }
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

  toDOM() {
    const div = document.createElement('div');
    div.className = 'cm-katex-block';
    div.title = 'Click to edit formula';
    const cleanMath = this.math.trim();
    try {
      katex.render(cleanMath, div, {
        throwOnError: false,
        displayMode: true,
      });
    } catch (e) {
      div.textContent = `$$\n${cleanMath}\n$$`;
      div.className += ' cm-katex-error';
    }
    return div;
  }

  ignoreEvent() {
    return false;
  }
}
