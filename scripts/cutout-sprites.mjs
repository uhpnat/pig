import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const imgDir = path.join(__dirname, '../src/assets/img')
const artDir = 'C:\\Users\\0100878206\\.gemini\\antigravity\\brain\\83c03f97-e2ac-48d3-bbe1-b0ccd2012049'

/**
 * Flood-fills from the edges using adaptive color distance + edge-similarity stepping
 * so solid or gradient studio backgrounds are cleanly removed while keeping the 3D character intact.
 */
async function cutoutSprite(
  inputPath,
  outputPath,
  { size = 500, colorTol = 44, stepTol = 18, mode = 'auto', stripFloorShadow = false } = {},
) {
  const { data, info } = await sharp(inputPath)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const w = info.width
  const h = info.height
  const visited = new Uint8Array(w * h)
  const bgMask = new Uint8Array(w * h)

  const borderSamples = []
  for (let x = 0; x < w; x += 8) {
    borderSamples.push([data[x * 4], data[x * 4 + 1], data[x * 4 + 2]])
    const bIdx = ((h - 1) * w + x) * 4
    borderSamples.push([data[bIdx], data[bIdx + 1], data[bIdx + 2]])
  }
  for (let y = 0; y < h; y += 8) {
    const lIdx = y * w * 4
    borderSamples.push([data[lIdx], data[lIdx + 1], data[lIdx + 2]])
    const rIdx = (y * w + (w - 1)) * 4
    borderSamples.push([data[rIdx], data[rIdx + 1], data[rIdx + 2]])
  }

  const isPigPinkOrWarm = (r, g, b) => {
    if (r - g > 14 && r > 140) return true
    if (r - b > 26 && g > 110) return true
    if (r < 85 && g < 85 && b < 85) return true
    return false
  }

  const matchesBg = (idx, parentIdx) => {
    if (data[idx * 4 + 3] === 0) return true
    const r = data[idx * 4]
    const g = data[idx * 4 + 1]
    const b = data[idx * 4 + 2]

    if (mode === 'white') {
      const min = Math.min(r, g, b)
      const max = Math.max(r, g, b)
      return min >= 230 && max - min <= 22
    }

    if (isPigPinkOrWarm(r, g, b)) return false

    // Also remove bluish studio floor shadow at bottom when stripFloorShadow is enabled
    if (stripFloorShadow && b > r + 15 && g > r + 5) return true

    if (parentIdx !== undefined) {
      const pr = data[parentIdx * 4]
      const pg = data[parentIdx * 4 + 1]
      const pb = data[parentIdx * 4 + 2]
      const stepDist = Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb)
      if (stepDist > stepTol) return false
    }

    let minDist = 9999
    for (let s = 0; s < borderSamples.length; s++) {
      const [br, bg, bb] = borderSamples[s]
      const d = Math.hypot(r - br, g - bg, b - bb)
      if (d < minDist) minDist = d
    }
    return minDist <= colorTol
  }

  const queue = new Int32Array(w * h)
  let head = 0
  let tail = 0

  const tryPush = (x, y, parentIdx) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return
    const i = y * w + x
    if (visited[i]) return
    if (matchesBg(i, parentIdx)) {
      visited[i] = 1
      bgMask[i] = 1
      queue[tail++] = i
    }
  }

  for (let x = 0; x < w; x++) {
    tryPush(x, 0, undefined)
    tryPush(x, h - 1, undefined)
  }
  for (let y = 0; y < h; y++) {
    tryPush(0, y, undefined)
    tryPush(w - 1, y, undefined)
  }

  while (head < tail) {
    const cur = queue[head++]
    const cx = cur % w
    const cy = (cur - cx) / w
    tryPush(cx + 1, cy, cur)
    tryPush(cx - 1, cy, cur)
    tryPush(cx, cy + 1, cur)
    tryPush(cx, cy - 1, cur)
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (bgMask[i]) {
        data[i * 4 + 3] = 0
      } else {
        let bgN = 0
        if (x > 0 && bgMask[i - 1]) bgN++
        if (x < w - 1 && bgMask[i + 1]) bgN++
        if (y > 0 && bgMask[i - w]) bgN++
        if (y < h - 1 && bgMask[i + w]) bgN++
        if (bgN > 0) {
          data[i * 4 + 3] = Math.round(255 * (1 - bgN * 0.18))
        }
      }
    }
  }

  const outBuf = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 4 })
    .png({ compressionLevel: 9 })
    .toBuffer()

  fs.writeFileSync(outputPath, outBuf)
  const m = await sharp(outBuf).metadata()
  console.log(`Sprite ready: ${path.basename(outputPath)} -> ${m.width}x${m.height} (${(outBuf.length / 1024).toFixed(1)} KB)`)
}

// 1. Hero winking pig with gold coin (from pure white render)
await cutoutSprite(
  path.join(artDir, 'sprite_hero_pig_1795686031177.jpg'),
  path.join(imgDir, 'sprite_hero.png'),
  { size: 480, mode: 'white' },
)

// 2. Pig with sunglasses & crown
await cutoutSprite(
  path.join(imgDir, 't1.jpg'),
  path.join(imgDir, 'sprite_shades.png'),
  { size: 440, colorTol: 42, stepTol: 18, stripFloorShadow: true },
)

// 3. Pig with red glasses & crown
await cutoutSprite(
  path.join(imgDir, 't2.jpg'),
  path.join(imgDir, 'sprite_glasses.png'),
  { size: 440, colorTol: 42, stepTol: 18, stripFloorShadow: true },
)

// 4. Pig with blue hoodie (tighter step tolerance so blue hoodie stays intact)
await cutoutSprite(
  path.join(imgDir, 't3.jpg'),
  path.join(imgDir, 'sprite_hoodie.png'),
  { size: 440, colorTol: 12, stepTol: 6 },
)

// 5. Couple hugging pig (from ob.jpg cream background — higher colorTol to clean all cream corners)
await cutoutSprite(
  path.join(imgDir, 'ob.jpg'),
  path.join(imgDir, 'sprite_couple.png'),
  { size: 480, colorTol: 52, stepTol: 20 },
)

// 6. Compose two cuddling 3D pigs sprite (`sprite_duo.png`) from our transparent hero pig + shades pig!
const leftPig = await sharp(path.join(imgDir, 'sprite_hero.png'))
  .resize({ height: 340 })
  .toBuffer()
const rightPig = await sharp(path.join(imgDir, 'sprite_shades.png'))
  .flop()
  .resize({ height: 310 })
  .toBuffer()

const duoBuf = await sharp({
  create: { width: 520, height: 360, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    { input: leftPig, left: 25, top: 10 },
    { input: rightPig, left: 235, top: 38 },
  ])
  .png({ compressionLevel: 9 })
  .toBuffer()

fs.writeFileSync(path.join(imgDir, 'sprite_duo.png'), duoBuf)
console.log(`Sprite ready: sprite_duo.png -> 520x360 (${(duoBuf.length / 1024).toFixed(1)} KB)`)

// Clean up unused sprite_globe.png if it exists
const oldGlobe = path.join(imgDir, 'sprite_globe.png')
if (fs.existsSync(oldGlobe)) fs.unlinkSync(oldGlobe)
