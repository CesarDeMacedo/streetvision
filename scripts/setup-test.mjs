// One-time setup for manually testing the generate-image Edge Function.
// Requires being logged in to the Supabase CLI (`npx supabase login`).
//
//   node scripts/setup-test.mjs
//
// Writes scripts/.env.test (gitignored) with the project URL, anon key, and
// a confirmed test user's credentials, then you can run scripts/test-generate.mjs.
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_REF = 'tmquipynqrqvyeknogfo'
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`
const TEST_EMAIL = 'streetvision.test@example.com'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))

console.log('Fetching API keys via Supabase CLI...')
const keysJson = execFileSync(
  'npx',
  ['--yes', 'supabase', 'projects', 'api-keys', '--project-ref', PROJECT_REF, '-o', 'json'],
  { encoding: 'utf8', shell: process.platform === 'win32' }
)
const keys = JSON.parse(keysJson)
const anonKey =
  keys.find((k) => k.name === 'anon')?.api_key ??
  keys.find((k) => k.type === 'publishable')?.api_key
const serviceKey =
  keys.find((k) => k.name === 'service_role')?.api_key ??
  keys.find((k) => k.type === 'secret')?.api_key

if (!anonKey || !serviceKey) {
  console.error('Could not find anon/service_role keys. Are you logged in? (npx supabase login)')
  process.exit(1)
}

const password = randomBytes(12).toString('base64url')
const adminHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
}

console.log(`Creating test user ${TEST_EMAIL}...`)
let res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
  method: 'POST',
  headers: adminHeaders,
  body: JSON.stringify({ email: TEST_EMAIL, password, email_confirm: true }),
})

if (!res.ok) {
  const body = await res.text()
  if (res.status === 422 && body.includes('already')) {
    console.log('Test user already exists — resetting its password...')
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=100`, {
      headers: adminHeaders,
    })
    const { users = [] } = await listRes.json()
    const existing = users.find((u) => u.email === TEST_EMAIL)
    if (!existing) {
      console.error('User exists but was not found in the first page of users. Aborting.')
      process.exit(1)
    }
    res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ password, email_confirm: true }),
    })
    if (!res.ok) {
      console.error('Failed to reset test user password:', await res.text())
      process.exit(1)
    }
  } else {
    console.error('Failed to create test user:', body)
    process.exit(1)
  }
}

const envPath = path.join(scriptsDir, '.env.test')
writeFileSync(
  envPath,
  [
    `SUPABASE_URL=${SUPABASE_URL}`,
    `SUPABASE_ANON_KEY=${anonKey}`,
    `TEST_EMAIL=${TEST_EMAIL}`,
    `TEST_PASSWORD=${password}`,
    '',
  ].join('\n')
)

console.log(`\nDone. Wrote ${envPath} (gitignored — do not commit).`)
console.log('Now run, e.g.:')
console.log('  node scripts/test-generate.mjs path/to/street.jpg "add a protected bike lane with green paint and concrete barriers on the right side"')
