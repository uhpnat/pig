import { LocalRepository } from './localRepository'
import type { Repository } from './repository'

/**
 * Backend selection. When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set, a SupabaseRepository
 * (not yet implemented – see README "Stage 8") should be returned here. Until then the app runs in demo mode.
 */
export const hasSupabaseConfig = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

export const repository: Repository = new LocalRepository()
