// Next's static export writes nested-route prefetch payloads as folders
// (download/__next.download/__PAGE__.txt) while the client requests the flat name
// (download/__next.download.__PAGE__.txt). Write the flat copy too, so client-side
// navigation works on any static host without 404s.
import { copyFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('../out/', import.meta.url))
let n = 0

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (!statSync(p).isDirectory()) continue
    if (name.startsWith('__next.')) flatten(p, dir, name)
    else if (name !== '_next') walk(p)
  }
}

function flatten(segDir, parent, prefix) {
  for (const name of readdirSync(segDir)) {
    const p = join(segDir, name)
    const flat = `${prefix}.${name}`
    if (statSync(p).isDirectory()) flatten(p, parent, flat)
    else if (!existsSync(join(parent, flat))) {
      copyFileSync(p, join(parent, flat))
      n++
    }
  }
}

if (existsSync(OUT)) walk(OUT)
console.log(`flatten-rsc: wrote ${n} flat prefetch file(s)`)
