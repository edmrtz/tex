import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';

export const CODE_FENCE_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'go',
  'bash',
  'json',
  'html',
  'css',
  'rust',
  'markdown',
  'sql',
  'yaml',
  'mermaid',
] as const;

export interface MermaidSnippetDef {
  name: string;
  label: string;
  detail: string;
  content: string;
}

export const MERMAID_DIAGRAM_SNIPPETS: MermaidSnippetDef[] = [
  {
    name: 'usecase',
    label: 'usecase',
    detail: 'Mermaid usecase-beta diagram',
    content: 'usecase-beta\n  actor User\n  system System {\n    usecase Action\n  }\n  User --> Action',
  },
  {
    name: 'flowchart',
    label: 'flowchart',
    detail: 'Mermaid flowchart TD diagram',
    content: 'flowchart TD\n  Start --> End',
  },
  {
    name: 'sequence',
    label: 'sequence',
    detail: 'Mermaid sequence diagram',
    content: 'sequenceDiagram\n  Alice->>Bob: Hello\n  Bob-->>Alice: Hi!',
  },
  {
    name: 'architecture',
    label: 'architecture',
    detail: 'Mermaid architecture-beta diagram',
    content: 'architecture-beta\n  group api(cloud)[API]\n  service db(database)[DB] in api',
  },
  {
    name: 'classDiagram',
    label: 'classDiagram',
    detail: 'Mermaid class diagram',
    content: 'classDiagram\n  class Animal {\n    +String name\n    +makeSound()\n  }\n  class Dog {\n    +bark()\n  }\n  Animal <|-- Dog',
  },
  {
    name: 'stateDiagram-v2',
    label: 'stateDiagram-v2',
    detail: 'Mermaid state diagram v2',
    content: 'stateDiagram-v2\n  [*] --> Still\n  Still --> [*]\n  Still --> Moving\n  Moving --> Still\n  Moving --> Crash\n  Crash --> [*]',
  },
  {
    name: 'erDiagram',
    label: 'erDiagram',
    detail: 'Mermaid entity relationship diagram',
    content: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE-ITEM : contains',
  },
  {
    name: 'gantt',
    label: 'gantt',
    detail: 'Mermaid gantt chart',
    content: 'gantt\n  title A Gantt Diagram\n  dateFormat YYYY-MM-DD\n  section Section\n    A task          :a1, 2024-01-01, 30d\n    After task a1   :after a1, 20d',
  },
  {
    name: 'pie',
    label: 'pie',
    detail: 'Mermaid pie chart',
    content: 'pie title Pets adopted by volunteers\n  "Dogs" : 386\n  "Cats" : 85\n  "Rats" : 15',
  },
  {
    name: 'mindmap',
    label: 'mindmap',
    detail: 'Mermaid mindmap diagram',
    content: 'mindmap\n  root((mindmap))\n    Origins\n      Long history\n      Popularisation\n    Research\n      On effectiveness\n    Tools\n      Pen and paper\n      Mermaid',
  },
];

export interface CalloutDef {
  name: string;
  label: string;
  detail: string;
}

export const GITHUB_CALLOUTS: CalloutDef[] = [
  { name: 'NOTE', label: '> [!NOTE]', detail: 'Note callout' },
  { name: 'TIP', label: '> [!TIP]', detail: 'Tip callout' },
  { name: 'IMPORTANT', label: '> [!IMPORTANT]', detail: 'Important callout' },
  { name: 'WARNING', label: '> [!WARNING]', detail: 'Warning callout' },
  { name: 'CAUTION', label: '> [!CAUTION]', detail: 'Caution callout' },
];

export interface SlashCommandDef {
  label: string;
  detail: string;
  apply: string;
}

