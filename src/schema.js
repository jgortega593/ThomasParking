// src/schema.js
import { appSchema, tableSchema } from '@nozbe/watermelondb'

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'registros_parqueadero',
      columns: [
        { name: 'placa_vehiculo', type: 'string' },
        { name: 'tipo_vehiculo', type: 'string' },
        { name: 'dependencia_id', type: 'string' },
        { name: 'usuario_id', type: 'string' },
        { name: 'observaciones', type: 'string', isOptional: true },
        { name: 'fecha_hora_ingreso', type: 'number' },
        { name: 'foto_url', type: 'string', isOptional: true },
        { name: 'gratis', type: 'boolean' },
        { name: 'monto', type: 'number' },
        { name: 'recaudado', type: 'boolean' },
        { name: 'fecha_recaudo', type: 'number', isOptional: true },
        { name: 'observacion_audio_url', type: 'string', isOptional: true },
        { name: '_status', type: 'string' },
        { name: '_changed', type: 'string' }
      ]
    }),
    tableSchema({
      name: 'copropietarios',
      columns: [
        { name: 'nombre', type: 'string' },
        { name: 'propiedad', type: 'string' },
        { name: 'unidad_asignada', type: 'string' }
      ]
    })
  ]
})
