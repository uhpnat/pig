import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const imgDir = path.join(__dirname, '../src/assets/img')

for (const file of fs.readdirSync(imgDir)) {
  if (!file.endsWith('.jpg') && !file.endsWith('.png')) continue
  const p = path.join(imgDir, file)
  const buf = fs.readFileSync(p)
  const meta = await sharp(buf).metadata()
  const w = meta.width || 200
  const h = meta.height || 200
  // Only upscale if not already upscaled
  const scale = w < 700 ? 2 : 1
  const out = await sharp(buf)
    .resize(w * scale, h * scale, { kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.9, m1: 1.0, m2: 1.5 })
    .modulate({ saturation: 1.05 })
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
    .toBuffer()
  fs.writeFileSync(p, out)
  console.log(`Enhanced ${file}: ${w}x${h} -> ${w * scale}x${h * scale} (${out.length} bytes)`)
}
