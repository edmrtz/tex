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
    try {
      katex.render(this.math, span, {
        throwOnError: false,
        displayMode: false,
      });
    } catch (e) {
      span.textContent = '$' + this.math + '$';
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
    try {
      katex.render(this.math, div, {
        throwOnError: false,
        displayMode: true,
      });
    } catch (e) {
      div.textContent = '$$\n' + this.math + '\n$$';
      div.className += ' cm-katex-error';
    }
    return div;
  }

  ignoreEvent() {
    return false;
  }
}
