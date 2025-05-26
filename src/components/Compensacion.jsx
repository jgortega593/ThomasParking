import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import supabase from '../supabaseClient';
import Loader from '../components/Loader';
import Emoji from '../components/Emoji';
import dayjs from 'dayjs';
import ExportarPDF from '../components/ExportarPDF';
import ErrorMessage from '../components/ErrorMessage';
import ResumenRegistros from '../components/ResumenRegistros';

export default function ResumenRecaudo() {
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

  // Columnas para PDF
  const columnasPDF = [
    { header: 'Fecha', key: 'fecha_hora_ingreso', formatter: v => dayjs(v).format('DD/MM/YY HH:mm') },
    { header: 'Placa', key: 'placa_vehiculo' },
    { header: 'Tipo', key: 'tipo_vehiculo' },
    { header: 'Monto Original', key: 'monto', formatter: v => `$${Number(v).toFixed(2)}` }
  ];

  // Cargar copropietarios
  useEffect(() => {
    const cargarCopropietarios = async () => {
      const { data, error } = await supabase
        .from('copropietarios')
        .select('propiedad, unidad_asignada');
      if (!error && data) setCopropietarios(data);
    };
    cargarCopropietarios();
  }, []);

  // Cargar registros
  useEffect(() => {
    const cargarRegistros = async () => {
      const { data } = await supabase
        .from('registros_parqueadero')
        .select('*, copropietarios:dependencia_id(propiedad, unidad_asignada)')
        .order('fecha_hora_ingreso', { ascending: true });
      setRegistros(data || []);
      setLoading(false);
    };
    cargarRegistros();
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

  // Algoritmo para encontrar combinación exacta de registros
  function encontrarCombinacionExacta(registros, objetivo, index = 0, seleccionados = []) {
    if (objetivo === 0) return seleccionados;
    if (objetivo < 0 || index >= registros.length) return null;
    // Incluir el registro actual
    const conActual = encontrarCombinacionExacta(
      registros,
      +(objetivo - parseFloat(registros[index].monto)).toFixed(2),
      index + 1,
      [...seleccionados, registros[index]]
    );
    if (conActual) return conActual;
    // Omitir el registro actual
    return encontrarCombinacionExacta(registros, objetivo, index + 1, seleccionados);
  }

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
    setProcesando(true);
    try {
      // Solo registros pendientes y no gratis del copropietario seleccionado
      const pendientes = registrosFiltrados
        .filter(r => !r.recaudado && !r.gratis)
        .sort((a, b) => new Date(a.fecha_hora_ingreso) - new Date(b.fecha_hora_ingreso));
      // Buscar combinación exacta
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
      // Actualizar los registros seleccionados
      const updates = seleccion.map(reg =>
        supabase
          .from('registros_parqueadero')
          .update({
            gratis: true,
            monto: 0,
            recaudado: false,
            fecha_recaudo: null,
            usuario_gratis: user?.id || null,
            fecha_gratis: new Date().toISOString()
          })
          .eq('id', reg.id)
      );
      const resultados = await Promise.all(updates);
      const errores = resultados.filter(r => r.error);
      if (errores.length === 0) {
        setExito(`Marcados como gratis ${seleccion.length} registros (total: $${sumaSeleccion.toFixed(2)})`);
        setRegistros(prev =>
          prev.map(r =>
            seleccion.some(m => m.id === r.id) ? { ...r, gratis: true, monto: 0, recaudado: false, fecha_recaudo: null } : r
          )
        );
        setRegistrosModificados(seleccion);
      } else {
        setErrorCompensacion(`Error al actualizar algunos registros (${errores.length})`);
      }
      setMontoCompensar('');
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
          titulo="Registros Marcados como Gratis"
        />
      </div>

      {/* Filtros de copropietario */}
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

      {/* Sección para marcar registros como gratis */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-semibold mb-4">
          <Emoji symbol="🎁" /> Marcar registros como gratis
        </h3>
        <div className="input-group flex items-center gap-4">
          <label className="block text-sm font-medium">
            Monto total a compensar:
            <input
              type="number"
              min="0"
              step="0.01"
              value={montoCompensar}
              onChange={e => setMontoCompensar(e.target.value)}
              placeholder="Ej: 15.50"
              className="ml-2 p-2 border rounded w-32"
              disabled={procesando}
            />
          </label>
          <button
            onClick={handleMarcarGratis}
            disabled={!montoCompensar || procesando}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            {procesando ? <Loader text="Procesando..." /> : 'Aplicar compensación'}
          </button>
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

      {/* Tabla de registros modificados */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">
          <Emoji symbol="📝" /> Últimos registros marcados como gratis
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
                    <Emoji symbol="✅" /> Gratis
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
