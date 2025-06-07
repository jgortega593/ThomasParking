import React, { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import supabase from "../supabaseClient";
import dayjs from "dayjs";
import ExportarPDF from "../components/ExportarPDF";
import ListaRegistros from "../components/ListaRegistros";
import SemaforoResumen from "../components/SemaforoResumen";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import Modal from "../components/Modal";

export default function Consultas() {
  const { user } = useUser();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtros, setFiltros] = useState({
    fechaInicio: "",
    fechaFin: "",
    placa: "",
    tipoVehiculo: "",
    propiedad: "",
    unidadAsignada: "",
  });
  const [copropietarios, setCopropietarios] = useState([]);
  const [modalEditar, setModalEditar] = useState(null);
  const [modalEliminar, setModalEliminar] = useState(null);
  const [procesando, setProcesando] = useState(false);

  // Columnas para PDF
  const columnasPDF = [
    { header: "Fecha", key: "fecha_hora_ingreso", formatter: (v) => dayjs(v).format("DD/MM/YY HH:mm") },
    { header: "Placa", key: "placa_vehiculo" },
    { header: "Tipo", key: "tipo_vehiculo" },
    { header: "Monto", key: "monto", formatter: (v) => `$${Number(v).toFixed(2)}` },
    { header: "Estado", key: "recaudado", formatter: (v) => (v ? "Recaudado" : "Pendiente") },
  ];

  // Cargar registros y copropietarios
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const { data: regs, error: errRegs } = await supabase
          .from("registros_parqueadero")
          .select("*, copropietarios:dependencia_id(propiedad, unidad_asignada), usuarios_app(nombre)")
          .order("fecha_hora_ingreso", { ascending: false });
        if (errRegs) throw errRegs;
        setRegistros(regs);

        const { data: copros, error: errCopros } = await supabase
          .from("copropietarios")
          .select("propiedad, unidad_asignada, id");
        if (errCopros) throw errCopros;
        setCopropietarios(copros);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  // Lógica de editar registro
  const handleEditarRegistro = (registro) => setModalEditar(registro);

  const handleGuardarEdicion = async (registroEditado) => {
    setProcesando(true);
    try {
      const { error } = await supabase
        .from("registros_parqueadero")
        .update({
          placa_vehiculo: registroEditado.placa_vehiculo,
          tipo_vehiculo: registroEditado.tipo_vehiculo,
          observaciones: registroEditado.observaciones,
          monto: parseFloat(registroEditado.monto),
          recaudado: !!registroEditado.recaudado,
          gratis: !!registroEditado.gratis,
          fecha_hora_ingreso: registroEditado.fecha_hora_ingreso,
          dependencia_id: registroEditado.dependencia_id,
        })
        .eq("id", registroEditado.id);

      if (error) throw error;
      setRegistros((prev) =>
        prev.map((r) =>
          r.id === registroEditado.id
            ? {
                ...r,
                ...registroEditado,
                copropietarios: copropietarios.find((c) => c.id === registroEditado.dependencia_id),
              }
            : r
        )
      );
      setModalEditar(null);
    } catch (error) {
      alert("Error al guardar cambios: " + error.message);
    } finally {
      setProcesando(false);
    }
  };

  // Lógica de eliminar registro
  const handleEliminarRegistro = (registro) => setModalEliminar(registro);

  const handleConfirmarEliminar = async () => {
    if (!modalEliminar) return;
    setProcesando(true);
    try {
      const { error } = await supabase
        .from("registros_parqueadero")
        .delete()
        .eq("id", modalEliminar.id);
      if (error) throw error;
      setRegistros((registros) => registros.filter((r) => r.id !== modalEliminar.id));
      setModalEliminar(null);
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    } finally {
      setProcesando(false);
    }
  };

  // Opciones únicas para selects
  const propiedades = [...new Set(copropietarios.map((c) => c.propiedad))].sort();
  const unidades = filtros.propiedad
    ? [...new Set(copropietarios.filter((c) => c.propiedad === filtros.propiedad).map((c) => c.unidad_asignada))]
    : [];

  if (loading) return <Loader text="Cargando registros..." />;
  if (error)
    return (
      <div className="error-message" role="alert">
        {error}
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-4">
      {/* Encabezado compacto */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
        <h1 className="text-lg md:text-xl font-bold flex items-center gap-1">
  <span role="img" aria-label="lupa">🔍</span>
  Consulta
</h1>

        <ExportarPDF
          datos={registros}
          columnas={columnasPDF}
          titulo="Reporte de Parqueo"
        />
      </div>

      {/* Filtros ultracompactos y responsivos: 2 por línea en móviles */}
      <div className="bg-white p-2 md:p-3 rounded-lg shadow-md mb-4">
        <div className="grid grid-cols-2 gap-2">
          {/* Fecha Inicio */}
          <div>
            <label className="block text-xs font-medium mb-1">Inicio</label>
            <input
              type="date"
              value={filtros.fechaInicio}
              onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
              className="w-full p-1 text-xs border rounded"
            />
          </div>
          {/* Fecha Fin */}
          <div>
            <label className="block text-xs font-medium mb-1">Fin</label>
            <input
              type="date"
              value={filtros.fechaFin}
              onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
              className="w-full p-1 text-xs border rounded"
            />
          </div>
          {/* Placa */}
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1">Placa</label>
            <input
              type="text"
              placeholder="Buscar..."
              value={filtros.placa}
              onChange={(e) => setFiltros({ ...filtros, placa: e.target.value })}
              className="w-full p-1 text-xs border rounded"
            />
          </div>
          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium mb-1">Tipo</label>
            <select
              value={filtros.tipoVehiculo}
              onChange={(e) => setFiltros({ ...filtros, tipoVehiculo: e.target.value })}
              className="w-full p-1 text-xs border rounded"
            >
              <option value="">Todos</option>
              <option value="carro">Carro</option>
              <option value="moto">Moto</option>
            </select>
          </div>
          {/* Propiedad */}
          <div>
            <label className="block text-xs font-medium mb-1">Propiedad</label>
            <select
              value={filtros.propiedad}
              onChange={(e) => setFiltros({ ...filtros, propiedad: e.target.value, unidadAsignada: "" })}
              className="w-full p-1 text-xs border rounded"
            >
              <option value="">Todas</option>
              {propiedades.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          {/* Unidad */}
          <div>
            <label className="block text-xs font-medium mb-1">Unidad</label>
            <select
              value={filtros.unidadAsignada}
              onChange={(e) => setFiltros({ ...filtros, unidadAsignada: e.target.value })}
              className="w-full p-1 text-xs border rounded"
              disabled={!filtros.propiedad}
            >
              <option value="">Todas</option>
              {unidades.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resumen semáforo compacto */}
      <SemaforoResumen
        registros={registros.filter(
          (reg) =>
            (!filtros.propiedad || reg.copropietarios?.propiedad === filtros.propiedad) &&
            (!filtros.unidadAsignada || reg.copropietarios?.unidad_asignada === filtros.unidadAsignada)
        )}
      />

      {/* Tabla de registros */}
      <ListaRegistros
        registros={registros}
        filtros={filtros}
        loading={loading}
        error={error}
        onEditar={handleEditarRegistro}
        onEliminar={handleEliminarRegistro}
      />

      {/* Modal de edición */}
      {modalEditar && (
        <Modal isOpen={true} onClose={() => setModalEditar(null)}>
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Editar Registro</h2>
            <p className="text-sm text-gray-600 mb-4">Placa: {modalEditar.placa_vehiculo}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Placa</label>
                <input
                  type="text"
                  value={modalEditar.placa_vehiculo}
                  onChange={(e) =>
                    setModalEditar({ ...modalEditar, placa_vehiculo: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={modalEditar.tipo_vehiculo}
                  onChange={(e) =>
                    setModalEditar({ ...modalEditar, tipo_vehiculo: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="carro">Carro</option>
                  <option value="moto">Moto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Observaciones</label>
                <input
                  type="text"
                  value={modalEditar.observaciones || ""}
                  onChange={(e) =>
                    setModalEditar({ ...modalEditar, observaciones: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monto</label>
                <input
                  type="number"
                  value={modalEditar.monto || 0}
                  onChange={(e) =>
                    setModalEditar({ ...modalEditar, monto: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={modalEditar.recaudado}
                  onChange={(e) =>
                    setModalEditar({ ...modalEditar, recaudado: e.target.checked })
                  }
                />
                <span>Recaudado</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={modalEditar.gratis}
                  onChange={(e) =>
                    setModalEditar({ ...modalEditar, gratis: e.target.checked })
                  }
                />
                <span>Gratis</span>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Propiedad</label>
                <select
                  value={modalEditar.dependencia_id}
                  onChange={(e) =>
                    setModalEditar({ ...modalEditar, dependencia_id: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="">Seleccione...</option>
                  {copropietarios.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.propiedad} - {c.unidad_asignada}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setModalEditar(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleGuardarEdicion(modalEditar)}
                  disabled={procesando}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
                >
                  {procesando ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de eliminación */}
      {modalEliminar && (
        <Modal isOpen={true} onClose={() => setModalEliminar(null)}>
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Confirmar Eliminación</h2>
            <p className="mb-4">
              ¿Está seguro de eliminar el registro con placa{" "}
              <strong>{modalEliminar.placa_vehiculo}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalEliminar(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarEliminar}
                disabled={procesando}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded"
                aria-label="Eliminar registro"
              >
                {procesando ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
