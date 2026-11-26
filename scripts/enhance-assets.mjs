import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const imgDir = path.join(__dirname, '../src/assets/img')

const TARGET_WIDTHS = {
  'hero.jpg': 900,
  'duo.jpg': 900,
  'glob.jpg': 800,
  'ob.jpg': 800,
  'big.jpg': 600,
  'chal.jpg': 500,
  'boy.jpg': 320,
  'girl.jpg': 320,
  't0.jpg': 400,
  't1.jpg': 400,
  't2.jpg': 400,
  't3.jpg': 400,
}

for (const [file, targetW] of Object.entries(TARGET_WIDTHS)) {
  const p = path.join(imgDir, file)
  if (!fs.existsSync(p)) continue
  const buf = fs.readFileSync(p)
  const out = await sharp(buf)
    .resize({ width: targetW, withoutEnlargement: true, kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.7 })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer()
  fs.writeFileSync(p, out)
  const meta = await sharp(out).metadata()
  console.log(`Optimized ${file}: ${meta.width}x${meta.height} (${(out.length / 1024).toFixed(1)} KB)`)
}
