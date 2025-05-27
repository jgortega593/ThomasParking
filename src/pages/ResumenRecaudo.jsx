import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import Loader from '../components/Loader';
import Emoji from '../components/Emoji';
import ExportarPDF from '../components/ExportarPDF';
import ErrorMessage from '../components/ErrorMessage';
import SelectorDeFoto from '../components/SelectorDeFoto';
import dayjs from 'dayjs';
import SemaforoResumen from '../components/SemaforoResumen';

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

  // Configuración de columnas para PDF
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

  // Algoritmo optimizado para encontrar combinación exacta
  const encontrarCombinacionExacta = (registros, objetivo) => {
    const dp = Array(Math.floor(objetivo * 100) + 1).fill(null).map(() => []);
    dp[0] = [[]];

    for (const reg of registros) {
      const monto = Math.round(reg.monto * 100);
      for (let j = Math.floor(objetivo * 100); j >= monto; j--) {
        if (dp[j - monto].length > 0) {
          dp[j] = [...dp[j], ...dp[j - monto].map(combo => [...combo, reg])];
        }
      }
    }

    const resultados = dp[Math.floor(objetivo * 100)];
    return resultados?.[0] || null;
  };

  // Subida de evidencia a Supabase Storage
  const subirEvidencia = async () => {
    const urls = [];
    for (const foto of fotosEvidencia) {
      const extension = foto.name.split('.').pop().toLowerCase();
      const nombreArchivo = `evidencia-recaudo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${extension}`;
      const { error } = await supabase.storage
        .from('evidencias-recaudo')
        .upload(nombreArchivo, foto, { contentType: foto.type });
      
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
    
    try {
      // Validaciones
      if (!filtroPropiedad || !filtroUnidad) throw new Error('Debe seleccionar propiedad y unidad');
      const montoObjetivo = parseFloat(montoRecaudar);
      if (isNaN(montoObjetivo) || montoObjetivo <= 0) throw new Error('Monto inválido');
      if (fotosEvidencia.length === 0) throw new Error('Debe adjuntar evidencia fotográfica');

      setProcesando(true);
      
      // Filtrar y ordenar registros
      const pendientes = registrosFiltrados
        .filter(r => !r.recaudado && !r.gratis)
        .sort((a, b) => new Date(a.fecha_hora_ingreso) - new Date(b.fecha_hora_ingreso));

      // Buscar combinación exacta
      const seleccion = encontrarCombinacionExacta(pendientes, montoObjetivo);
      if (!seleccion) throw new Error('No existe combinación exacta para el monto ingresado');

      // Subir evidencia
      const urlsEvidencia = await subirEvidencia();

      // Actualizar registros
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
      if (errores.length > 0) throw new Error(`Error en ${errores.length} registros`);

      // Actualizar estado local
      setRegistros(prev => 
        prev.map(r => 
          seleccion.some(s => s.id === r.id) 
            ? { ...r, recaudado: true, fecha_recaudo: new Date(), evidencia_recaudo: urlsEvidencia } 
            : r
        )
      );
      
      setRegistrosModificados(seleccion);
      setMontoRecaudar('');
      setFotosEvidencia([]);
      
    } catch (e) {
      setError(e.message);
    } finally {
      setProcesando(false);
    }
  };

  if (loading) return <Loader text="Cargando datos..." />;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          <Emoji symbol="📊" /> Gestión de Recaudación
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
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">Todas las propiedades</option>
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
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            disabled={!filtroPropiedad}
          >
            <option value="">Todas las unidades</option>
            {unidadesFiltradas.map(unidad => (
              <option key={unidad} value={unidad}>{unidad}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Semaforo de Resumen */}
      <SemaforoResumen 
        registros={registrosFiltrados}
        customLabels={{
          recaudado: 'Recaudado',
          pendiente: 'Pendiente',
          gratis: 'Gratis',
          cantidad: 'Registros',
          total: 'Total'
        }}
        colorFondo="rgba(243, 244, 246, 0.5)"
        className="mb-8"
      />

      {/* Sección de recaudación */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-inner mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
          <Emoji symbol="⚡" /> Proceso de Recaudación
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Monto a recaudar ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={montoRecaudar}
              onChange={e => setMontoRecaudar(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600"
              placeholder="Ej: 25.50"
              disabled={procesando}
            />
          </div>
          
          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Evidencia fotográfica (Máx. 5)
            </label>
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
          className="w-full mt-4 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
        >
          {procesando ? (
            <Loader text="Procesando..." />
          ) : (
            <>
              <Emoji symbol="✅" /> Ejecutar Recaudo
            </>
          )}
        </button>

        {error && (
          <ErrorMessage 
            message={error} 
            className="mt-4"
          />
        )}
      </div>

      {/* Tabla de registros */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Placa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Monto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Copropietario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha Recaudo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Evidencia</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {registrosFiltrados.map(reg => (
              <tr key={reg.id} className={reg.recaudado ? 'bg-green-50 dark:bg-green-900' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{reg.placa_vehiculo}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  <Emoji symbol={reg.tipo_vehiculo === 'carro' ? '🚗' : '🏍️'} /> {reg.tipo_vehiculo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  ${Number(reg.monto).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {reg.copropietarios?.nombre || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {reg.fecha_recaudo ? dayjs(reg.fecha_recaudo).format('DD/MM/YY HH:mm') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {reg.evidencia_recaudo?.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mr-2"
                    >
                      <img
                        src={url}
                        alt={`Evidencia ${index + 1}`}
                        className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-600"
                      />
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
