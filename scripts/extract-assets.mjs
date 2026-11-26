import fs from 'node:fs'
const html = fs.readFileSync(new URL('../Piggy Duo – Heo đất của đôi mình.html', import.meta.url), 'utf8')
const re = /"(\w+)": "data:image\/(\w+);base64,([^"]+)"/g
let m
while ((m = re.exec(html))) {
  const ext = m[2] === 'jpeg' ? 'jpg' : m[2]
  fs.writeFileSync(new URL(`../src/assets/img/${m[1]}.${ext}`, import.meta.url), Buffer.from(m[3], 'base64'))
  console.log(m[1], ext)
}
