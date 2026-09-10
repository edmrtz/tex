import mermaid from 'mermaid';
import { WidgetType, type EditorView } from '@codemirror/view';

/**
 * Check active document theme for Mermaid rendering
 */
function getMermaidTheme(): 'default' | 'dark' {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light'
    ? 'default'
    : 'dark';
}

mermaid.initialize({
  startOnLoad: false,
  theme: getMermaidTheme(),
  securityLevel: 'loose',
  fontFamily: 'inherit',
  suppressErrorRendering: true,
});

let idCounter = 0;

/**
 * Normalizes variations of usecase-beta and architecture-beta diagram declarations
 * into their official Mermaid syntax.
 * Variations:
 *   user-case beta, user-case-beta, use-case beta, use-case-beta,
 *   usecase beta, usercase beta, user-case, usercase -> usecase-beta
 *   architecture beta -> architecture-beta
 */
export function normalizeMermaidCode(code: string): string {
  const lines = code.split('\n');
  let inFrontmatter = false;
  let frontmatterPassed = false;

  const USECASE_VARIANTS =
    /^\s*(?:user[- ]case[- ]beta|usercase[- ]beta|use[- ]case[- ]beta|usecase[- ]beta|user[- ]case|use[- ]case|usercase)\b/i;
  const ARCHITECTURE_VARIANTS = /^\s*architecture[- ]beta\b/i;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!frontmatterPassed) {
      if (i === 0 && trimmed === '---') {
        inFrontmatter = true;
        continue;
      }
      if (inFrontmatter) {
        if (trimmed === '---') {
          inFrontmatter = false;
          frontmatterPassed = true;
        }
        continue;
      }
    }

    if (!trimmed || trimmed.startsWith('%%')) {
      continue;
    }

    // Found diagram declaration line
    if (USECASE_VARIANTS.test(lines[i])) {
      lines[i] = lines[i].replace(USECASE_VARIANTS, (match) => {
        const leadingWhitespace = match.match(/^\s*/)?.[0] || '';
        return leadingWhitespace + 'usecase-beta';
      });
    } else if (ARCHITECTURE_VARIANTS.test(lines[i])) {
      lines[i] = lines[i].replace(ARCHITECTURE_VARIANTS, (match) => {
        const leadingWhitespace = match.match(/^\s*/)?.[0] || '';
        return leadingWhitespace + 'architecture-beta';
      });
    }
    break;
  }

  return lines.join('\n');
}

/**
 * Detects diagram type for badge display [mermaid: <type>] or [mermaid]
 */
export function getDiagramType(code: string): string | null {
  const lines = code.split('\n');
  let inFrontmatter = false;
  let frontmatterPassed = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!frontmatterPassed) {
      if (i === 0 && trimmed === '---') {
        inFrontmatter = true;
        continue;
      }
      if (inFrontmatter) {
        if (trimmed === '---') {
          inFrontmatter = false;
          frontmatterPassed = true;
        }
        continue;
      }
    }

    if (!trimmed || trimmed.startsWith('%%')) {
      continue;
    }

    const match = trimmed.match(/^([a-zA-Z0-9_\-]+)/);
    if (!match) return null;
    const token = match[1].toLowerCase();

    if (token === 'graph' || token === 'flowchart') return 'flowchart';
    if (token === 'sequencediagram' || token === 'sequence') return 'sequence';
    if (token === 'classdiagram' || token === 'class') return 'class';
    if (token === 'statediagram' || token === 'statediagram-v2' || token === 'state') return 'state';
    if (token === 'erdiagram' || token === 'er') return 'er';
    if (token === 'gantt') return 'gantt';
    if (token === 'pie') return 'pie';
    if (token === 'gitgraph' || token === 'git') return 'git';
    if (token === 'journey') return 'journey';
    if (token === 'mindmap') return 'mindmap';
    if (token === 'timeline') return 'timeline';
    if (token === 'quadrantchart' || token === 'quadrant') return 'quadrant';
    if (token === 'xychart' || token === 'xychart-beta') return 'xychart';
    if (token === 'sankey' || token === 'sankey-beta') return 'sankey';
    if (token === 'block' || token === 'block-beta') return 'block';
    if (token === 'packet' || token === 'packet-beta') return 'packet';
    if (token === 'kanban') return 'kanban';
    if (token === 'architecture' || token === 'architecture-beta') return 'architecture';
    if (token === 'usecase' || token === 'usecase-beta') return 'usecase';
    if (token.startsWith('c4')) return 'c4';

    return token;
  }
  return null;
}

/**
 * Copies text or SVG markup to clipboard
 */
async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback below
    }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

const STYLE_ID = 'cm-mermaid-widget-custom-styles';

function ensureCustomStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.cm-mermaid-container {
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  margin: 12px 0 !important;
  padding: 0 !important;
  background-color: var(--bg-card, #19191d) !important;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.12)) !important;
  border-radius: 0px !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
  min-height: 60px !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  cursor: default !important;
}
.cm-mermaid-container:hover {
  border-color: var(--accent, #38bdf8) !important;
}
.cm-mermaid-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.12));
  background-color: var(--bg-card, #19191d);
  font-family: var(--font-mono, 'DM Mono', monospace);
  font-size: 11px;
  user-select: none;
  gap: 8px;
  box-sizing: border-box;
}
.cm-mermaid-badge {
  font-family: var(--font-mono, 'DM Mono', monospace);
  font-size: 11px;
  color: var(--text-muted, #71717a);
  user-select: none;
  white-space: nowrap;
}
.cm-mermaid-controls {
  display: flex;
  gap: 2px;
  align-items: center;
  flex-wrap: nowrap;
}
.cm-mermaid-btn {
  background: transparent;
  border: none;
  border-radius: 0px;
  color: var(--text-main, #e4e4e7);
  font-family: var(--font-mono, 'DM Mono', monospace);
  font-size: 11px;
  padding: 2px 4px;
  cursor: pointer;
  user-select: none;
  line-height: 1.2;
  transition: color 0.1s ease, background-color 0.1s ease;
  white-space: nowrap;
}
.cm-mermaid-btn:hover {
  color: var(--accent, #38bdf8);
  background-color: rgba(56, 189, 248, 0.1);
}
.cm-mermaid-btn:active {
  color: var(--accent, #38bdf8);
  background-color: rgba(56, 189, 248, 0.2);
}
.cm-mermaid-btn.active {
  color: var(--accent, #38bdf8);
  font-weight: 500;
}
.cm-mermaid-viewport {
  position: relative;
  overflow: auto;
  max-width: 100%;
  cursor: grab;
  padding: 16px;
  box-sizing: border-box;
  scrollbar-width: thin;
  display: block;
  min-height: 80px;
  user-select: none;
}
.cm-mermaid-viewport.is-dragging {
  cursor: grabbing !important;
}
.cm-mermaid-canvas {
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 100%;
  width: fit-content;
  box-sizing: border-box;
}
.cm-mermaid-canvas svg {
  display: block;
}
.cm-mermaid-error {
  color: var(--danger, #f87171);
  padding: 10px 14px;
  border-radius: 0px;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--danger, #f87171);
  font-size: 12px;
  width: 100%;
  box-sizing: border-box;
}
.cm-mermaid-error-title {
  font-weight: 700;
  margin-bottom: 4px;
}
.cm-mermaid-error pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: var(--font-mono, 'DM Mono', monospace);
  font-size: 11.5px;
  color: var(--danger, #f87171);
}
.cm-mermaid-placeholder {
  color: var(--text-muted, #71717a);
  font-style: italic;
  font-size: 13px;
  padding: 16px;
  text-align: center;
}
`;
  document.head.appendChild(style);
}

export class MermaidWidget extends WidgetType {
  constructor(readonly code: string) {
    super();
  }

  eq(other: MermaidWidget) {
    return other.code === this.code;
  }

  toDOM(view: EditorView) {
    ensureCustomStyles();

    const container = document.createElement('div');
    container.className = 'cm-mermaid-container';
    container.title = 'Click to edit diagram';

    const cleanCode = normalizeMermaidCode(this.code.trim());
    if (!cleanCode) {
      container.innerHTML = '<div class="cm-mermaid-placeholder">Empty Mermaid diagram</div>';
      return container;
    }

    const diagramType = getDiagramType(cleanCode);

    // Top TUI toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'cm-mermaid-toolbar';

    // Diagram type badge [mermaid: <type>] or [mermaid]
    const badge = document.createElement('span');
    badge.className = 'cm-mermaid-badge';
    badge.textContent = diagramType ? `[mermaid: ${diagramType}]` : '[mermaid]';
    toolbar.appendChild(badge);

    // Controls container
    const controls = document.createElement('div');
    controls.className = 'cm-mermaid-controls';

    // [-] Zoom out button
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.type = 'button';
    zoomOutBtn.className = 'cm-mermaid-btn cm-mermaid-zoom-out';
    zoomOutBtn.textContent = '[-]';
    zoomOutBtn.title = 'Zoom out (-15%)';
    controls.appendChild(zoomOutBtn);

    // [ 100% ] Zoom reset button
    const zoomResetBtn = document.createElement('button');
    zoomResetBtn.type = 'button';
    zoomResetBtn.className = 'cm-mermaid-btn cm-mermaid-zoom-reset';
    zoomResetBtn.textContent = '[ 100% ]';
    zoomResetBtn.title = 'Reset zoom to 100%';
    controls.appendChild(zoomResetBtn);

    // [+] Zoom in button
    const zoomInBtn = document.createElement('button');
    zoomInBtn.type = 'button';
    zoomInBtn.className = 'cm-mermaid-btn cm-mermaid-zoom-in';
    zoomInBtn.textContent = '[+]';
    zoomInBtn.title = 'Zoom in (+15%)';
    controls.appendChild(zoomInBtn);

    // [fit] Toggle fit to width
    const fitBtn = document.createElement('button');
    fitBtn.type = 'button';
    fitBtn.className = 'cm-mermaid-btn cm-mermaid-fit';
    fitBtn.textContent = '[fit]';
    fitBtn.title = 'Toggle fit to width / 100%';
    controls.appendChild(fitBtn);

    // [copy] Copy SVG or source code to clipboard
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'cm-mermaid-btn cm-mermaid-copy';
    copyBtn.textContent = '[copy]';
    copyBtn.title = 'Copy SVG to clipboard';
    controls.appendChild(copyBtn);

    // [edit] Edit source code
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'cm-mermaid-btn cm-mermaid-edit';
    editBtn.textContent = '[edit]';
    editBtn.title = 'Edit diagram code';
    controls.appendChild(editBtn);

    toolbar.appendChild(controls);
    container.appendChild(toolbar);

    // Scrollable viewport with grab cursor
    const viewport = document.createElement('div');
    viewport.className = 'cm-mermaid-viewport';

    // Inner canvas wrapper holding rendered SVG
    const canvas = document.createElement('div');
    canvas.className = 'cm-mermaid-canvas';
    viewport.appendChild(canvas);
    container.appendChild(viewport);

    // State
    let zoom = 1.0;
    let isFit = false;
    let naturalWidth = 0;
    let naturalHeight = 0;
    let renderedSvgEl: SVGElement | null = null;

    const applySizing = () => {
      if (!renderedSvgEl) return;

      if (isFit) {
        renderedSvgEl.style.setProperty('max-width', '100%', 'important');
        renderedSvgEl.style.setProperty('width', '100%', 'important');
        renderedSvgEl.style.setProperty('height', 'auto', 'important');
        fitBtn.classList.add('active');

        // Update reset button text to show fit ratio if known
        const vpWidth = viewport.clientWidth - 32;
        if (naturalWidth > 0 && vpWidth > 0) {
          const ratio = Math.min(1.0, vpWidth / naturalWidth);
          zoomResetBtn.textContent = `[ ${Math.round(ratio * 100)}% ]`;
        } else {
          zoomResetBtn.textContent = '[ fit ]';
        }
      } else {
        const scaledWidth = Math.round(naturalWidth * zoom);
        renderedSvgEl.style.setProperty('max-width', 'none', 'important');
        renderedSvgEl.style.setProperty('width', `${scaledWidth}px`, 'important');
        if (naturalHeight > 0) {
          const scaledHeight = Math.round(naturalHeight * zoom);
          renderedSvgEl.style.setProperty('height', `${scaledHeight}px`, 'important');
        } else {
          renderedSvgEl.style.setProperty('height', 'auto', 'important');
        }
        fitBtn.classList.remove('active');
        zoomResetBtn.textContent = `[ ${Math.round(zoom * 100)}% ]`;
      }
    };

    const toggleFit = () => {
      isFit = !isFit;
      if (!isFit) {
        zoom = 1.0;
      }
      applySizing();
    };

    const setZoom = (newZoom: number) => {
      isFit = false;
      zoom = Math.max(0.2, Math.min(5.0, Math.round(newZoom * 100) / 100));
      applySizing();
    };

    // Zoom controls
    zoomOutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setZoom(zoom - 0.15);
    });

    zoomInBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setZoom(zoom + 0.15);
    });

    zoomResetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setZoom(1.0);
    });

    fitBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFit();
    });

    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const textToCopy = renderedSvgEl ? renderedSvgEl.outerHTML : cleanCode;
      const success = await copyToClipboard(textToCopy);
      if (success) {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '[copied!]';
        copyBtn.classList.add('active');
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.classList.remove('active');
        }, 1500);
      }
    });

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      try {
        const pos = view.posAtDOM(container);
        if (pos >= 0) {
          view.dispatch({
            selection: { anchor: pos + 1 },
            scrollIntoView: true,
          });
          view.focus();
        }
      } catch {
        view.focus();
      }
    });

    // Mouse drag to pan
    viewport.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement)?.closest('button')) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const scrollStartLeft = viewport.scrollLeft;
      const scrollStartTop = viewport.scrollTop;
      let isDragging = true;
      viewport.classList.add('is-dragging');

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        viewport.scrollLeft = scrollStartLeft - dx;
        viewport.scrollTop = scrollStartTop - dy;
      };

      const onMouseUp = () => {
        isDragging = false;
        viewport.classList.remove('is-dragging');
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    // Double-click to toggle fit / 100% scale
    viewport.addEventListener('dblclick', (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest('button')) return;
      e.preventDefault();
      e.stopPropagation();
      toggleFit();
    });

    // Ctrl+Wheel zoom
    viewport.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          const delta = e.deltaY < 0 ? 0.15 : -0.15;
          setZoom(zoom + delta);
        }
      },
      { passive: false }
    );

    // Responsive fit ratio updates on resize
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (isFit) {
          applySizing();
        }
      });
      resizeObserver.observe(viewport);
    }

    // Render diagram
    const renderDiagram = () => {
      const activeTheme = getMermaidTheme();
      mermaid.initialize({
        startOnLoad: false,
        theme: activeTheme,
        securityLevel: 'loose',
        fontFamily: 'inherit',
        suppressErrorRendering: true,
      });

      const id = `mermaid_svg_${Date.now()}_${++idCounter}`;

      mermaid
        .render(id, cleanCode)
        .then(({ svg, bindFunctions }) => {
          canvas.innerHTML = svg;
          if (bindFunctions) {
            try {
              bindFunctions(canvas);
            } catch {
              // ignore bind errors
            }
          }

          const svgEl = canvas.querySelector('svg');
          if (svgEl) {
            renderedSvgEl = svgEl;

            // Extract natural SVG dimensions
            naturalWidth = 0;
            naturalHeight = 0;

            const viewBox = svgEl.getAttribute('viewBox');
            if (viewBox) {
              const parts = viewBox.trim().split(/[\s,]+/).map(Number);
              if (
                parts.length === 4 &&
                !isNaN(parts[2]) &&
                !isNaN(parts[3]) &&
                parts[2] > 0 &&
                parts[3] > 0
              ) {
                naturalWidth = parts[2];
                naturalHeight = parts[3];
              }
            }

            if (!naturalWidth) {
              const attrW = parseFloat(svgEl.getAttribute('width') || '');
              const attrH = parseFloat(svgEl.getAttribute('height') || '');
              if (!isNaN(attrW) && attrW > 0) naturalWidth = attrW;
              if (!isNaN(attrH) && attrH > 0) naturalHeight = attrH;
            }

            if (!naturalWidth && svgEl.style.maxWidth && svgEl.style.maxWidth.endsWith('px')) {
              const parsed = parseFloat(svgEl.style.maxWidth);
              if (!isNaN(parsed) && parsed > 0) naturalWidth = parsed;
            }

            if (!naturalWidth) {
              try {
                const bbox = svgEl.getBBox();
                if (bbox && bbox.width > 0) {
                  naturalWidth = bbox.width;
                  naturalHeight = bbox.height;
                }
              } catch {
                // fallback
              }
            }

            if (!naturalWidth) {
              naturalWidth = 600;
              naturalHeight = 400;
            }

            // Apply natural sizing at 100% scale
            applySizing();
          }

          view?.requestMeasure?.();
        })
        .catch((err) => {
          canvas.innerHTML = `<div class="cm-mermaid-error">
            <div class="cm-mermaid-error-title">⚠️ Mermaid Syntax Error</div>
            <pre>${err?.message || 'Invalid syntax'}</pre>
          </div>`;
          zoomOutBtn.style.display = 'none';
          zoomResetBtn.style.display = 'none';
          zoomInBtn.style.display = 'none';
          fitBtn.style.display = 'none';
          view?.requestMeasure?.();
        });
    };

    renderDiagram();

    // Theme change observer to dynamically update diagram colors
    let themeObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      themeObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'attributes' && m.attributeName === 'data-theme') {
            renderDiagram();
          }
        }
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
    }

    // Cleanup reference
    (container as unknown as { __cleanupMermaid?: () => void }).__cleanupMermaid = () => {
      themeObserver?.disconnect();
      resizeObserver?.disconnect();
    };

    return container;
  }

  destroy(dom: HTMLElement) {
    const el = dom as unknown as { __cleanupMermaid?: () => void };
    if (typeof el.__cleanupMermaid === 'function') {
      el.__cleanupMermaid();
    }
  }

  ignoreEvent(event: Event): boolean {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.cm-mermaid-toolbar') || target?.closest('.cm-mermaid-viewport')) {
      return true;
    }
    return false;
  }
}
