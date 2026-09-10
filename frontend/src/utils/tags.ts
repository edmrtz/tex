import type { RecentItem } from '../types';

/**
 * Normalizes a tag string by stripping leading '#', trimming whitespace,
 * replacing internal spaces with hyphens, and removing special punctuation.
 */
export function normalizeTag(rawTag: string): string {
  if (!rawTag) return '';
  let tag = rawTag.trim();
  // Strip leading '#' characters
  tag = tag.replace(/^#+/, '');
  // Replace whitespace with hyphens
  tag = tag.replace(/\s+/g, '-');
  // Strip invalid characters (keep alphanumeric, underscores, hyphens, and forward slashes for nested tags)
  tag = tag.replace(/[^a-zA-Z0-9_\-\/]/g, '');
  return tag.toLowerCase();
}

/**
 * Validates whether a string is a valid tag name.
 */
export function isValidTag(rawTag: string): boolean {
  const normalized = normalizeTag(rawTag);
  return normalized.length > 0 && /^[a-zA-Z0-9_\-\/]+$/.test(normalized);
}

interface FrontmatterParseResult {
  hasFrontmatter: boolean;
  rawFrontmatter: string;
  frontmatterBody: string;
  body: string;
  startOffset: number;
  endOffset: number;
}

/**
 * Splits document content into frontmatter and body.
 */
export function parseFrontmatter(content: string): FrontmatterParseResult {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (!match) {
    return {
      hasFrontmatter: false,
      rawFrontmatter: '',
      frontmatterBody: '',
      body: content,
      startOffset: 0,
      endOffset: 0,
    };
  }

  return {
    hasFrontmatter: true,
    rawFrontmatter: match[0],
    frontmatterBody: match[1],
    body: content.slice(match[0].length),
    startOffset: 0,
    endOffset: match[0].length,
  };
}

/**
 * Extracts tags defined in YAML frontmatter.
 * Supports:
 *   tags: [foo, bar]
 *   tags:
 *     - foo
 *     - bar
 *   tags: foo, bar
 *   tag: foo
 */
export function extractFrontmatterTags(frontmatterText: string): string[] {
  const tags = new Set<string>();
  if (!frontmatterText.trim()) return [];

  const lines = frontmatterText.split(/\r?\n/);
  let inTagsList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if we are inside a multiline list under tags:
    if (inTagsList) {
      const listMatch = line.match(/^\s*-\s+(.+)$/);
      if (listMatch) {
        const item = listMatch[1].replace(/['"]/g, '').trim();
        const norm = normalizeTag(item);
        if (norm) tags.add(norm);
        continue;
      } else if (/^\s*$/.test(line)) {
        // blank line inside frontmatter, continue
        continue;
      } else {
        // Some other property began
        inTagsList = false;
      }
    }

    // Match tags: [...]
    const inlineArrayMatch = line.match(/^\s*tags?\s*:\s*\[(.*?)\]/i);
    if (inlineArrayMatch) {
      const items = inlineArrayMatch[1].split(',');
      for (const item of items) {
        const cleaned = item.replace(/['"]/g, '').trim();
        const norm = normalizeTag(cleaned);
        if (norm) tags.add(norm);
      }
      continue;
    }

    // Match tags: followed by list on subsequent lines or same line
    const tagKeyMatch = line.match(/^\s*tags?\s*:\s*(.*)$/i);
    if (tagKeyMatch) {
      const value = tagKeyMatch[1].trim();
      if (!value) {
        // Multiline bullet list starts next line
        inTagsList = true;
        continue;
      } else {
        // Comma separated or single value: tags: foo, bar
        const items = value.split(',');
        for (const item of items) {
          const cleaned = item.replace(/['"]/g, '').trim();
          const norm = normalizeTag(cleaned);
          if (norm) tags.add(norm);
        }
      }
    }
  }

  return Array.from(tags);
}

/**
 * Extracts inline #tags from markdown content, avoiding:
 * - Lines starting with # (headings, line-starting #text, etc.)
 * - Fenced code blocks and inline code
 * - Markdown links and URLs
 * - Color hex codes
 */
export function extractInlineTags(bodyContent: string): string[] {
  const tags = new Set<string>();
  if (!bodyContent.trim()) return [];

  // Remove fenced code blocks
  let text = bodyContent.replace(/```[\s\S]*?```/g, ' ');
  // Strip any line that starts with # (headings, line-starting #text, etc.)
  // Lines starting with # MUST NEVER be treated as tags
  text = text.replace(/^\s*#.*$/gm, ' ');
  // Remove inline code
  text = text.replace(/`[^`\n]*`/g, ' ');
  // Remove markdown links e.g. [text](url#anchor)
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  // Match #tag patterns:
  // Must be preceded by start of line, whitespace, or punctuation like ( [ {
  // Must start with # and a letter or number containing letters (e.g. #project, #tag-1, #v1/sub)
  // Must not be immediately followed by another # or space
  const regex = /(?:^|[\s([{<'"`,.;:!?])#([a-zA-Z][a-zA-Z0-9_\-\/]*|[0-9]+[a-zA-Z_\-\/][a-zA-Z0-9_\-\/]*)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const rawMatch = match[1];
    // Filter out common hex colors like #fff or #123456
    if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(rawMatch)) {
      continue;
    }
    const norm = normalizeTag(rawMatch);
    if (norm) {
      tags.add(norm);
    }
  }

  return Array.from(tags);
}

/**
 * Extracts all tags from a document (both frontmatter and inline body tags).
 */
export function extractTags(content: string): string[] {
  if (!content) return [];
  const { hasFrontmatter, frontmatterBody, body } = parseFrontmatter(content);

  const tags = new Set<string>();
  if (hasFrontmatter) {
    for (const t of extractFrontmatterTags(frontmatterBody)) {
      tags.add(t);
    }
  }

  for (const t of extractInlineTags(body)) {
    tags.add(t);
  }

  return Array.from(tags).sort();
}

/**
 * Adds a tag to the markdown document's YAML frontmatter.
 * If frontmatter already exists, appends the tag to the `tags` list.
 * If no frontmatter exists, creates one at the top of the file.
 */
export function addTagToContent(content: string, rawTag: string): string {
  const tag = normalizeTag(rawTag);
  if (!tag) return content;

  const currentTags = extractTags(content);
  if (currentTags.includes(tag)) {
    // Already present
    return content;
  }

  const { hasFrontmatter, frontmatterBody, body } = parseFrontmatter(content);

  if (!hasFrontmatter) {
    // Prepend new frontmatter with the tag
    const newline = content.includes('\r\n') ? '\r\n' : '\n';
    const fm = `---${newline}tags:${newline}  - ${tag}${newline}---${newline}${newline}`;
    return fm + content;
  }

  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = frontmatterBody.split(/\r?\n/);
  let tagsLineIndex = -1;
  let isInlineArray = false;
  let inlineArrayContent = '';
  let isMultilineList = false;
  let lastListItemIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*tags?\s*:\s*\[/i.test(line)) {
      tagsLineIndex = i;
      isInlineArray = true;
      const match = line.match(/^\s*tags?\s*:\s*\[(.*?)\]/i);
      inlineArrayContent = match ? match[1] : '';
      break;
    }

    if (/^\s*tags?\s*:/i.test(line)) {
      tagsLineIndex = i;
      const rest = line.replace(/^\s*tags?\s*:/i, '').trim();
      if (!rest) {
        isMultilineList = true;
        // Find all list items below this line
        for (let j = i + 1; j < lines.length; j++) {
          if (/^\s*-\s+/.test(lines[j])) {
            lastListItemIndex = j;
          } else if (/^\s*$/.test(lines[j])) {
            continue;
          } else {
            break;
          }
        }
      } else {
        // Scalar value e.g. tags: singleTag
        // We will convert to multiline list
        isMultilineList = false;
      }
      break;
    }
  }

  const newLines = [...lines];

  if (tagsLineIndex !== -1) {
    if (isInlineArray) {
      const existingItems = inlineArrayContent
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      existingItems.push(tag);
      newLines[tagsLineIndex] = `tags: [${existingItems.join(', ')}]`;
    } else if (isMultilineList && lastListItemIndex !== -1) {
      newLines.splice(lastListItemIndex + 1, 0, `  - ${tag}`);
    } else if (isMultilineList) {
      newLines.splice(tagsLineIndex + 1, 0, `  - ${tag}`);
    } else {
      // Scalar tags line: e.g. tags: foo
      const existingValue = lines[tagsLineIndex].replace(/^\s*tags?\s*:/i, '').trim();
      const existingItems = existingValue
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      existingItems.push(tag);
      newLines.splice(tagsLineIndex, 1, 'tags:', ...existingItems.map((item) => `  - ${item}`));
    }
  } else {
    // Frontmatter exists, but no tags field: add tags field at the end of frontmatter
    newLines.push('tags:', `  - ${tag}`);
  }

  return `---${newline}${newLines.join(newline)}${newline}---${newline}${body}`;
}

/**
 * Removes a tag from the markdown document's YAML frontmatter.
 */
export function removeTagFromContent(content: string, rawTag: string): string {
  const tag = normalizeTag(rawTag);
  if (!tag) return content;

  const { hasFrontmatter, frontmatterBody, body } = parseFrontmatter(content);
  if (!hasFrontmatter) {
    // If not in frontmatter, it might be an inline tag in the body, which we don't automatically delete
    return content;
  }

  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = frontmatterBody.split(/\r?\n/);
  const newLines: string[] = [];
  let inTagsBlock = false;
  let remainingListItemsCount = 0;
  let tagsHeaderIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Inline array check: tags: [foo, bar]
    const inlineMatch = line.match(/^(\s*tags?\s*:\s*)\[(.*?)\]/i);
    if (inlineMatch) {
      const prefix = inlineMatch[1];
      const items = inlineMatch[2]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const filtered = items.filter((item) => normalizeTag(item.replace(/['"]/g, '')) !== tag);
      if (filtered.length > 0) {
        newLines.push(`${prefix}[${filtered.join(', ')}]`);
      }
      // If filtered is empty, we omit the tags field completely
      continue;
    }

    if (/^\s*tags?\s*:/i.test(line)) {
      const rest = line.replace(/^\s*tags?\s*:/i, '').trim();
      if (!rest) {
        inTagsBlock = true;
        tagsHeaderIndex = newLines.length;
        newLines.push(line);
        remainingListItemsCount = 0;
        continue;
      } else {
        // Scalar value or comma separated
        const items = rest.split(',').map((s) => s.trim()).filter(Boolean);
        const filtered = items.filter((item) => normalizeTag(item.replace(/['"]/g, '')) !== tag);
        if (filtered.length > 0) {
          newLines.push(`tags: [${filtered.join(', ')}]`);
        }
        continue;
      }
    }

    if (inTagsBlock) {
      const itemMatch = line.match(/^\s*-\s+(.+)$/);
      if (itemMatch) {
        const itemVal = normalizeTag(itemMatch[1].replace(/['"]/g, '').trim());
        if (itemVal === tag) {
          // Skip this line to remove it
          continue;
        } else {
          remainingListItemsCount++;
          newLines.push(line);
          continue;
        }
      } else if (/^\s*$/.test(line)) {
        newLines.push(line);
        continue;
      } else {
        // End of tags block
        inTagsBlock = false;
      }
    }

    newLines.push(line);
  }

  // If the multiline tags list ended up having 0 items, remove the dangling `tags:` line
  if (tagsHeaderIndex !== -1 && remainingListItemsCount === 0) {
    newLines.splice(tagsHeaderIndex, 1);
  }

  // If frontmatter is now empty, remove frontmatter entirely
  const cleanedFm = newLines.join(newline).trim();
  if (!cleanedFm) {
    return body.replace(/^(\r?\n)+/, '');
  }

  return `---${newline}${newLines.join(newline)}${newline}---${newline}${body}`;
}

/**
 * Collects all unique tags across items with their occurrence count, sorted by count descending.
 */
export function getAllTagsWithCounts(
  items: Array<{ tags?: string[] }> = []
): Array<{ tag: string; count: number }> {
  if (!items || !Array.isArray(items)) return [];
  const counts = new Map<string, number>();

  for (const item of items) {
    if (!item.tags) continue;
    const itemTags = new Set<string>();
    for (const t of item.tags) {
      const norm = normalizeTag(t);
      if (norm) itemTags.add(norm);
    }
    for (const t of itemTags) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export interface TagSearchQuery {
  isTagSearch: boolean;
  tagQuery: string;
  textQuery: string;
}

/**
 * Parses user input in the sidebar search bar.
 * If query starts with `tag:foo` or `#foo`, identifies it as a tag search.
 */
export function parseSearchQuery(query: string, forceTagMode = false): TagSearchQuery {
  const trimmed = query.trim();
  if (!trimmed) {
    return { isTagSearch: forceTagMode, tagQuery: '', textQuery: '' };
  }

  if (forceTagMode) {
    const clean = trimmed.replace(/^tag:\s*/i, '').replace(/^#+/, '');
    return {
      isTagSearch: true,
      tagQuery: normalizeTag(clean),
      textQuery: '',
    };
  }

  const tagPrefixMatch = trimmed.match(/^tag:\s*(.*)$/i);
  if (tagPrefixMatch) {
    return {
      isTagSearch: true,
      tagQuery: normalizeTag(tagPrefixMatch[1]),
      textQuery: '',
    };
  }

  if (trimmed.startsWith('#')) {
    return {
      isTagSearch: true,
      tagQuery: normalizeTag(trimmed),
      textQuery: '',
    };
  }

  return {
    isTagSearch: false,
    tagQuery: '',
    textQuery: trimmed.toLowerCase(),
  };
}

/**
 * Filters recent items based on search query, active tag pill filter, and tag search mode.
 */
export function filterNotes(
  items: RecentItem[] = [],
  query: string = '',
  selectedTag: string | null = null,
  isTagMode = false
): RecentItem[] {
  if (!items || !Array.isArray(items)) return [];
  let result = items;

  // 1. If an active tag filter pill is selected, restrict to notes that have this tag
  if (selectedTag) {
    const normFilter = normalizeTag(selectedTag);
    result = result.filter((item) =>
      item.tags?.some((t) => normalizeTag(t) === normFilter)
    );
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return result;
  }

  const parsed = parseSearchQuery(trimmedQuery, isTagMode);

  if (parsed.isTagSearch) {
    const tq = parsed.tagQuery;
    if (!tq) return result;
    return result.filter((item) =>
      item.tags?.some((t) => normalizeTag(t).includes(tq))
    );
  }

  // General search: matches title, path, OR any of the item's tags
  const q = parsed.textQuery;
  return result.filter((item) => {
    if (item.title && item.title.toLowerCase().includes(q)) return true;
    if (item.path && item.path.toLowerCase().includes(q)) return true;
    if (item.tags && item.tags.some((t) => normalizeTag(t).includes(q))) return true;
    return false;
  });
}
