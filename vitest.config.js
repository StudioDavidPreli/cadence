import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vitest loads this in preference to vite.config.js. It deliberately omits the
// Cloudflare Vite plugin: that plugin defines a Worker build environment whose
// options collide with Vitest's node-builtin externalization (resolve.external),
// which aborts Vitest at startup. Tests don't need the Worker build — they run
// in Node — so this mirrors the pre-Cloudflare vite config: just React.
export default defineConfig({
  plugins: [react()],
})
