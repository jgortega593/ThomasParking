import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import supabase from '../supabaseClient';
import Loader from '../components/Loader';
import Emoji from '../components/Emoji';
import dayjs from 'dayjs';
import ExportarPDF from '../components/ExportarPDF';
import ErrorMessage from '../components/ErrorMessage';
import ResumenRegistros from '../components/ResumenRegistros';
import SelectorDeFoto from '../components/SelectorDeFoto';

export default function Compensacion() {
  const { user } = useUser();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [montoCompensar, setMontoCompensar] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [errorCompensacion, setErrorCompensacion] = useState('');
  const [exito, setExito] = useState('');
  const [registrosModificados, setRegistrosModificados] = useState([]);
  const [copropietarios, setCopropietarios] = useState([]);
  const [filtroPropiedad, setFiltroPropiedad] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState('');
  const [fotosEvidencia, setFotosEvidencia] = useState([]);

  // Columnas para PDF
  const columnasPDF = [
    { header: 'Fecha', key: 'fecha_hora_ingreso', formatter: v => dayjs(v).format('DD/MM/YY HH:mm') },
    { header: 'Placa', key: 'placa_vehiculo' },
    { header: 'Tipo', key: 'tipo_vehiculo' },
    { header: 'Monto', key: 'monto', formatter: v => `$${Number(v).toFixed(2)}` },
    { header: 'Evidencia', key: 'evidencia_recaudo', formatter: urls => Array.isArray(urls) && urls.length ? 'Sí' : 'No' }
  ];

  // Cargar copropietarios y registros
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [resRegistros, resCopropietarios] = await Promise.all([
          supabase.from('registros_parqueadero').select('*, copropietarios:dependencia_id(propiedad, unidad_asignada)').order('fecha_hora_ingreso'),
          supabase.from('copropietarios').select('propiedad, unidad_asignada')
        ]);
        if (resRegistros.error) throw resRegistros.error;
        if (resCopropietarios.error) throw resCopropietarios.error;
        setRegistros(resRegistros.data || []);
        setCopropietarios(resCopropietarios.data || []);
      } catch (error) {
        setErrorCompensacion(error.message);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  // Opciones únicas para selects
  const propiedades = [...new Set(copropietarios.map(c => c.propiedad))].sort();
  const unidadesFiltradas = filtroPropiedad
    ? [...new Set(copropietarios.filter(c => c.propiedad === filtroPropiedad).map(c => c.unidad_asignada))]
    : [];

  // Filtrar registros por copropietario seleccionado
  const registrosFiltrados = registros.filter(reg =>
    reg.copropietarios?.propiedad === filtroPropiedad &&
    reg.copropietarios?.unidad_asignada === filtroUnidad
  );

  // Algoritmo para encontrar combinación exacta
  function encontrarCombinacionExacta(registros, objetivo, index = 0, seleccionados = []) {
    if (objetivo === 0) return seleccionados;
    if (objetivo < 0 || index >= registros.length) return null;
    // Incluir actual
    const montoActual = parseFloat(registros[index].monto);
    const conActual = encontrarCombinacionExacta(
      registros, +(objetivo - montoActual).toFixed(2), index + 1, [...seleccionados, registros[index]]
    );
    if (conActual) return conActual;
    // Omitir actual
    return encontrarCombinacionExacta(registros, objetivo, index + 1, seleccionados);
  }

  // Subir fotos a Supabase Storage y devolver URLs públicas
  const subirEvidencia = async () => {
    const urls = [];
    for (const foto of fotosEvidencia) {
      const nombreArchivo = `evidencia-recaudo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.jpg`;
      const { error } = await supabase.storage
        .from('evidencias-recaudo')
        .upload(nombreArchivo, foto);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from('evidencias-recaudo')
          .getPublicUrl(nombreArchivo);
        urls.push(publicUrl);
      }
    }
    return urls;
  };

  // Manejar la compensación exacta
  const handleMarcarGratis = async () => {
    setErrorCompensacion('');
    setExito('');
    if (!filtroPropiedad || !filtroUnidad) {
      setErrorCompensacion('Debe seleccionar propiedad y unidad asignada');
      return;
    }
    const montoObjetivo = parseFloat(montoCompensar);
    if (isNaN(montoObjetivo) || montoObjetivo <= 0) {
      setErrorCompensacion('Ingrese un monto válido mayor a 0');
      return;
    }
    if (fotosEvidencia.length === 0) {
      setErrorCompensacion('Debe adjuntar al menos una evidencia fotográfica');
      return;
    }
    setProcesando(true);
    try {
      const pendientes = registrosFiltrados
        .filter(r => !r.recaudado && !r.gratis)
        .sort((a, b) => new Date(a.fecha_hora_ingreso) - new Date(b.fecha_hora_ingreso));
      const seleccion = encontrarCombinacionExacta(pendientes, +montoObjetivo.toFixed(2));
      if (!seleccion || seleccion.length === 0) {
        setErrorCompensacion('No existe una combinación exacta de registros para el monto ingresado.');
        return;
      }
      const sumaSeleccion = seleccion.reduce((acc, r) => acc + parseFloat(r.monto), 0);
      if (Math.abs(sumaSeleccion - montoObjetivo) > 0.009) {
        setErrorCompensacion('No existe una combinación exacta de registros para el monto ingresado.');
        return;
      }
      // Subir evidencia
      const urlsEvidencia = await subirEvidencia();
      // Actualizar registros seleccionados
      const updates = seleccion.map(reg =>
        supabase
          .from('registros_parqueadero')
          .update({
            gratis: true,
            monto: 0,
            recaudado: false,
            fecha_recaudo: null,
            usuario_gratis: user?.id || null,
            fecha_gratis: new Date().toISOString(),
            evidencia_recaudo: urlsEvidencia
          })
          .eq('id', reg.id)
      );
      const resultados = await Promise.all(updates);
      const errores = resultados.filter(r => r.error);
      if (errores.length === 0) {
        setExito(`Marcados como gratis ${seleccion.length} registros (total: $${sumaSeleccion.toFixed(2)})`);
        setRegistros(prev =>
          prev.map(r =>
            seleccion.some(m => m.id === r.id)
              ? { ...r, gratis: true, monto: 0, recaudado: false, fecha_recaudo: null, evidencia_recaudo: urlsEvidencia }
              : r
          )
        );
        setRegistrosModificados(seleccion.map(r => ({ ...r, evidencia_recaudo: urlsEvidencia })));
      } else {
        setErrorCompensacion(`Error al actualizar algunos registros (${errores.length})`);
      }
      setMontoCompensar('');
      setFotosEvidencia([]);
    } catch (error) {
      setErrorCompensacion(error.message);
    } finally {
      setProcesando(false);
    }
  };

  if (loading) return <Loader text="Cargando resumen..." />;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">
          <Emoji symbol="💰" /> Gestión de Recaudo
        </h2>
        <ExportarPDF
          datos={registrosModificados}
          columnas={columnasPDF}
          titulo="Registros Compensados"
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

      {/* Sección de compensación y evidencia */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-semibold mb-4">
          <Emoji symbol="🎁" /> Compensación de Registros
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Monto a compensar ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={montoCompensar}
              onChange={e => setMontoCompensar(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Ej: 25.50"
              disabled={procesando}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleMarcarGratis}
              disabled={!montoCompensar || procesando}
              className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {procesando ? <Loader text="Procesando..." /> : 'Aplicar Compensación'}
            </button>
          </div>
        </div>

        {/* Selector de fotos de evidencia */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">
            <Emoji symbol="📸" /> Evidencia Fotográfica (Máx. 5 fotos)
          </label>
          <SelectorDeFoto
            onFilesSelected={setFotosEvidencia}
            maxFiles={5}
            disabled={procesando}
          />
        </div>

        {errorCompensacion && <ErrorMessage message={errorCompensacion} />}
        {exito && (
          <div className="bg-green-100 text-green-700 p-3 rounded-md mt-4">
            ✅ {exito}
          </div>
        )}
        <div className="mt-2 text-sm text-gray-600">
          El monto a compensar debe coincidir exactamente con la suma de los montos de los registros seleccionados. Si no existe una combinación exacta, la operación no se realizará.
        </div>
      </div>

      {/* Resumen estadístico */}
      <ResumenRegistros registros={registrosFiltrados} />

      {/* Registros modificados */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">
          <Emoji symbol="📝" /> Últimas compensaciones
        </h3>
        <div className="space-y-4">
          {registrosModificados.map(registro => (
            <div key={registro.id} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {dayjs(registro.fecha_hora_ingreso).format('DD/MM/YYYY HH:mm')}
                  </p>
                  <p className="text-sm text-gray-600">{registro.placa_vehiculo}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm line-through">${registro.monto}</p>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                    <Emoji symbol="✅" /> Compensado
                  </span>
                </div>
              </div>
              {registro.evidencia_recaudo?.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {registro.evidencia_recaudo.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="Evidencia" className="w-12 h-12 object-cover rounded" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
