import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import supabase from '../supabaseClient';
import Loader from '../components/Loader';
import Emoji from '../components/Emoji';
import dayjs from 'dayjs';
import ExportarPDF from '../components/ExportarPDF';
import ErrorMessage from '../components/ErrorMessage';
import SelectorDeFoto from '../components/SelectorDeFoto';
import SemaforoResumen from '../components/SemaforoResumen';

const ESFUERZO_OPCIONES = [
  { label: 'Mano de obra', value: 'mano_obra', emoji: '👷', seleccionado: false },
  { label: 'Materiales', value: 'materiales', emoji: '🧱', seleccionado: false },
  { label: 'Herramientas', value: 'herramientas', emoji: '🛠️', seleccionado: false }
];

export default function Compensacion() {
  const { user } = useUser();
  const [state, setState] = useState({
    registros: [],
    copropietarios: [],
    filtroPropiedad: '',
    filtroUnidad: '',
    montoCompensar: '',
    procesando: false,
    error: '',
    exito: '',
    registrosModificados: [],
    evidencias: [],
    esfuerzoNoEco: {
      opciones: ESFUERZO_OPCIONES,
      detalles: ''
    }
  });

  // Columnas para PDF
  const columnasPDF = [
    { header: 'Fecha', key: 'fecha_hora_ingreso', formatter: v => dayjs(v).format('DD/MM/YY HH:mm') },
    { header: 'Monto Original', key: 'monto', formatter: v => `$${v.toFixed(2)}` },
    { header: 'Estado', key: 'estado', formatter: (v, reg) => 
      reg.recaudado ? '⏳ Revertido' : '✅ Compensado' }
  ];

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [{ data: copropietarios }, { data: registros }] = await Promise.all([
          supabase.from('copropietarios').select('propiedad, unidad_asignada'),
          supabase.from('registros_parqueadero')
            .select('*, copropietarios:dependencia_id(propiedad, unidad_asignada)')
            .order('fecha_hora_ingreso', { ascending: true })
        ]);
        
        setState(prev => ({
          ...prev,
          registros: registros || [],
          copropietarios: copropietarios || []
        }));
      } catch (error) {
        setState(prev => ({ ...prev, error: error.message }));
      }
    };
    cargarDatos();
  }, []);

  // Checkboxes controlados
  const handleCheckboxChange = (index) => {
    setState(prev => ({
      ...prev,
      esfuerzoNoEco: {
        ...prev.esfuerzoNoEco,
        opciones: prev.esfuerzoNoEco.opciones.map((op, i) => 
          i === index ? { ...op, seleccionado: !op.seleccionado } : op
        )
      }
    }));
  };

  // Subida de evidencias
  const subirEvidencias = async (files) => {
    const evidenciaUrls = [];
    for (const file of files) {
      const nombre = `compensacion/${user.id}-${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      const { error } = await supabase.storage
        .from('evidencias')
        .upload(nombre, file);
      if (error) throw new Error(`Error subiendo ${file.name}: ${error.message}`);
      const { data: { publicUrl } } = supabase.storage
        .from('evidencias')
        .getPublicUrl(nombre);
      evidenciaUrls.push(publicUrl);
    }
    return evidenciaUrls;
  };

  // Lógica principal de compensación
  const handleMarcarGratis = async () => {
    setState(prev => ({ ...prev, error: '', exito: '', procesando: true }));
    
    try {
      const { filtroPropiedad, filtroUnidad, montoCompensar, registros, evidencias, esfuerzoNoEco } = state;
      
      // Validaciones
      if (!filtroPropiedad || !filtroUnidad) throw new Error('Seleccione propiedad y unidad');
      const montoObjetivo = parseFloat(montoCompensar);
      if (isNaN(montoObjetivo) || montoObjetivo <= 0) throw new Error('Monto inválido');

      // Filtrar registros
      const registrosFiltrados = registros.filter(r => 
        r.copropietarios?.propiedad === filtroPropiedad &&
        r.copropietarios?.unidad_asignada === filtroUnidad
      );

      // Buscar combinación exacta
      let pendientes = registrosFiltrados
        .filter(r => !r.recaudado && !r.gratis)
        .sort((a, b) => new Date(a.fecha_hora_ingreso) - new Date(b.fecha_hora_ingreso));

      let seleccion = encontrarCombinacionExacta(pendientes, montoObjetivo);
      let revertidos = [];

      if (!seleccion) {
        const recaudados = registrosFiltrados
          .filter(r => r.recaudado)
          .sort((a, b) => new Date(a.fecha_hora_ingreso) - new Date(b.fecha_hora_ingreso));
        seleccion = encontrarCombinacionExacta([...pendientes, ...recaudados], montoObjetivo);
        revertidos = seleccion?.filter(r => r.recaudado) || [];
      }

      if (!seleccion) throw new Error('No existe combinación exacta');

      // Subir evidencias
      let evidenciaUrls = [];
      if (evidencias.length > 0) {
        evidenciaUrls = await subirEvidencias(evidencias);
      }

      const opcionesSeleccionadas = esfuerzoNoEco.opciones.filter(op => op.seleccionado);
      const esEsfuerzoNoEconomico = opcionesSeleccionadas.length > 0;

      // Actualizaciones
      const updates = seleccion.map(reg => {
        const nuevasObservaciones = [
          reg.observaciones,
          opcionesSeleccionadas.map(op => `${op.emoji} ${op.label}`).join(', '),
          esfuerzoNoEco.detalles
        ].filter(Boolean).join(' | ');

        return supabase.from('registros_parqueadero')
          .update({
            gratis: esEsfuerzoNoEconomico ? false : true,
            monto: 0,
            recaudado: false,
            fecha_recaudo: null,
            usuario_gratis: esEsfuerzoNoEconomico ? null : user?.id,
            fecha_gratis: esEsfuerzoNoEconomico ? null : new Date().toISOString(),
            esfuerzo_no_economico: esEsfuerzoNoEconomico,
            observaciones: nuevasObservaciones,
            foto_url: evidenciaUrls.length > 0 ? supabase.sql`array[${evidenciaUrls}]` : reg.foto_url
          })
          .eq('id', reg.id);
      });

      const resultados = await Promise.all(updates);
      const errores = resultados.filter(r => r.error);
      if (errores.length > 0) throw new Error(`Error en ${errores.length} registros`);

      // Actualizar estado
      setState(prev => ({
        ...prev,
        registros: prev.registros.map(r => 
          seleccion.some(s => s.id === r.id) ? {
            ...r,
            gratis: esEsfuerzoNoEconomico ? false : true,
            monto: 0,
            recaudado: false,
            esfuerzo_no_economico: esEsfuerzoNoEconomico,
            observaciones: nuevasObservaciones,
            foto_url: evidenciaUrls.length > 0 ? evidenciaUrls : r.foto_url,
            fecha_gratis: esEsfuerzoNoEconomico ? null : new Date().toISOString()
          } : r
        ),
        registrosModificados: [...prev.registrosModificados, ...seleccion],
        exito: `Compensación aplicada: $${montoObjetivo.toFixed(2)}`,
        evidencias: [],
        esfuerzoNoEco: {
          opciones: prev.esfuerzoNoEco.opciones.map(op => ({ ...op, seleccionado: false })),
          detalles: ''
        },
        montoCompensar: ''
      }));

    } catch (error) {
      setState(prev => ({ ...prev, error: error.message }));
    } finally {
      setState(prev => ({ ...prev, procesando: false }));
    }
  };

  // Algoritmo de combinación exacta
  const encontrarCombinacionExacta = (registros, objetivo) => {
    const resultados = [];
    const backtrack = (restante, index, camino) => {
      if (Math.abs(restante) < 0.01) {
        resultados.push([...camino]);
        return;
      }
      if (restante < 0 || index >= registros.length) return;

      const actual = registros[index];
      const nuevoRestante = +(restante - actual.monto).toFixed(2);
      
      camino.push(actual);
      backtrack(nuevoRestante, index + 1, camino);
      camino.pop();
      backtrack(restante, index + 1, camino);
    };
    
    backtrack(objetivo, 0, []);
    return resultados[0] || null;
  };

  // Selectores
  const propiedades = [...new Set(state.copropietarios.map(c => c.propiedad))].sort();
  const unidadesFiltradas = state.filtroPropiedad
    ? [...new Set(state.copropietarios
        .filter(c => c.propiedad === state.filtroPropiedad)
        .map(c => c.unidad_asignada))]
    : [];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">
        <Emoji symbol="🎁" /> Gestión de Compensaciones
      </h2>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">
            <Emoji symbol="🏘️" /> Propiedad:
          </label>
          <select
            value={state.filtroPropiedad}
            onChange={e => setState(prev => ({
              ...prev,
              filtroPropiedad: e.target.value,
              filtroUnidad: ''
            }))}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Seleccione propiedad...</option>
            {propiedades.map(prop => (
              <option key={prop} value={prop}>{prop}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            <Emoji symbol="🚪" /> Unidad:
          </label>
          <select
            value={state.filtroUnidad}
            onChange={e => setState(prev => ({ ...prev, filtroUnidad: e.target.value }))}
            className="w-full p-2 border rounded-md"
            disabled={!state.filtroPropiedad}
          >
            <option value="">Seleccione unidad...</option>
            {unidadesFiltradas.map(unidad => (
              <option key={unidad} value={unidad}>{unidad}</option>
            ))}
          </select>
        </div>
      </div>

      <SemaforoResumen 
        registros={state.registros.filter(r => 
          r.copropietarios?.propiedad === state.filtroPropiedad &&
          r.copropietarios?.unidad_asignada === state.filtroUnidad
        )}
      />

      {/* Formulario de compensación */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              <Emoji symbol="💲" /> Monto a compensar:
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={state.montoCompensar}
              onChange={e => setState(prev => ({ ...prev, montoCompensar: e.target.value }))}
              placeholder="Ej: 25.50"
              className="w-full p-2 border rounded-md"
              disabled={state.procesando}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              <Emoji symbol="📷" /> Evidencia fotográfica:
            </label>
            <SelectorDeFoto 
              onFilesSelected={files => setState(prev => ({ ...prev, evidencias: files }))}
              maxFiles={3}
              disabled={state.procesando}
            />
          </div>
        </div>

        {/* Checklist esfuerzo no económico */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={state.esfuerzoNoEco.opciones.some(op => op.seleccionado)}
              onChange={() => {}}
              className="w-4 h-4"
            />
            <span className="font-medium text-blue-800">
              <Emoji symbol="♻️" /> Compensación mediante esfuerzo no económico
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            {state.esfuerzoNoEco.opciones.map((op, idx) => (
              <label key={op.value} className="flex items-center gap-2 p-3 bg-white rounded border hover:bg-blue-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={op.seleccionado}
                  onChange={() => handleCheckboxChange(idx)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="flex items-center gap-2">
                  <Emoji symbol={op.emoji} /> {op.label}
                </span>
              </label>
            ))}
          </div>

          <textarea
            value={state.esfuerzoNoEco.detalles}
            onChange={e => setState(prev => ({
              ...prev,
              esfuerzoNoEco: { ...prev.esfuerzoNoEco, detalles: e.target.value }
            }))}
            placeholder="Detalles adicionales del esfuerzo realizado..."
            className="w-full p-2 border rounded-md mt-4 h-24"
          />
        </div>

        <button
          onClick={handleMarcarGratis}
          disabled={!state.montoCompensar || state.procesando}
          className="w-full mt-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          {state.procesando ? (
            <><Loader inline /> Procesando...</>
          ) : (
            <><Emoji symbol="✅" /> Aplicar Compensación</>
          )}
        </button>

        {state.error && <ErrorMessage message={state.error} />}
        {state.exito && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">
            {state.exito}
          </div>
        )}
      </div>

      {/* Tabla de registros compensados */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">
          <Emoji symbol="📋" /> Registros Compensados
        </h3>
        <div className="overflow-x-auto rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Monto Original</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Evidencias</th>
              </tr>
            </thead>
            <tbody>
              {state.registrosModificados
                .filter(reg => reg.fecha_gratis !== null)
                .map(reg => (
                  <tr key={reg.id} className="hover:bg-gray-50 even:bg-gray-50">
                    <td className="px-4 py-2">
                      {dayjs(reg.fecha_hora_ingreso).format('DD/MM/YY HH:mm')}
                    </td>
                    <td className="px-4 py-2">${Number(reg.monto).toFixed(2)}</td>
                    <td className="px-4 py-2">
                      {reg.recaudado ? 
                        <span className="text-yellow-600"><Emoji symbol="⏳" /> Revertido</span> : 
                        <span className="text-green-600"><Emoji symbol="✅" /> Compensado</span>}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        {reg.foto_url?.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={url}
                              alt={`Evidencia ${idx + 1}`}
                              className="w-10 h-10 object-cover rounded border"
                            />
                          </a>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <ExportarPDF
        datos={state.registrosModificados.filter(reg => reg.fecha_gratis !== null)}
        columnas={columnasPDF}
        titulo="Registros Compensados"
      />
    </div>
  );
}
