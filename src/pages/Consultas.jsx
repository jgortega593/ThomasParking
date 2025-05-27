// src/pages/Consultas.jsx
import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';
import Loader from '../components/Loader';
import Emoji from '../components/Emoji';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';
import useOnlineStatus from '../hooks/useOnlineStatus';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SemaforoResumen from '../components/SemaforoResumen';
import ListaRegistros from '../components/ListaRegistros';

export default function Consultas() {
  const [registros, setRegistros] = useState([]);
  const [copropietarios, setCopropietarios] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    placa: '',
    propiedad: '',
    unidadAsignada: '',
    tipoVehiculo: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalExportar, setModalExportar] = useState(false);
  const [nombrePDF, setNombrePDF] = useState('');
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [resRegistros, resCopropietarios] = await Promise.all([
          supabase
            .from('registros_parqueadero')
            .select(`
              id,
              placa_vehiculo,
              tipo_vehiculo,
              fecha_hora_ingreso,
              observaciones,
              foto_url,
              gratis,
              monto,
              recaudado,
              fecha_recaudo,
              dependencia_id,
              observacion_audio_url,
              copropietarios:dependencia_id(nombre, propiedad, unidad_asignada),
              usuarios_app:usuario_id(nombre, rol)
            `)
            .order('fecha_hora_ingreso', { ascending: false }),
          supabase
            .from('copropietarios')
            .select('id, nombre, propiedad, unidad_asignada')
        ]);
        if (resRegistros.error) throw resRegistros.error;
        if (resCopropietarios.error) throw resCopropietarios.error;
        setRegistros(resRegistros.data || []);
        setCopropietarios(resCopropietarios.data || []);
        setResultados(resRegistros.data || []);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  // Actualiza resultados cuando cambian los filtros o los registros
  useEffect(() => {
    let filtrados = [...registros];
    if (filtros.fechaInicio) {
      filtrados = filtrados.filter(r =>
        dayjs(r.fecha_hora_ingreso).isAfter(dayjs(filtros.fechaInicio).startOf('day'))
      );
    }
    if (filtros.fechaFin) {
      filtrados = filtrados.filter(r =>
        dayjs(r.fecha_hora_ingreso).isBefore(dayjs(filtros.fechaFin).endOf('day'))
      );
    }
    if (filtros.placa) {
      filtrados = filtrados.filter(r =>
        r.placa_vehiculo.toLowerCase().includes(filtros.placa.toLowerCase())
      );
    }
    if (filtros.tipoVehiculo) {
      filtrados = filtrados.filter(r =>
        r.tipo_vehiculo === filtros.tipoVehiculo
      );
    }
    if (filtros.propiedad) {
      filtrados = filtrados.filter(r =>
        r.copropietarios?.propiedad === filtros.propiedad
      );
    }
    if (filtros.unidadAsignada) {
      filtrados = filtrados.filter(r =>
        r.copropietarios?.unidad_asignada === filtros.unidadAsignada
      );
    }
    setResultados(filtrados);
  }, [registros, filtros]);

  const propiedades = [...new Set(copropietarios.map(c => c.propiedad))].sort();
  const unidadesFiltradas = filtros.propiedad
    ? [...new Set(copropietarios.filter(c => c.propiedad === filtros.propiedad).map(c => c.unidad_asignada))]
    : [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'propiedad' && { unidadAsignada: '' })
    }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      fechaInicio: '',
      fechaFin: '',
      placa: '',
      propiedad: '',
      unidadAsignada: '',
      tipoVehiculo: ''
    });
    setResultados(registros);
  };

  // --- Exportar a PDF ---
  const columnasPDF = [
    {
      key: 'fecha_hora_ingreso',
      header: 'Fecha/Hora',
      formatter: v => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : ''
    },
    { key: 'placa_vehiculo', header: 'Placa' },
    { key: 'tipo_vehiculo', header: 'Tipo', formatter: v => v ? v[0].toUpperCase() + v.slice(1) : '' },
    { key: 'observaciones', header: 'Observaciones' },
    { key: 'monto', header: 'Monto', formatter: v => v !== undefined ? `$${Number(v).toFixed(2)}` : '-' },
    { key: 'gratis', header: 'Gratis', formatter: v => v ? 'Sí' : 'No' },
    { key: 'recaudado', header: 'Recaudado', formatter: v => v ? 'Sí' : 'No' },
    { key: 'fecha_recaudo', header: 'Fecha Recaudo' },
    {
      key: 'copropietarios',
      header: 'Copropietario',
      formatter: (_, item) =>
        item.copropietarios
          ? `${item.copropietarios.nombre} (${item.copropietarios.propiedad} - ${item.copropietarios.unidad_asignada})`
          : '-'
    },
    {
      key: 'usuarios_app',
      header: 'Registrado por',
      formatter: (_, item) => item.usuarios_app?.nombre || '-'
    }
  ];

  const exportarPDF = () => {
    if (!resultados.length) {
      alert('No hay datos para exportar');
      return;
    }
    setModalExportar(true);
    setNombrePDF('');
  };

  const generarPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const headers = columnasPDF.map(col => col.header);
    const rows = resultados.map(item =>
      columnasPDF.map(col =>
        col.formatter ? col.formatter(item[col.key], item) : item[col.key]
      )
    );
    doc.setFontSize(16);
    doc.text(nombrePDF || 'Reporte de Registros de Parqueadero', 40, 40);
    doc.setFontSize(10);
    doc.text(`Generado: ${dayjs().format('DD/MM/YYYY HH:mm')}`, 40, 60);
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 80,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 40, right: 40 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          data.settings.margin.left,
          doc.internal.pageSize.getHeight() - 10
        );
      }
    });
    doc.save(
      `${(nombrePDF || 'reporte-parqueadero').toLowerCase().replace(/\s/g, '-')}-${dayjs().format('YYYYMMDD-HHmm')}.pdf`
    );
    setModalExportar(false);
  };

  if (loading) return <Loader text="Cargando registros..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="consultas-container">
      <h2>
        <Emoji symbol="📊" label="Consultas" /> Consultas y Reportes de Parqueadero
      </h2>
      <form className="filtros-form" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <label>
              <Emoji symbol="📅" label="Fecha inicio" /> Fecha inicio:
            </label>
            <input type="date" name="fechaInicio" value={filtros.fechaInicio} onChange={handleChange} />
          </div>
          <div>
            <label>
              <Emoji symbol="📅" label="Fecha fin" /> Fecha fin:
            </label>
            <input type="date" name="fechaFin" value={filtros.fechaFin} onChange={handleChange} />
          </div>
          <div>
            <label>
              <Emoji symbol="🚘" label="Placa" /> Placa:
            </label>
            <input type="text" name="placa" value={filtros.placa} onChange={handleChange} placeholder="Ej: PBA1234" />
          </div>
          <div>
            <label>
              <Emoji symbol="🚦" label="Tipo de vehículo" /> Tipo:
            </label>
            <select name="tipoVehiculo" value={filtros.tipoVehiculo} onChange={handleChange}>
              <option value="">Todos</option>
              <option value="carro">Carro</option>
              <option value="moto">Moto</option>
            </select>
          </div>
          <div>
            <label>
              <Emoji symbol="🏠" label="Propiedad" /> Propiedad:
            </label>
            <select name="propiedad" value={filtros.propiedad} onChange={handleChange}>
              <option value="">Todas</option>
              {propiedades.map(prop => (
                <option key={prop} value={prop}>{prop}</option>
              ))}
            </select>
          </div>
          <div>
            <label>
              <Emoji symbol="🔢" label="Unidad" /> Unidad:
            </label>
            <select name="unidadAsignada" value={filtros.unidadAsignada} onChange={handleChange} disabled={!filtros.propiedad}>
              <option value="">Todas</option>
              {unidadesFiltradas.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="bg-blue-50 text-blue-700 rounded px-4 py-2 mb-2" style={{ maxWidth: 500 }}>
            <Emoji symbol="ℹ️" label="info" /> El filtrado es <b>automático</b>.
          </div>
          <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={limpiarFiltros}>
            <Emoji symbol="♻️" label="Limpiar" /> Limpiar
          </button>
          <button type="button" className="bg-green-600 text-white px-4 py-2 rounded ml-2" onClick={exportarPDF}>
            <Emoji symbol="📄" label="Exportar a PDF" /> Exportar a PDF
          </button>
        </div>
      </form>

      {/* Semáforo de resumen */}
      <div style={{ marginBottom: 24 }}>
        <SemaforoResumen
          registros={resultados}
          customLabels={{
            recaudado: 'Recaudado',
            pendiente: 'Pendiente',
            gratis: 'Gratis',
            cantidad: 'Registros',
            total: 'Total'
          }}
          colorFondo="rgba(243, 244, 246, 0.5)"
        />
      </div>

      {/* Tabla de resultados usando ListaRegistros */}
      <div className="resultados-table-container" style={{ overflowX: 'auto', marginTop: 18 }}>
        <ListaRegistros
          registros={registros}
          filtros={filtros}
          loading={loading}
          error={error}
          onRegistrosFiltradosChange={setResultados}
        />
      </div>

      {/* Modal para exportar PDF */}
      {modalExportar && (
        <Modal isOpen={modalExportar} onClose={() => setModalExportar(false)}>
          <div style={{ padding: 24 }}>
            <h3 className="text-lg font-semibold mb-4">Nombre del archivo PDF</h3>
            <input
              type="text"
              value={nombrePDF}
              onChange={e => setNombrePDF(e.target.value)}
              placeholder="Ej: Reporte Mayo 2025"
              className="border rounded px-3 py-2 w-full mb-4"
            />
            <button
              className="bg-green-600 text-white px-4 py-2 rounded mr-2"
              onClick={generarPDF}
            >
              Generar PDF
            </button>
            <button
              className="bg-gray-400 text-white px-4 py-2 rounded"
              onClick={() => setModalExportar(false)}
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
