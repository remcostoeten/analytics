import { Context } from 'hono'
import { dataRetainer } from '../data-retention.js'

export async function handleAdminCleanup(c: Context) {
  try {
    await dataRetainer.cleanupOldData()
    
    return c.json({
      ok: true,
      message: 'Data cleanup completed successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Admin cleanup failed:', error)
    return c.json(
      {
        ok: false,
        error: 'Cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
}

export async function handleAdminStats(c: Context) {
  try {
    const stats = await dataRetainer.getRetentionStats()
    const policy = dataRetainer.getPolicy()
    
    return c.json({
      ok: true,
      timestamp: new Date().toISOString(),
      stats,
      policy,
    })
  } catch (error) {
    console.error('Admin stats failed:', error)
    return c.json(
      {
        ok: false,
        error: 'Failed to get stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
}
