// Gera .env.local para o app Next.js buscando as chaves do projeto Supabase
// via CLI (requer `npx supabase login` feito uma vez).
//
//   node scripts/setup-env.mjs
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_REF = 'tmquipynqrqvyeknogfo'
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

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

if (!anonKey) {
  console.error('Could not find the anon/publishable key. Are you logged in? (npx supabase login)')
  process.exit(1)
}

const envPath = path.join(repoRoot, '.env.local')
writeFileSync(
  envPath,
  [`NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`, ''].join(
    '\n'
  )
)
console.log(`Done. Wrote ${envPath} (gitignored). Now run: npm run dev`)
