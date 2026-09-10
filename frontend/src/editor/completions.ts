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
 * Autocompletion source for markdown slash commands.
 * Only triggers when cursor is immediately after a '/' followed by optional command chars.
 */
export function markdownAutocompleteSource(context: CompletionContext): CompletionResult | null {
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
    ],
  });
}
