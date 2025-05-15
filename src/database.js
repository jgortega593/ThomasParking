// src/database.js
import { Database } from '@nozbe/watermelondb'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import schema from './schema' // Cambio aquí (sin llaves)

const adapter = new LokiJSAdapter({
  dbName: 'ParqueaderosDB',
  schema
})

export const database = new Database({
  adapter,
  modelClasses: [/* Tus modelos aquí */],
  actionsEnabled: true
})
