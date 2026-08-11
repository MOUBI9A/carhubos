/**
 * Vite's `?raw` import suffix, used only by tests running under Vitest.
 *
 * `import text from './thing.json?raw'` hands back the file's unparsed source.
 * The i18n catalog test needs that, because JSON.parse is the exact step that
 * collapses a duplicate key — nothing working on the parsed object can see one.
 *
 * Declared narrowly rather than pulling in `vite/client` wholesale: this is a
 * Next.js app, and vite/client would add a pile of ambient globals (import.meta
 * shapes, asset modules) that do not describe this project's runtime.
 */
declare module '*?raw' {
  const content: string;
  export default content;
}
