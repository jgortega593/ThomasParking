// src/components/ListaRegistros.jsx
import React, { useMemo } from 'react';
import Emoji from './Emoji';
import Loader from './Loader';
import dayjs from 'dayjs';
import useOnlineStatus from '../hooks/useOnlineStatus';

/**
 * ListaRegistros
 * Props:
 * - registros: array de registros a mostrar
 * - filtros: objeto de filtros aplicados
 * - loading: boolean
 * - error: string
 * - onRegistrosFiltradosChange: función (opcional)
 * - onEditar: función(registro) => void (opcional)
 * - onEliminar: función(registro) => void (opcional)
 */
export default function ListaRegistros({
  registros = [],
  filtros = {},
  loading,
  error,
  onRegistrosFiltradosChange,
  onEditar,
  onEliminar
}) {
  const isOnline = useOnlineStatus();

  // Filtrado memoizado
  const registrosFiltrados = useMemo(() => {
    return registros.filter(reg => {
      const fechaRegistro = dayjs(reg.fecha_hora_ingreso);
      const cumpleFechaInicio = !filtros.fechaInicio || fechaRegistro.isAfter(dayjs(filtros.fechaInicio).startOf('day'));
      const cumpleFechaFin = !filtros.fechaFin || fechaRegistro.isBefore(dayjs(filtros.fechaFin).endOf('day'));
      const cumplePlaca = !filtros.placa || reg.placa_vehiculo.toLowerCase().includes(filtros.placa.toLowerCase());
      const cumpleTipo = !filtros.tipoVehiculo || reg.tipo_vehiculo === filtros.tipoVehiculo;
      const cumplePropiedad = !filtros.propiedad || reg.copropietarios?.propiedad === filtros.propiedad;
      const cumpleUnidad = !filtros.unidadAsignada || reg.copropietarios?.unidad_asignada === filtros.unidadAsignada;
      return cumpleFechaInicio && cumpleFechaFin && cumplePlaca && cumpleTipo && cumplePropiedad && cumpleUnidad;
    });
  }, [registros, filtros]);

  // Notificar cambios al padre solo si cambia el array
  React.useEffect(() => {
    if (onRegistrosFiltradosChange) onRegistrosFiltradosChange(registrosFiltrados);
    // eslint-disable-next-line
  }, [registrosFiltrados]);

  // Miniaturas de fotos
  const FotosCell = ({ foto_url }) => {
    let fotos = [];
    if (Array.isArray(foto_url)) {
      fotos = foto_url.filter(url => url && url.trim() !== '');
    } else if (typeof foto_url === 'string' && foto_url.trim() !== '') {
      fotos = [foto_url];
    }
    if (fotos.length === 0) {
      return <span style={{ color: '#ef4444', fontSize: 22 }}><Emoji symbol="❌" label="Sin fotos" /></span>;
    }
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', minWidth: 44 }}>
        <span style={{
          position: 'absolute',
          top: -8,
          right: -8,
          background: '#2563eb',
          color: 'white',
          borderRadius: '9999px',
          fontSize: 12,
          width: 20,
          height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          boxShadow: '0 1px 4px #0003'
        }}>
          {fotos.length}
        </span>
        {fotos.slice(0, 3).map((url, idx) => (
          <a
            key={idx}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              marginRight: 2,
              marginLeft: idx === 0 ? 0 : -8,
              zIndex: 3 - idx,
              borderRadius: 6,
              border: '1.5px solid #e5e7eb',
              boxShadow: '0 2px 4px rgba(0,0,0,0.13)',
              overflow: 'hidden'
            }}
            title={`Evidencia ${idx + 1}`}
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
        {fotos.length > 3 && (
          <span style={{ marginLeft: 4, fontSize: 13, fontWeight: 600, color: '#2563eb' }}>
            +{fotos.length - 3}
          </span>
        )}
      </div>
    );
  };

  if (loading) return <Loader text="Cargando registros..." />;
  if (error) return <div className="error-message" role="alert">{error}</div>;

  return (
    <div className="lista-registros-container">
      <div style={{ overflowX: 'auto' }}>
        <table className="registros-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th><Emoji symbol="⏱️" /> Fecha/Hora</th>
              <th><Emoji symbol="📷" /> Fotos</th>
              <th><Emoji symbol="🚘" /> Placa</th>
              <th><Emoji symbol="🚦" /> Tipo</th>
              <th><Emoji symbol="📝" /> Observaciones</th>
              <th><Emoji symbol="🆓" /> Gratis</th>
              <th><Emoji symbol="🔗" /> Recaudado</th>
              <th><Emoji symbol="🏠" /> Copropietario</th>
              <th><Emoji symbol="🔊" /> Audio</th>
              <th><Emoji symbol="👤" /> Registrado por</th>
              <th><Emoji symbol="⚙️" /> Acciones</th>
            </tr>
          </thead>
          <tbody>
            {registrosFiltrados.length > 0 ? (
              registrosFiltrados.map(reg => (
                <tr key={reg.id}>
                  <td>{reg.fecha_hora_ingreso ? dayjs(reg.fecha_hora_ingreso).format('DD/MM/YYYY HH:mm') : ''}</td>
                  <td><FotosCell foto_url={reg.foto_url} /></td>
                  <td>{reg.placa_vehiculo}</td>
                  <td>
                    {reg.tipo_vehiculo === 'carro' && <><Emoji symbol="🚙" label="Carro" /> </>}
                    {reg.tipo_vehiculo === 'moto' && <><Emoji symbol="🛵" label="Moto" /> </>}
                  </td>
                  <td>{reg.observaciones || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    {reg.gratis ? <Emoji symbol="🆓" label="Gratis" /> : <Emoji symbol="❌" label="No gratis" />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {reg.recaudado ? <Emoji symbol="✅" label="Sí" /> : <Emoji symbol="⏳" label="No" />}
                  </td>
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
                  <td style={{ textAlign: 'center' }}>
                    {reg.observacion_audio_url && reg.observacion_audio_url !== 'pendiente-sync' ? (
                      <audio controls style={{ width: 90 }}>
                        <source src={reg.observacion_audio_url} type="audio/webm" />
                        Tu navegador no soporta audio.
                      </audio>
                    ) : (
                      <span style={{ color: '#aaa', fontSize: 14 }}>-</span>
                    )}
                  </td>
                  <td>{reg.usuario?.nombre || reg.usuarios_app?.nombre || '-'}</td>
                  <td>
                    <button
                      title="Editar"
                      disabled={!isOnline}
                      style={{ marginRight: 6, cursor: isOnline ? 'pointer' : 'not-allowed' }}
                      onClick={() => onEditar && onEditar(reg)}
                    >
                      <Emoji symbol="✏️" label="Editar" />
                    </button>
                    <button
                      title="Eliminar"
                      disabled={!isOnline}
                      style={{ cursor: isOnline ? 'pointer' : 'not-allowed' }}
                      onClick={() => onEliminar && onEliminar(reg)}
                    >
                      <Emoji symbol="🗑️" label="Eliminar" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="sin-resultados">
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
