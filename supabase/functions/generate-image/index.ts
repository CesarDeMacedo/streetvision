import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from 'jsr:@supabase/supabase-js@2/cors'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent'
const MAX_DESCRIPTION_LENGTH = 2000
const DAILY_GENERATION_LIMIT = 5

// Prompt template from SPEC.md section 4. The "Preserve exactly" clause is the
// highest-risk part of the project (see CLAUDE.md) — do not reword it without
// re-running the manual validation of step 5 of SPEC.md.
function buildPrompt(description: string): string {
  return (
    `Modify this street photo according to the following changes: ${description}.\n` +
    'Preserve exactly: building facades, camera angle, perspective, lighting, time of day,\n' +
    'and any text, street signs, pavement markings, or lettering — character by character,\n' +
    'in the same position and orientation as the original.\n' +
    'Only modify: road surface, lane markings, sidewalks, and roadside elements as described.\n' +
    'Do not alter, regenerate, or reinterpret any existing text in the image.\n' +
    'Output a photorealistic result suitable for a professional public consultation document.'
  )
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // verify_jwt only checks that the Authorization header is a validly-signed JWT —
  // it accepts the public anon key too. Explicitly require a real signed-in user.
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
  )
  const {
    data: { user },
  } = await supabaseClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY secret is not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Rate limit is enforced here (not only in the UI) so it cannot be bypassed
  // by calling the function directly. Writes go through the service role client,
  // which bypasses RLS — regular users can only read their own row.
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  const today = new Date().toISOString().slice(0, 10)
  const { data: limitRow } = await adminClient
    .from('generation_limits')
    .select('date, count')
    .eq('user_id', user.id)
    .maybeSingle()
  const usedToday = limitRow && limitRow.date === today ? limitRow.count : 0

  if (usedToday >= DAILY_GENERATION_LIMIT) {
    return new Response(
      JSON.stringify({
        error: `Daily generation limit reached (${DAILY_GENERATION_LIMIT}/day). Try again tomorrow.`,
      }),
      {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const form = await req.formData()
    const photo = form.get('photo')
    const description = form.get('description')

    if (!(photo instanceof File) || typeof description !== 'string' || !description.trim()) {
      return new Response(
        JSON.stringify({ error: 'photo (file) and description (text) are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return new Response(
        JSON.stringify({ error: `description must be at most ${MAX_DESCRIPTION_LENGTH} characters` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const photoData = await fileToBase64(photo)

    const geminiResponse = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: buildPrompt(description.trim()) },
              { inline_data: { mime_type: photo.type || 'image/jpeg', data: photoData } },
            ],
          },
        ],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    })

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text()
      return new Response(JSON.stringify({ error: `Gemini API error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const geminiJson = await geminiResponse.json()
    const parts = geminiJson.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((p: { inlineData?: { data?: string } }) => p.inlineData?.data)

    if (!imagePart) {
      return new Response(JSON.stringify({ error: 'Gemini did not return an image' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const outputBytes = Uint8Array.from(atob(imagePart.inlineData.data), (c) => c.charCodeAt(0))

    // Increment only after a successful generation (SPEC.md section 4)
    await adminClient
      .from('generation_limits')
      .upsert({ user_id: user.id, date: today, count: usedToday + 1 })

    return new Response(outputBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': imagePart.inlineData.mimeType ?? 'image/png',
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to generate image' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
