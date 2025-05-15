import { synchronize } from '@nozbe/watermelondb/sync'
import { supabase } from './supabaseClient'
import { database } from './database'

export async function sync() {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      const { data } = await supabase.rpc('pull_changes', {
        last_pulled_at: lastPulledAt
      })
      return { changes: data.changes, timestamp: data.timestamp }
    },
    pushChanges: async ({ changes }) => {
      await supabase.rpc('push_changes', { changes })
    }
  })
}
