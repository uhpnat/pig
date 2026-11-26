import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mode = process.argv[2] || '3d' // '3d' uses big.jpg (3D pig with crown), 'svg' uses vector icon.svg

const srcPath =
  mode === 'svg'
    ? path.join(__dirname, '../public/icon.svg')
    : path.join(__dirname, '../src/assets/img/big.jpg')

for (const [name, size] of [
  ['icon-192', 192],
  ['icon-512', 512],
  ['apple-touch-icon', 180],
]) {
  const out = path.join(__dirname, `../public/${name}.png`)
  await sharp(srcPath)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(out)
  console.log('wrote', name, 'from', path.basename(srcPath))
}
