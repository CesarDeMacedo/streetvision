export type Project = {
  id: string
  user_id: string
  name: string
  address: string | null
  photo_path: string | null
  created_at: string
}

export type Visualization = {
  id: string
  project_id: string
  original_photo_path: string
  prompt: string
  generated_image_path: string | null
  cost_usd: number
  status: 'pending' | 'done' | 'failed'
  created_at: string
}

export const DAILY_GENERATION_LIMIT = 5
