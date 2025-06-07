import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import Emoji from '../components/Emoji';
import SelectorDeFoto from '../components/SelectorDeFoto';
import SemaforoResumen from '../components/SemaforoResumen';
import dayjs from 'dayjs';

export default function ResumenRecaudo() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [montoRecaudar, setMontoRecaudar] = useState('');
  const [fotos, setFotos] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [exito, setExito] = useState('');
  const [errorRecaudo, setErrorRecaudo] = useState('');
  const [filtroPropiedad, setFiltroPropiedad] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState('');
  const [copropietarios, setCopropietarios] = useState([]);

  useEffect(() => {
    const cargarCopropietarios = async () => {
      const { data } = await supabase
        .from('copropietarios')
        .select('propiedad, unidad_asignada');
      setCopropietarios(data || []);
    };
    cargarCopropietarios();
  }, []);

  useEffect(() => {
    const cargarRegistros = async () => {
      const { data, error } = await supabase
        .from('registros_parqueadero')
        .select('*, copropietarios:dependencia_id(propiedad, unidad_asignada)')
        .order('fecha_hora_ingreso', { ascending: false });
      setRegistros(data || []);
      setLoading(false);
      if (error) setError('Error al cargar registros');
    };
    cargarRegistros();
  }, []);

  const propiedades = [...new Set(copropietarios.map(c => c.propiedad))].sort();
  const unidadesFiltradas = filtroPropiedad
    ? [...new Set(copropietarios.filter(c => c.propiedad === filtroPropiedad).map(c => c.unidad_asignada))]
    : [];

  const registrosFiltrados = registros.filter(reg =>
    (!filtroPropiedad || reg.copropietarios?.propiedad === filtroPropiedad) &&
    (!filtroUnidad || reg.copropietarios?.unidad_asignada === filtroUnidad)
  );

  const handleRecaudar = async () => {
    setErrorRecaudo('');
    setExito('');
    if (!filtroPropiedad || !filtroUnidad) {
      setErrorRecaudo('Debe seleccionar propiedad y unidad asignada');
      return;
    }
    if (!montoRecaudar || isNaN(Number(montoRecaudar)) || Number(montoRecaudar) <= 0) {
      setErrorRecaudo('Ingrese un monto válido mayor a 0');
      return;
    }
    // Se elimina la validación de fotos para permitir recaudo sin evidencia
    setProcesando(true);
    try {
      // Subir las fotos a Supabase Storage y obtener las URLs (opcional)
      let urls = [];
      if (fotos.length > 0) {
        for (let i = 0; i < fotos.length; i++) {
          const file = fotos[i];
          const filePath = `${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('evidencias-recaudo')
            .upload(filePath, file, { upsert: true });
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('evidencias-recaudo').getPublicUrl(filePath);
          urls.push(data.publicUrl);
        }
      }

      // Obtener registros pendientes más antiguos y validar sumatoria
      const pendientes = registrosFiltrados
        .filter(r => !r.recaudado && !r.gratis)
        .sort((a, b) => new Date(a.fecha_hora_ingreso) - new Date(b.fecha_hora_ingreso));
      const totalPendiente = pendientes.reduce((sum, r) => sum + Number(r.monto), 0);
      if (Number(montoRecaudar) !== totalPendiente) {
        setErrorRecaudo(`Monto ingresado (${montoRecaudar}) ≠ Total pendiente (${totalPendiente})`);
        return;
      }

      // Actualizar registros
      for (const registro of pendientes) {
        const { error: updateError } = await supabase
          .from('registros_parqueadero')
          .update({
            recaudado: true,
            fecha_recaudo: new Date().toISOString(),
            evidencia_recaudo: urls,
            monto: Number(registro.monto) // Conserva el monto original del registro
          })
          .eq('id', registro.id);
        if (updateError) throw updateError;
      }

      setExito(`Recaudo de $${montoRecaudar} registrado en ${pendientes.length} tickets`);
      setFotos([]);
      setMontoRecaudar('');

      // Recargar registros
      const { data: nuevosRegistros } = await supabase
        .from('registros_parqueadero')
        .select('*, copropietarios:dependencia_id(propiedad, unidad_asignada)')
        .order('fecha_hora_ingreso', { ascending: false });
      setRegistros(nuevosRegistros || []);

    } catch (e) {
      setErrorRecaudo('Error al registrar recaudo: ' + (e.message || e));
    } finally {
      setProcesando(false);
    }
  };

  const EvidenciaCell = ({ evidencia }) => {
    let fotos = [];
    if (Array.isArray(evidencia)) {
      fotos = evidencia.filter(url => url && url.trim() !== '');
    } else if (typeof evidencia === 'string' && evidencia.trim() !== '') {
      fotos = [evidencia];
    }
    if (fotos.length === 0) {
      return <span style={{ color: '#ef4444', fontSize: 22 }}>⌚</span>;
    }
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', minWidth: 44 }}>
        {fotos.slice(0, 5).map((url, idx) => (
          <a
            key={idx}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={`Evidencia ${idx + 1}`}
            style={{
              display: 'inline-block',
              marginRight: 2,
              marginLeft: idx === 0 ? 0 : -8,
              zIndex: 5 - idx,
              borderRadius: 6,
              border: '1.5px solid #e5e7eb',
              boxShadow: '0 2px 4px rgba(0,0,0,0.13)',
              overflow: 'hidden'
            }}
          >
            <img
              loading="lazy"
              src={url}
              alt={`Evidencia ${idx + 1}`}
              width={38}
              height={38}
              style={{
                width: 38,
                height: 38,
                objectFit: 'cover',
                borderRadius: 6,
                display: 'block'
              }}
            />
          </a>
        ))}
        {fotos.length > 5 && (
          <span style={{ marginLeft: 4, fontSize: 13, fontWeight: 600, color: '#2563eb' }}>
            +{fotos.length - 5}
          </span>
        )}
      </div>
    );
  };

  if (loading) return <Loader text="Cargando resumen..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Emoji symbol="💰" /> Recaudo Parqueo Visita
      </h2>

      <SemaforoResumen registros={registrosFiltrados} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        <div>
          <label className="block text-sm font-medium mb-1">Propiedad:</label>
          <select
            value={filtroPropiedad}
            onChange={e => {
              setFiltroPropiedad(e.target.value);
              setFiltroUnidad('');
            }}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Seleccione propiedad...</option>
            {propiedades.map(prop => (
              <option key={prop} value={prop}>{prop}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Unidad asignada:</label>
          <select
            value={filtroUnidad}
            onChange={e => setFiltroUnidad(e.target.value)}
            className="w-full p-2 border rounded-md"
            disabled={!filtroPropiedad}
          >
            <option value="">Seleccione unidad...</option>
            {unidadesFiltradas.map(unidad => (
              <option key={unidad} value={unidad}>{unidad}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Emoji symbol="⚡" /> Proceso de Recaudación
        </h3>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
          <label className="block text-sm font-medium">
            <Emoji symbol="💵" /> Monto a recaudar ($)
            <input
              type="number"
              min="0"
              step="0.01"
              value={montoRecaudar}
              onChange={e => setMontoRecaudar(e.target.value)}
              placeholder="Ej: 25.50"
              className="ml-2 p-2 border rounded w-32"
              disabled={procesando}
            />
          </label>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            <Emoji symbol="📷" /> Evidencia fotográfica (Máx. 5) <span className="text-gray-500">(Opcional)</span>
          </label>
          <SelectorDeFoto
            onFilesSelected={setFotos}
            maxFiles={5}
            disabled={procesando}
          />
        </div>

        <button
          onClick={handleRecaudar}
          disabled={procesando}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Emoji symbol="⚡" /> Ejecutar Recaudo
        </button>
        {errorRecaudo && <ErrorMessage message={errorRecaudo} />}
        {exito && (
          <div className="bg-green-100 text-green-700 p-3 rounded-md mt-4">
            ✅ {exito}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg shadow mt-8">
        <table className="min-w-full bg-white">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-4 py-3 text-left"><Emoji symbol="🚘" /> Placa</th>
              <th className="px-4 py-3 text-left"><Emoji symbol="🚦" /> Tipo</th>
              <th className="px-4 py-3 text-left"><Emoji symbol="💲" /> Monto</th>
              <th className="px-4 py-3 text-left"><Emoji symbol="🏠" /> Copropietario</th>
              <th className="px-4 py-3 text-left"><Emoji symbol="⏱️" /> Fecha Recaudo</th>
              <th className="px-4 py-3 text-left"><Emoji symbol="📷" /> Evidencia</th>
            </tr>
          </thead>
          <tbody>
            {registrosFiltrados.length > 0 ? (
              registrosFiltrados.map(reg => (
                <tr key={reg.id}>
                  <td>{reg.placa_vehiculo}</td>
                  <td>
                    {reg.tipo_vehiculo === 'carro' && <Emoji symbol="🚙" label="Carro" />}
                    {reg.tipo_vehiculo === 'moto' && <Emoji symbol="🛵" label="Moto" />}
                  </td>
                  <td>${Number(reg.monto).toFixed(2)}</td>
                  <td>
                    {reg.copropietarios ? (
                      <>
                        {reg.copropietarios.propiedad === 'Casa' && <Emoji symbol="🏡" label="Casa" />}
                        {reg.copropietarios.propiedad === 'Departamento' && <Emoji symbol="🌆" label="Departamento" />}
                        {' '}
                        - {reg.copropietarios.unidad_asignada}
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    {reg.fecha_recaudo
                      ? dayjs(reg.fecha_recaudo).format('DD/MM/YYYY HH:mm')
                      : <span style={{ color: '#aaa' }}>-</span>}
                  </td>
                  <td>
                    <EvidenciaCell evidencia={reg.evidencia_recaudo} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="sin-resultados">
                  No se encontraron registros con los filtros seleccionados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
