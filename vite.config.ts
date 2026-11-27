/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { gsheetsBridgePlugin } from './scripts/gsheets-vite-plugin'

const BUILD_ID = `${Date.now()}`

function buildVersionManifestPlugin(): Plugin {
  return {
    name: 'piggy-duo-build-version',
    writeBundle(options) {
      const outDir = options.dir || path.resolve(__dirname, 'dist')
      fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(
        path.join(outDir, 'version.json'),
        JSON.stringify({ buildId: BUILD_ID, builtAt: new Date().toISOString() }),
        'utf8',
      )
    },
  }
}

export default defineConfig({
  base: './',
  define: {
    __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [react(), gsheetsBridgePlugin(), buildVersionManifestPlugin()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as never)