export const SLASH_COMMANDS: SlashCommandDef[] = [
  // Headings
  { label: '/h1', detail: 'Heading 1', apply: '# ' },
  { label: '/h2', detail: 'Heading 2', apply: '## ' },
  { label: '/h3', detail: 'Heading 3', apply: '### ' },
  { label: '/h4', detail: 'Heading 4', apply: '#### ' },
  { label: '/h5', detail: 'Heading 5', apply: '##### ' },
  { label: '/h6', detail: 'Heading 6', apply: '###### ' },

  // Mermaid diagrams
  {
    label: '/mermaid',
    detail: 'Mermaid flowchart diagram',
    apply: '```mermaid\nflowchart TD\n  Start --> End\n```',
  },
  {
    label: '/mermaid:flowchart',
    detail: 'Mermaid flowchart diagram',
    apply: '```mermaid\nflowchart TD\n  Start --> End\n```',
  },
  {
    label: '/mermaid:sequence',
    detail: 'Mermaid sequence diagram',
    apply: '```mermaid\nsequenceDiagram\n  Alice->>Bob: Hello\n```',
  },
  {
    label: '/mermaid:usecase',
    detail: 'Mermaid usecase diagram',
    apply: '```mermaid\nusecase-beta\n  actor User\n  system System {\n    usecase Action\n  }\n  User --> Action\n```',
  },
  {
    label: '/mermaid:architecture',
    detail: 'Mermaid architecture diagram',
    apply: '```mermaid\narchitecture-beta\n  group api(cloud)[API]\n  service db(database)[DB] in api\n```',
  },
  {
    label: '/mermaid:class',
    detail: 'Mermaid class diagram',
    apply: '```mermaid\nclassDiagram\n  class Animal {\n    +String name\n    +makeSound()\n  }\n  class Dog {\n    +bark()\n  }\n  Animal <|-- Dog\n```',
  },
  {
    label: '/mermaid:state',
    detail: 'Mermaid state diagram',
    apply: '```mermaid\nstateDiagram-v2\n  [*] --> Still\n  Still --> [*]\n  Still --> Moving\n  Moving --> Still\n  Moving --> Crash\n  Crash --> [*]\n```',
  },
  {
    label: '/mermaid:er',
    detail: 'Mermaid entity relationship diagram',
    apply: '```mermaid\nerDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE-ITEM : contains\n```',
  },
  {
    label: '/mermaid:mindmap',
    detail: 'Mermaid mindmap diagram',
    apply: '```mermaid\nmindmap\n  root((mindmap))\n    Origins\n      Long history\n      Popularisation\n    Research\n      On effectiveness\n    Tools\n      Pen and paper\n      Mermaid\n```',
  },

  // Math
  { label: '/math', detail: 'Inline math ($  $)', apply: '$  $' },
  { label: '/mathblock', detail: 'Math block ($$)', apply: '$$\n\n$$' },
  { label: '/math-block', detail: 'Math block ($$)', apply: '$$\n\n$$' },

  // Table & Code
  {
    label: '/table',
    detail: 'Markdown table',
    apply: '| Column 1 | Column 2 |\n| --- | --- |\n| Item 1 | Item 2 |',
  },
  { label: '/code', detail: 'Code block', apply: '```\n\n```' },

  // Callouts
  { label: '/note', detail: 'Note callout', apply: '> [!NOTE]\n> ' },
  { label: '/tip', detail: 'Tip callout', apply: '> [!TIP]\n> ' },
  { label: '/important', detail: 'Important callout', apply: '> [!IMPORTANT]\n> ' },
  { label: '/warning', detail: 'Warning callout', apply: '> [!WARNING]\n> ' },
  { label: '/caution', detail: 'Caution callout', apply: '> [!CAUTION]\n> ' },

  // Lists & tasks
  { label: '/todo', detail: 'Task checklist item', apply: '- [ ] ' },
  { label: '/task', detail: 'Task checklist item', apply: '- [ ] ' },
  { label: '/bullet', detail: 'Bullet list item', apply: '- ' },
  { label: '/list', detail: 'Bullet list item', apply: '- ' },
  { label: '/num', detail: 'Numbered list item', apply: '1. ' },
  { label: '/numbered', detail: 'Numbered list item', apply: '1. ' },

  // Other markdown constructs
  { label: '/quote', detail: 'Blockquote', apply: '> ' },
  { label: '/hr', detail: 'Horizontal rule divider', apply: '---' },
  { label: '/divider', detail: 'Horizontal rule divider', apply: '---' },
  { label: '/link', detail: 'Markdown link', apply: '[text](url)' },
  { label: '/image', detail: 'Markdown image', apply: '![alt](url)' },
];

