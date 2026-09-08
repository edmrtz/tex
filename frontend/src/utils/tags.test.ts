import {
  normalizeTag,
  isValidTag,
  extractTags,
  addTagToContent,
  removeTagFromContent,
  getAllTagsWithCounts,
  parseSearchQuery,
  filterNotes,
} from './tags';

function strictEqual<T>(actual: T, expected: T, msg?: string) {
  if (actual !== expected) {
    throw new Error(msg || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
  }
}

function deepEqual<T>(actual: T, expected: T, msg?: string) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(msg || `Expected ${b} but got ${a}`);
  }
}

function ok(value: unknown, msg?: string) {
  if (!value) {
    throw new Error(msg || `Expected truthy value but got ${JSON.stringify(value)}`);
  }
}

console.log('Running tags.ts test suite...');

// 1. Tag Normalization
strictEqual(normalizeTag(''), '');
strictEqual(normalizeTag('#hello'), 'hello');
strictEqual(normalizeTag('###hello-world'), 'hello-world');
strictEqual(normalizeTag('  My Tag  '), 'my-tag');
strictEqual(normalizeTag('Project/Subproject'), 'project/subproject');
strictEqual(normalizeTag('tag@name!'), 'tagname');

// 2. Tag Validity
strictEqual(isValidTag(''), false);
strictEqual(isValidTag('   '), false);
strictEqual(isValidTag('#valid-tag'), true);
strictEqual(isValidTag('category/sub-category'), true);
strictEqual(isValidTag('tag_123'), true);

// 3. Extract Tags from YAML Frontmatter
const docWithFmList = `---
title: Sample Note
tags:
  - work
  - project-alpha
  - "quoted-tag"
---
# Content body
Some content here.
`;
deepEqual(extractTags(docWithFmList), ['project-alpha', 'quoted-tag', 'work']);

const docWithFmArray = `---
tags: [alpha, beta, gamma]
---
Body text
`;
deepEqual(extractTags(docWithFmArray), ['alpha', 'beta', 'gamma']);

const docWithFmScalar = `---
tag: single-tag
---
Body text
`;
deepEqual(extractTags(docWithFmScalar), ['single-tag']);

// 4. Extract Inline Tags from Body
const docWithInlineTags = `
# Heading 1
This is a #test of inline tags.
We also have #dev-log and #project/v1.

\`\`\`javascript
// Code block should be ignored:
const x = #notATag;
\`\`\`

Inline code \`#notThisEither\` should be ignored.
And hex color #ffffff or #fff should be ignored.
Link [Google](https://google.com#anchor) should be ignored.
`;
deepEqual(extractTags(docWithInlineTags), ['dev-log', 'project/v1', 'test']);

// 5. Adding Tags to Markdown Content
// Case A: No existing frontmatter
const rawDoc = '# My Note\nJust regular markdown text.';
const docAfterAdd1 = addTagToContent(rawDoc, 'first-tag');
ok(docAfterAdd1.startsWith('---\ntags:\n  - first-tag\n---') || docAfterAdd1.startsWith('---\r\ntags:\r\n  - first-tag\r\n---'));
deepEqual(extractTags(docAfterAdd1), ['first-tag']);

// Case B: Adding another tag to multiline list
const docAfterAdd2 = addTagToContent(docAfterAdd1, 'second-tag');
deepEqual(extractTags(docAfterAdd2), ['first-tag', 'second-tag']);

// Case C: Adding tag to inline array frontmatter
const arrayDoc = '---\ntags: [one, two]\n---\nBody';
const arrayDocAdded = addTagToContent(arrayDoc, 'three');
deepEqual(extractTags(arrayDocAdded), ['one', 'three', 'two']);

// Case D: Adding tag that already exists (idempotent)
const idemp = addTagToContent(arrayDocAdded, 'two');
strictEqual(idemp, arrayDocAdded);

// Case E: Adding tag when frontmatter exists without tags
const fmNoTags = '---\ntitle: Untitled\nauthor: Me\n---\nHello';
const fmWithAdded = addTagToContent(fmNoTags, 'new-tag');
ok(fmWithAdded.includes('title: Untitled'));
deepEqual(extractTags(fmWithAdded), ['new-tag']);

// 6. Removing Tags from Markdown Content
const docToRemove = '---\ntitle: Doc\ntags:\n  - keep-me\n  - delete-me\n---\nContent';
const docAfterRemove = removeTagFromContent(docToRemove, 'delete-me');
deepEqual(extractTags(docAfterRemove), ['keep-me']);
ok(docAfterRemove.includes('keep-me'));
ok(!docAfterRemove.includes('delete-me'));

// Removing all tags from array
const arrayToRemove = '---\ntags: [only-one]\n---\nBody';
const arrayAfterRemove = removeTagFromContent(arrayToRemove, 'only-one');
deepEqual(extractTags(arrayAfterRemove), []);

// 7. Aggregating Tags with Counts
const items = [
  { tags: ['work', 'project'] },
  { tags: ['work', 'personal'] },
  { tags: ['project'] },
];
const tagCounts = getAllTagsWithCounts(items);
deepEqual(tagCounts, [
  { tag: 'project', count: 2 },
  { tag: 'work', count: 2 },
  { tag: 'personal', count: 1 },
]);

// 8. Search Query Parsing
deepEqual(parseSearchQuery('hello'), {
  isTagSearch: false,
  tagQuery: '',
  textQuery: 'hello',
});
deepEqual(parseSearchQuery('#dev'), {
  isTagSearch: true,
  tagQuery: 'dev',
  textQuery: '',
});
deepEqual(parseSearchQuery('tag:meeting'), {
  isTagSearch: true,
  tagQuery: 'meeting',
  textQuery: '',
});
deepEqual(parseSearchQuery('custom', true), {
  isTagSearch: true,
  tagQuery: 'custom',
  textQuery: '',
});

// 9. Filtering Notes
const sampleNotes = [
  {
    title: 'Work Sprint Plan',
    path: '/docs/sprint.md',
    lastOpened: 1,
    tags: ['work', 'sprint'],
  },
  {
    title: 'Personal Budget',
    path: '/finance/budget.md',
    lastOpened: 2,
    tags: ['finance', 'personal'],
  },
  {
    title: 'Project Roadmap',
    path: '/work/roadmap.md',
    lastOpened: 3,
    tags: ['work', 'roadmap'],
  },
];

// General query matches title
strictEqual(filterNotes(sampleNotes, 'Sprint').length, 1);
// General query matches tag
strictEqual(filterNotes(sampleNotes, 'personal').length, 1);
// Tag query with # matches tag only
strictEqual(filterNotes(sampleNotes, '#work').length, 2);
// Tag query with tag: matches tag
strictEqual(filterNotes(sampleNotes, 'tag:sprint').length, 1);
// Active tag filter pill
strictEqual(filterNotes(sampleNotes, '', 'work').length, 2);
// Combined active tag filter and text search
strictEqual(filterNotes(sampleNotes, 'Roadmap', 'work').length, 1);

console.log('All tags.ts unit tests passed successfully!');
