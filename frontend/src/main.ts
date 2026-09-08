import 'katex/dist/katex.min.css'
import './style.css'
import { mount } from 'svelte'
import App from './App.svelte'

window.addEventListener('error', (e) => {
  console.error('[Tex Frontend Error]', e.error || e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[Tex Unhandled Rejection]', e.reason);
});

let app: Record<string, unknown> | undefined;
try {
  app = mount(App, {
    target: document.getElementById('app')!
  });
} catch (err) {
  console.error('[Tex Mount Error]', err);
  const target = document.getElementById('app');
  if (target) {
    target.innerHTML = `<div style="padding:24px;color:#f87171;background:#0d0d0f;height:100vh;font-family:monospace;box-sizing:border-box;"><h2>Tex Initialization Error</h2><pre style="white-space:pre-wrap;margin-top:12px;color:#e4e4e7;">${err instanceof Error ? err.stack || err.message : String(err)}</pre></div>`;
  }
}

export default app