/**
 * Detects whether the current cursor position is inside a KaTeX inline ($...$) or block ($$...$$) math environment.
 */
export function isInsideMath(doc: string, pos: number): boolean {
  // 1. Check multi-line block math: $$ ... $$
  let inBlock = false;
  let blockStart = -1;
  let idx = 0;
  while ((idx = doc.indexOf('$$', idx)) !== -1) {
    if (idx >= pos) break;
    inBlock = !inBlock;
    blockStart = idx;
    idx += 2;
  }
  if (inBlock) {
    const nextClose = doc.indexOf('$$', blockStart + 2);
    if (nextClose === -1 || nextClose >= pos) {
      return true;
    }
  }

  // 2. Check inline math: $ ... $ (single dollar sign on current line)
  const lineStart = doc.lastIndexOf('\n', pos - 1) + 1;
  const lineEndIdx = doc.indexOf('\n', pos);
  const lineEnd = lineEndIdx === -1 ? doc.length : lineEndIdx;
  const lineText = doc.slice(lineStart, lineEnd);
  const linePos = pos - lineStart;

  let inInline = false;
  for (let i = 0; i < lineText.length; i++) {
    if (lineText[i] === '$' && (i === 0 || lineText[i - 1] !== '\\')) {
      if (lineText[i + 1] === '$') {
        i++; // skip block marker
        continue;
      }
      if (i >= linePos) break;
      inInline = !inInline;
    }
  }

  if (inInline) {
    for (let i = linePos; i < lineText.length; i++) {
      if (lineText[i] === '$' && (i === 0 || lineText[i - 1] !== '\\')) {
        return true;
      }
    }
  }

  return false;
}

export interface KaTeXSuggestionDef {
  label: string;
  detail: string;
  apply: string;
}

