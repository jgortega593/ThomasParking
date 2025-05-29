import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';

// Componente Emoji accesible
const Emoji = ({ symbol, label }) => (
  <span role="img" aria-label={label} className="inline text-2xl align-middle mx-1">
    {symbol}
  </span>
);

export default function SemaforoDescargos() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totales, setTotales] = useState({
    recaudadoTotal: 0,
    descargadoTotal: 0,
    pendienteDescargo: 0,
  });

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Total recaudado
        const { data: dataRecaudado } = await supabase
          .from('registros_parqueadero')
          .select('monto')
          .eq('recaudado', true);

        const recaudadoTotal = dataRecaudado?.reduce(
          (acc, item) => acc + Number(item.monto),
          0
        ) || 0;

        // Total descargado
        const { data: dataDescargos } = await supabase
          .from('descargos_gestion')
          .select('monto');

        const descargadoTotal = dataDescargos?.reduce(
          (acc, item) => acc + Number(item.monto || 0),
          0
        ) || 0;

        setTotales({
          recaudadoTotal,
          descargadoTotal,
          pendienteDescargo: recaudadoTotal - descargadoTotal,
        });
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;

  // Lógica de semáforo
  let status, color, emoji, message;
  if (totales.pendienteDescargo === 0 && totales.recaudadoTotal > 0) {
    status = 'OK';
    color = 'bg-green-100 text-green-800 border-green-400';
    emoji = '✅';
    message = '¡Todo justificado! No hay fondos pendientes.';
  } else if (totales.pendienteDescargo > 0) {
    status = 'Pendiente';
    color = 'bg-yellow-100 text-yellow-800 border-yellow-400';
    emoji = '🟡';
    message = 'Fondos recaudados pendientes de justificación.';
  } else if (totales.pendienteDescargo < 0) {
    status = 'Exceso';
    color = 'bg-red-100 text-red-800 border-red-400';
    emoji = '⚠️';
    message = '¡Descargos mayores que lo recaudado!';
  } else {
    status = 'Sin datos';
    color = 'bg-gray-100 text-gray-800 border-gray-400';
    emoji = 'ℹ️';
    message = 'No hay movimientos registrados.';
  }

  return (
    <section className={`border-l-4 p-4 mb-6 rounded shadow-sm ${color} flex flex-col md:flex-row md:items-center gap-4`}>
      <div className="flex items-center gap-3">
        <Emoji symbol={emoji} label={status} />
        <span className="font-bold text-lg">{message}</span>
      </div>
      <div className="flex flex-wrap gap-3 mt-2 md:mt-0 md:ml-auto">
        <div className="flex items-center gap-1">
          <Emoji symbol="💰" label="Recaudado" />
          <span className="font-semibold">Recaudado:</span>
          <span>${totales.recaudadoTotal.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <Emoji symbol="📤" label="Descargado" />
          <span className="font-semibold">Descargado:</span>
          <span>${totales.descargadoTotal.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <Emoji symbol="⏳" label="Pendiente" />
          <span className="font-semibold">Pendiente:</span>
          <span>${totales.pendienteDescargo.toLocaleString()}</span>
        </div>
      </div>
    </section>
  );
}
