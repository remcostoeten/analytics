import app from './app.js'
import { serve } from 'bun'

serve({ fetch: app.fetch, port: 3000 })

console.log('🚀 Ingestion server running on http://localhost:3000')