export const KATEX_MATH_SUGGESTIONS: KaTeXSuggestionDef[] = [
  // Common math constructs
  { label: '\\frac', detail: 'Fraction \\frac{a}{b}', apply: '\\frac{a}{b}' },
  { label: '\\sqrt', detail: 'Square root \\sqrt{x}', apply: '\\sqrt{x}' },
  { label: '\\sum', detail: 'Summation \\sum_{i=0}^{n}', apply: '\\sum_{i=0}^{n} ' },
  { label: '\\prod', detail: 'Product \\prod_{i=0}^{n}', apply: '\\prod_{i=0}^{n} ' },
  { label: '\\int', detail: 'Integral \\int_{a}^{b}', apply: '\\int_{a}^{b} ' },
  { label: '\\iint', detail: 'Double integral', apply: '\\iint ' },
  { label: '\\oint', detail: 'Contour integral', apply: '\\oint ' },
  { label: '\\lim', detail: 'Limit \\lim_{x \\to 0}', apply: '\\lim_{x \\to 0} ' },
  { label: '\\infty', detail: 'Infinity ∞', apply: '\\infty' },
  { label: '\\partial', detail: 'Partial derivative ∂', apply: '\\partial' },
  { label: '\\nabla', detail: 'Nabla / Del ∇', apply: '\\nabla' },

  // Greek lowercase
  { label: '\\alpha', detail: 'Greek alpha α', apply: '\\alpha' },
  { label: '\\beta', detail: 'Greek beta β', apply: '\\beta' },
  { label: '\\gamma', detail: 'Greek gamma γ', apply: '\\gamma' },
  { label: '\\delta', detail: 'Greek delta δ', apply: '\\delta' },
  { label: '\\epsilon', detail: 'Greek epsilon ε', apply: '\\epsilon' },
  { label: '\\theta', detail: 'Greek theta θ', apply: '\\theta' },
  { label: '\\lambda', detail: 'Greek lambda λ', apply: '\\lambda' },
  { label: '\\mu', detail: 'Greek mu μ', apply: '\\mu' },
  { label: '\\pi', detail: 'Greek pi π', apply: '\\pi' },
  { label: '\\sigma', detail: 'Greek sigma σ', apply: '\\sigma' },
  { label: '\\tau', detail: 'Greek tau τ', apply: '\\tau' },
  { label: '\\phi', detail: 'Greek phi φ', apply: '\\phi' },
  { label: '\\omega', detail: 'Greek omega ω', apply: '\\omega' },

  // Greek uppercase
  { label: '\\Delta', detail: 'Greek Delta Δ', apply: '\\Delta' },
  { label: '\\Sigma', detail: 'Greek Sigma Σ', apply: '\\Sigma' },
  { label: '\\Omega', detail: 'Greek Omega Ω', apply: '\\Omega' },
  { label: '\\Gamma', detail: 'Greek Gamma Γ', apply: '\\Gamma' },
  { label: '\\Theta', detail: 'Greek Theta Θ', apply: '\\Theta' },
  { label: '\\Lambda', detail: 'Greek Lambda Λ', apply: '\\Lambda' },

  // Relations & operators
  { label: '\\times', detail: 'Times ×', apply: '\\times' },
  { label: '\\cdot', detail: 'Dot product ·', apply: '\\cdot' },
  { label: '\\pm', detail: 'Plus-minus ±', apply: '\\pm' },
  { label: '\\div', detail: 'Division ÷', apply: '\\div' },
  { label: '\\leq', detail: 'Less than or equal ≤', apply: '\\leq' },
  { label: '\\geq', detail: 'Greater than or equal ≥', apply: '\\geq' },
  { label: '\\neq', detail: 'Not equal ≠', apply: '\\neq' },
  { label: '\\approx', detail: 'Approximately ≈', apply: '\\approx' },
  { label: '\\equiv', detail: 'Equivalent ≡', apply: '\\equiv' },

  // Arrows
  { label: '\\rightarrow', detail: 'Right arrow →', apply: '\\rightarrow' },
  { label: '\\leftarrow', detail: 'Left arrow ←', apply: '\\leftarrow' },
  { label: '\\rArr', detail: 'Double right arrow ⇒', apply: '\\rArr' },
  { label: '\\lArr', detail: 'Double left arrow ⇐', apply: '\\lArr' },
  { label: '\\Rightarrow', detail: 'Right implication ⇒', apply: '\\Rightarrow' },
  { label: '\\Leftarrow', detail: 'Left implication ⇐', apply: '\\Leftarrow' },
  { label: '\\leftrightarrow', detail: 'Left-right arrow ↔', apply: '\\leftrightarrow' },
  { label: '\\Leftrightarrow', detail: 'Equivalence ⇔', apply: '\\Leftrightarrow' },

  // Sets & logic
  { label: '\\in', detail: 'Element of ∈', apply: '\\in' },
  { label: '\\notin', detail: 'Not element of ∉', apply: '\\notin' },
  { label: '\\subset', detail: 'Subset ⊂', apply: '\\subset' },
  { label: '\\subseteq', detail: 'Subset or equal ⊆', apply: '\\subseteq' },
  { label: '\\cup', detail: 'Union ∪', apply: '\\cup' },
  { label: '\\cap', detail: 'Intersection ∩', apply: '\\cap' },
  { label: '\\emptyset', detail: 'Empty set ∅', apply: '\\emptyset' },
  { label: '\\forall', detail: 'For all ∀', apply: '\\forall' },
  { label: '\\exists', detail: 'There exists ∃', apply: '\\exists' },

  // Formatting & environments
  { label: '\\text', detail: 'Text mode \\text{...}', apply: '\\text{text}' },
  { label: '\\mathbf', detail: 'Bold math \\mathbf{...}', apply: '\\mathbf{X}' },
  { label: '\\mathit', detail: 'Italic math \\mathit{...}', apply: '\\mathit{X}' },
  { label: '\\begin{matrix}', detail: 'Matrix environment', apply: '\\begin{matrix}\n  a & b \\\\\n  c & d\n\\end{matrix}' },
  { label: '\\begin{pmatrix}', detail: 'Parenthesized matrix', apply: '\\begin{pmatrix}\n  a & b \\\\\n  c & d\n\\end{pmatrix}' },
  { label: '\\begin{bmatrix}', detail: 'Bracketed matrix', apply: '\\begin{bmatrix}\n  a & b \\\\\n  c & d\n\\end{bmatrix}' },
  { label: '\\begin{cases}', detail: 'Cases / piecewise function', apply: '\\begin{cases}\n  a & \\text{if } x > 0 \\\\\n  b & \\text{otherwise}\n\\end{cases}' },
  { label: '\\begin{aligned}', detail: 'Aligned equations', apply: '\\begin{aligned}\n  a &= b + c \\\\\n  d &= e + f\n\\end{aligned}' },
];

