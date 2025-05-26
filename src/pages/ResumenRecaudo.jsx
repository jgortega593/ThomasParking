import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import Loader from '../components/Loader';
import Emoji from '../components/Emoji';
import ExportarPDF from '../components/ExportarPDF';
import ErrorMessage from '../components/ErrorMessage';
import SelectorDeFoto from '../components/SelectorDeFoto';
import dayjs from 'dayjs';

export default function ResumenRecaudo() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [montoRecaudar, setMontoRecaudar] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [registrosModificados, setRegistrosModificados] = useState([]);
  const [propiedades, setPropiedades] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [filtroPropiedad, setFiltroPropiedad] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState('');
  const [filtroCopropietario, setFiltroCopropietario] = useState('');
  const [fotosEvidencia, setFotosEvidencia] = useState([]);

  // Columnas para exportar a PDF
  const columnasPDF = [
    { header: 'Fecha', key: 'fecha_hora_ingreso', formatter: v => dayjs(v).format('DD/MM/YY HH:mm') },
    { header: 'Placa', key: 'placa_vehiculo' },
    { header: 'Tipo', key: 'tipo_vehiculo' },
    { header: 'Monto', key: 'monto', formatter: v => `$${Number(v).toFixed(2)}` },
    { header: 'Evidencia', key: 'evidencia_recaudo', formatter: urls => Array.isArray(urls) && urls.length ? 'Sí' : 'No' }
  ];

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [resRegistros, resCopropietarios] = await Promise.all([
          supabase.from('registros_parqueadero')
            .select('*, copropietarios:dependencia_id(nombre, propiedad, unidad_asignada)')
            .order('fecha_hora_ingreso', { ascending: false }),
          supabase.from('copropietarios').select('propiedad, unidad_asignada')
        ]);
        if (resRegistros.error) throw resRegistros.error;
        if (resCopropietarios.error) throw resCopropietarios.error;
        setRegistros(resRegistros.data || []);
        setPropiedades([...new Set(resCopropietarios.data.map(c => c.propiedad))].sort());
        setUnidades(resCopropietarios.data || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  // Opciones únicas para selects dependientes
  const unidadesFiltradas = filtroPropiedad
    ? [...new Set(unidades.filter(u => u.propiedad === filtroPropiedad).map(u => u.unidad_asignada))]
    : [];

  // Filtrado de registros
  const registrosFiltrados = registros.filter(reg => {
    const coincidePropiedad = !filtroPropiedad || reg.copropietarios?.propiedad === filtroPropiedad;
    const coincideUnidad = !filtroUnidad || reg.copropietarios?.unidad_asignada === filtroUnidad;
    const coincideNombre = !filtroCopropietario || (reg.copropietarios?.nombre || '').toLowerCase().includes(filtroCopropietario.toLowerCase());
    return coincidePropiedad && coincideUnidad && coincideNombre;
  });

  // Resumen estadístico
  const resumen = registrosFiltrados.reduce((acc, reg) => {
    if (reg.gratis) acc.gratis++;
    else if (reg.recaudado) acc.recaudado += Number(reg.monto);
    else acc.pendiente += Number(reg.monto);
    return acc;
  }, { recaudado: 0, pendiente: 0, gratis: 0 });

  // Algoritmo recursivo para encontrar combinación exacta
  function encontrarCombinacionExacta(registros, objetivo, index = 0, seleccionados = []) {
    if (Math.abs(objetivo) < 0.01) return seleccionados;
    if (objetivo < 0 || index >= registros.length) return null;
    const montoActual = parseFloat(registros[index].monto);
    const conActual = encontrarCombinacionExacta(
      registros, +(objetivo - montoActual).toFixed(2), index + 1, [...seleccionados, registros[index]]
    );
    if (conActual) return conActual;
    return encontrarCombinacionExacta(registros, objetivo, index + 1, seleccionados);
  }

  // Subida de evidencia a Supabase Storage
  const subirEvidencia = async () => {
    const urls = [];
    for (const foto of fotosEvidencia) {
      const extension = foto.name.split('.').pop().toLowerCase();
      const nombreArchivo = `evidencia-recaudo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${extension}`;
      const { error } = await supabase.storage
        .from('evidencias-recaudo')
        .upload(nombreArchivo, foto, {
          contentType: foto.type
        });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from('evidencias-recaudo')
          .getPublicUrl(nombreArchivo);
        urls.push(publicUrl);
      } else {
        throw error;
      }
    }
    return urls;
  };

  // Proceso de recaudación exacta
  const handleRecaudoExacto = async () => {
    setError('');
    setRegistrosModificados([]);
    if (!filtroPropiedad || !filtroUnidad) {
      setError('Debe seleccionar propiedad y unidad asignada');
      return;
    }
    const montoObjetivo = parseFloat(montoRecaudar);
    if (isNaN(montoObjetivo) || montoObjetivo <= 0) {
      setError('Ingrese un monto válido mayor a 0');
      return;
    }
    if (fotosEvidencia.length === 0) {
      setError('Debe adjuntar al menos una evidencia fotográfica');
      return;
    }
    setProcesando(true);
    try {
      const pendientes = registrosFiltrados
        .filter(r => !r.recaudado && !r.gratis)
        .sort((a, b) => new Date(a.fecha_hora_ingreso) - new Date(b.fecha_hora_ingreso));
      const seleccion = encontrarCombinacionExacta(pendientes, +montoObjetivo.toFixed(2));
      if (!seleccion || seleccion.length === 0) {
        setError('No existe una combinación exacta de registros para el monto ingresado.');
        setProcesando(false);
        return;
      }
      const sumaSeleccion = seleccion.reduce((acc, r) => acc + parseFloat(r.monto), 0);
      if (Math.abs(sumaSeleccion - montoObjetivo) > 0.009) {
        setError('No existe una combinación exacta de registros para el monto ingresado.');
        setProcesando(false);
        return;
      }
      // Subir evidencia
      const urlsEvidencia = await subirEvidencia();
      // Actualizar registros seleccionados
      const updates = seleccion.map(reg =>
        supabase
          .from('registros_parqueadero')
          .update({
            recaudado: true,
            fecha_recaudo: new Date().toISOString(),
            evidencia_recaudo: urlsEvidencia
          })
          .eq('id', reg.id)
      );
      const resultados = await Promise.all(updates);
      const errores = resultados.filter(r => r.error);
      if (errores.length === 0) {
        setRegistros(prev =>
          prev.map(r =>
            seleccion.some(m => m.id === r.id)
              ? { ...r, recaudado: true, fecha_recaudo: new Date(), evidencia_recaudo: urlsEvidencia }
              : r
          )
        );
        setRegistrosModificados(seleccion.map(r => ({ ...r, evidencia_recaudo: urlsEvidencia })));
        setMontoRecaudar('');
        setFotosEvidencia([]);
      } else {
        setError(`Error al actualizar algunos registros (${errores.length})`);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setProcesando(false);
    }
  };

  if (loading) return <Loader text="Cargando datos..." />;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">
          <Emoji symbol="📊" /> Resumen de Recaudación
        </h2>
        <ExportarPDF
          datos={registrosModificados}
          columnas={columnasPDF}
          titulo="Registros Recaudados"
        />
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

      {/* Sección de recaudación exacta y evidencia */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-semibold mb-4">
          <Emoji symbol="⚡" /> Recaudo Exacto
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Monto a recaudar ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={montoRecaudar}
              onChange={e => setMontoRecaudar(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Ej: 25.50"
              disabled={procesando}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Evidencia Fotográfica (Máx. 5 fotos)</label>
            <SelectorDeFoto
              onFilesSelected={setFotosEvidencia}
              maxFiles={5}
              disabled={procesando}
            />
          </div>
        </div>
        <button
          onClick={handleRecaudoExacto}
          disabled={!montoRecaudar || procesando}
          className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {procesando ? <Loader text="Procesando..." /> : 'Ejecutar Recaudo'}
        </button>
        {error && <ErrorMessage message={error} className="mt-4" />}
        <div className="mt-2 text-sm text-gray-600">
          El monto debe coincidir exactamente con la suma de los montos de los registros seleccionados. Si no existe una combinación exacta, la operación no se realizará.
        </div>
      </div>

      {/* Resumen estadístico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-100 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-700">
            <Emoji symbol="💰" /> ${resumen.recaudado.toFixed(2)}
          </div>
          <span className="text-sm">Total Recaudado</span>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-700">
            <Emoji symbol="⏳" /> ${resumen.pendiente.toFixed(2)}
          </div>
          <span className="text-sm">Pendiente</span>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-700">
            <Emoji symbol="🆓" /> {resumen.gratis}
          </div>
          <span className="text-sm">Registros Gratis</span>
        </div>
      </div>

      {/* Tabla de registros */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2">Placa</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Monto</th>
              <th className="px-4 py-2">Copropietario</th>
              <th className="px-4 py-2">Fecha Recaudo</th>
              <th className="px-4 py-2">Evidencia</th>
            </tr>
          </thead>
          <tbody>
            {registrosFiltrados.map(reg => (
              <tr key={reg.id} className={reg.recaudado ? 'bg-green-50' : 'bg-white'}>
                <td className="px-4 py-2">{reg.placa_vehiculo}</td>
                <td className="px-4 py-2">{reg.tipo_vehiculo}</td>
                <td className="px-4 py-2">${reg.monto.toFixed(2)}</td>
                <td className="px-4 py-2">{reg.copropietarios?.nombre || '-'}</td>
                <td className="px-4 py-2">
                  {reg.fecha_recaudo ? dayjs(reg.fecha_recaudo).format('DD/MM/YY HH:mm') : '-'}
                </td>
                <td className="px-4 py-2">
                  {reg.evidencia_recaudo?.map(url => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="inline-block mr-2">
                      <img src={url} alt="Evidencia" className="w-12 h-12 object-cover rounded" />
                    </a>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
