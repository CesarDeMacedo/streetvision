// Semeia dados de teste para verificação visual do Split View, sem chamar o
// Gemini (sem custo, sem tocar no rate limit): cria um projeto para o usuário
// de teste com rua-teste_02.jpg e registra uma visualização 'done' reusando
// uma imagem já gerada anteriormente (scripts/out-*.png).
//
//   node scripts/seed-viz-test.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptsDir, '..')
const env = Object.fromEntries(
  readFileSync(path.join(scriptsDir, '.env.test'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
  email: env.TEST_EMAIL,
  password: env.TEST_PASSWORD,
})
if (authError) {
  console.error('Sign-in failed:', authError.message)
  process.exit(1)
}
const userId = auth.user.id

const photoFile = path.join(repoRoot, 'rua-teste_02.jpg')
const generatedFile = readdirSync(scriptsDir)
  .filter((f) => f.startsWith('out-') && f.endsWith('.png'))
  .sort()
  .map((f) => path.join(scriptsDir, f))
  .pop()
if (!existsSync(photoFile) || !generatedFile) {
  console.error('Missing rua-teste_02.jpg or scripts/out-*.png')
  process.exit(1)
}

const { data: project, error: projError } = await supabase
  .from('projects')
  .insert({ user_id: userId, name: 'Split View Test', address: 'Parnell Rd (seed)' })
  .select()
  .single()
if (projError) {
  console.error('Project insert failed:', projError.message)
  process.exit(1)
}

const photoPath = `${userId}/${project.id}/original-seed.jpg`
const up1 = await supabase.storage
  .from('street-photos')
  .upload(photoPath, readFileSync(photoFile), { contentType: 'image/jpeg' })
if (up1.error) {
  console.error('Photo upload failed:', up1.error.message)
  process.exit(1)
}
await supabase.from('projects').update({ photo_path: photoPath }).eq('id', project.id)

const { data: viz } = await supabase
  .from('visualizations')
  .insert({
    project_id: project.id,
    original_photo_path: photoPath,
    prompt: 'protected bike lanes on both sides of the street (seed reusing previous output)',
    status: 'pending',
  })
  .select()
  .single()
const genPath = `${userId}/${project.id}/${viz.id}.png`
const up2 = await supabase.storage
  .from('generated-images')
  .upload(genPath, readFileSync(generatedFile), { contentType: 'image/png' })
if (up2.error) {
  console.error('Generated upload failed:', up2.error.message)
  process.exit(1)
}
await supabase
  .from('visualizations')
  .update({ generated_image_path: genPath, status: 'done' })
  .eq('id', viz.id)

console.log(`Seed OK. Project URL: /projects/${project.id}`)
