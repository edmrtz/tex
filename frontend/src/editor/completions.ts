import {
  autocompletion,
  snippet,
  completeAnyWord,
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
    content: 'flowchart TD\n  Start[Start] --> Process[Process] --> End[End]',
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

/**
 * Autocompletion source for markdown syntax, code fences, mermaid diagrams,
 * GitHub callouts, markdown templates, and document words.
 */
export function markdownAutocompleteSource(context: CompletionContext): CompletionResult | null {
  // 1. If cursor is inside a wiki-link (`[[...`), let the wiki source handle it
  if (context.matchBefore(/\[\[([^\]]*)/)) {
    return null;
  }

  // 2. Code fence completions: typing ``` or ```lang
  const fenceMatch = context.matchBefore(/```[a-zA-Z0-9_-]*/);
  if (fenceMatch) {
    const line = context.state.doc.lineAt(context.pos);
    const textAfter = line.text.slice(context.pos - line.from);
    const hasClosingFence = textAfter.trim().startsWith('```');

    const options: Completion[] = [
      ...CODE_FENCE_LANGUAGES.map((lang) => ({
        label: lang,
        type: 'type',
        detail: 'Code fence',
        apply: hasClosingFence ? lang : snippet(`${lang}\n#{0}\n\`\`\``),
        boost: 10,
      })),
      ...MERMAID_DIAGRAM_SNIPPETS.map((d) => ({
        label: `mermaid: ${d.name}`,
        detail: `Mermaid ${d.name} diagram`,
        type: 'snippet',
        apply: snippet(`mermaid\n${d.content}\n\`\`\``),
        boost: 5,
      })),
    ];

    return {
      from: fenceMatch.from + 3,
      options,
      validFor: /^[a-zA-Z0-9_-]*$/,
    };
  }

  // 3. GitHub callout completions when line starts with blockquote `>`
  const line = context.state.doc.lineAt(context.pos);
  const textBeforeInLine = line.text.slice(0, context.pos - line.from);
  if (/^\s*>/.test(textBeforeInLine)) {
    const calloutMatch = context.matchBefore(/>\s*(\[!?[A-Za-z]*)?/);
    if (calloutMatch) {
      return {
        from: calloutMatch.from,
        options: GITHUB_CALLOUTS.map((c) => ({
          label: c.label,
          detail: c.detail,
          type: 'snippet',
          apply: snippet(`${c.label}\n> #{0}`),
          boost: 10,
        })),
        validFor: /^>\s*(\[!?[A-Za-z]*)?$/,
      };
    }
  }

  // 4. Math block triggered by typing `$$`
  const mathMatch = context.matchBefore(/\$\$/);
  if (mathMatch) {
    return {
      from: mathMatch.from,
      options: [
        {
          label: '$$',
          detail: 'Math block',
          type: 'snippet',
          apply: snippet('$$\n#{0}\n$$'),
          boost: 10,
        },
      ],
    };
  }

  // 5. Task item triggered by typing `- [`
  const taskMatch = context.matchBefore(/^\s*-\s*\[\s*\]?/);
  if (taskMatch) {
    return {
      from: taskMatch.from,
      options: [
        {
          label: '- [ ] ',
          detail: 'Task item checklist',
          type: 'snippet',
          apply: '- [ ] ',
          boost: 10,
        },
      ],
    };
  }

  // 6. Word-level completions (Mermaid snippets, Callouts, Templates, Document words)
  const wordMatch = context.matchBefore(/[\w-]+/);
  if (!wordMatch && !context.explicit) {
    return null;
  }

  const from = wordMatch ? wordMatch.from : context.pos;

  const generalSnippets: Completion[] = [
    // Mermaid diagram snippets
    ...MERMAID_DIAGRAM_SNIPPETS.map((d) => ({
      label: d.name,
      detail: d.detail,
      type: 'snippet',
      apply: snippet(`\`\`\`mermaid\n${d.content}\n\`\`\``),
      boost: 6,
    })),
    // Callout shortcuts
    ...GITHUB_CALLOUTS.map((c) => ({
      label: c.name.toLowerCase(),
      detail: `${c.label} callout`,
      type: 'snippet',
      apply: snippet(`${c.label}\n> #{0}`),
      boost: 4,
    })),
    // Markdown templates
    {
      label: 'table',
      detail: 'Markdown table',
      type: 'snippet',
      apply: snippet('| ${1:Col 1} | ${2:Col 2} |\n| --- | --- |\n| ${3:Val 1} | ${4:Val 2} |'),
      boost: 5,
    },
    {
      label: 'math',
      detail: 'Math block ($$)',
      type: 'snippet',
      apply: snippet('$$\n#{0}\n$$'),
      boost: 5,
    },
    {
      label: 'task',
      detail: 'Task item (- [ ])',
      type: 'snippet',
      apply: snippet('- [ ] ${0}'),
      boost: 5,
    },
    {
      label: 'todo',
      detail: 'Task item (- [ ])',
      type: 'snippet',
      apply: snippet('- [ ] ${0}'),
      boost: 5,
    },
    {
      label: 'mermaid',
      detail: 'Mermaid diagram block',
      type: 'snippet',
      apply: snippet('```mermaid\nflowchart TD\n  Start[Start] --> Process[Process] --> End[End]\n```'),
      boost: 5,
    },
  ];

  // Document words
  const wordResult = completeAnyWord(context);
  const wordOptions = wordResult && 'options' in wordResult ? wordResult.options : [];

  return {
    from,
    options: [...generalSnippets, ...wordOptions],
    validFor: /^[\w-]+$/,
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
 * Creates merged autocompletion extension with wiki-links and rich markdown snippets.
 */
export function createMarkdownAutocompleteExtension(
  getWorkspaceFiles?: () => string[]
): Extension {
  return autocompletion({
    override: [
      createWikiLinkAutocompleteSource(getWorkspaceFiles),
      markdownAutocompleteSource,
    ],
  });
}