/**
 * Autocompletion source for KaTeX math commands.
 * ONLY triggers when cursor is strictly inside a math environment ($...$ or $$...$$).
 */
export function katexAutocompleteSource(context: CompletionContext): CompletionResult | null {
  const doc = context.state.doc.toString();
  if (!isInsideMath(doc, context.pos)) {
    return null;
  }

  const match = context.matchBefore(/\\[a-zA-Z]*/);
  if (!match) {
    return null;
  }

  const options: Completion[] = KATEX_MATH_SUGGESTIONS.map((sugg) => ({
    label: sugg.label,
    detail: sugg.detail,
    type: 'function',
    apply: sugg.apply,
  }));

  return {
    from: match.from,
    options,
    validFor: /^\\[a-zA-Z]*$/,
  };
}

/**
 * Autocompletion source for markdown slash commands.
 * Triggers ONLY outside math environments.
 */
export function markdownAutocompleteSource(context: CompletionContext): CompletionResult | null {
  const doc = context.state.doc.toString();
  if (isInsideMath(doc, context.pos)) {
    return null;
  }

  const match = context.matchBefore(/\/([a-zA-Z0-9_\-:]*)/);
  if (!match) {
    return null;
  }

  const options: Completion[] = SLASH_COMMANDS.map((cmd) => ({
    label: cmd.label,
    detail: cmd.detail,
    type: 'keyword',
    apply: cmd.apply,
  }));

  return {
    from: match.from,
    options,
    validFor: /^\/([a-zA-Z0-9_\-:]*)$/,
  };
}

/**
 * Creates wiki-link autocomplete source using workspace files list.
 */
export function createWikiLinkAutocompleteSource(
  getWorkspaceFiles?: () => string[]
): CompletionSource {
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/\[\[([^\]]*)/);
    if (!word) return null;
    const query = word.text.slice(2).toLowerCase();
    const files = getWorkspaceFiles ? getWorkspaceFiles() : [];
    return {
      from: word.from + 2,
      options: files
        .map((file) => {
          const clean = file.replace(/\.md$/i, '');
          return {
            label: clean,
            type: 'text',
            apply: `${clean}]]`,
          };
        })
        .filter((opt) => opt.label.toLowerCase().includes(query)),
    };
  };
}

/**
 * Creates merged autocompletion extension with wiki-links and slash commands.
 */
export function createMarkdownAutocompleteExtension(
  getWorkspaceFiles?: () => string[]
): Extension {
  return autocompletion({
    override: [
      createWikiLinkAutocompleteSource(getWorkspaceFiles),
      markdownAutocompleteSource,
      katexAutocompleteSource,
    ],
  });
}
