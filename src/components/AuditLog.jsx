// src/components/AuditLog.jsx
import React, { useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import Loader from './Loader';
import dayjs from 'dayjs';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
  .from('audit_logs')
  .select(`
    id,
    accion,
    tabla_afectada,
    detalles,
    fecha_hora,
    usuario:usuarios_app(email)
  `)
  .order('fecha_hora', { ascending: false });



      if (!error) setLogs(data);
      setLoading(false);
    };

    fetchLogs();
  }, []);

  if (loading) return <Loader text="Cargando registros de auditoría..." />;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Registros de Auditoría</h2>
      
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha/Hora</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tabla</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalles</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map(log => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {dayjs(log.fecha_hora).format('DD/MM/YYYY HH:mm')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {log.accion}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.tabla_afectada}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.usuario?.email || 'Sistema'}</td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                    {JSON.stringify(log.detalles, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron registros de auditoría
        </div>
      )}
    </div>
  );
}
