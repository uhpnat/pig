/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { gsheetsBridgePlugin } from './scripts/gsheets-vite-plugin'

export default defineConfig({
  base: './',
  plugins: [react(), gsheetsBridgePlugin()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as never)
