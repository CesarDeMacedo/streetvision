// Manual test harness for the generate-image Edge Function (SPEC.md step 5).
//
//   node scripts/test-generate.mjs <photo-path> "<intervention description>"
//
// Requires scripts/.env.test — create it by running: node scripts/setup-test.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(scriptsDir, '.env.test')

if (!existsSync(envPath)) {
  console.error('scripts/.env.test not found. Run first: node scripts/setup-test.mjs')
  process.exit(1)
}
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const [photoPath, description] = process.argv.slice(2)
if (!photoPath || !description) {
  console.error('Usage: node scripts/test-generate.mjs <photo-path> "<intervention description>"')
  process.exit(1)
}

console.log('Signing in as test user...')
const authRes = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: env.TEST_EMAIL, password: env.TEST_PASSWORD }),
})
if (!authRes.ok) {
  console.error('Sign-in failed:', await authRes.text())
  process.exit(1)
}
const { access_token } = await authRes.json()

const ext = path.extname(photoPath).toLowerCase()
const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
const form = new FormData()
form.append('photo', new Blob([readFileSync(photoPath)], { type: mime }), path.basename(photoPath))
form.append('description', description)

console.log('Calling generate-image (this takes ~10-30s)...')
const start = Date.now()
const res = await fetch(`${env.SUPABASE_URL}/functions/v1/generate-image`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${access_token}` },
  body: form,
})
const elapsed = ((Date.now() - start) / 1000).toFixed(1)

if (!res.ok) {
  console.error(`Failed (HTTP ${res.status}, ${elapsed}s):`, await res.text())
  process.exit(1)
}

const outBytes = Buffer.from(await res.arrayBuffer())
const outPath = path.join(
  scriptsDir,
  `out-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`
)
writeFileSync(outPath, outBytes)
console.log(`OK in ${elapsed}s (${(outBytes.length / 1024).toFixed(0)} KB) -> ${outPath}`)
console.log('Compare against the original: check building facades, camera angle, and lighting.')
