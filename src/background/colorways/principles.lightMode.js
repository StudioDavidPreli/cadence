// One (library, colorway) folder, eagerly globbed INSIDE its own module so the
// module itself can be dynamic-imported. See ../library.js for why this file
// exists rather than one lazy glob: Vite needs a statically analysable pattern,
// and the lazy form of a glob emits a chunk per FILE, which would make a theme
// switch on motionTiles 32 requests instead of one.
//
// Generated shape, not hand-maintained art. Twelve of these, one per folder.
export default import.meta.glob('../marks/principles/lightMode/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
})
