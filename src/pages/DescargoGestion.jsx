import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import supabase from "../supabaseClient";
import dayjs from "dayjs";
import SemaforoDescargos from '../components/SemaforoDescargos';


// Error Boundary para capturar errores en el componente
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Error en DescargoGestion:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: "#b91c1c", padding: 20 }}>
          ⚠️ Ha ocurrido un error al cargar el componente. Por favor recargue la página.
        </div>
      );
    }
    return this.props.children;
  }
}

// Polyfill para crypto.randomUUID si no existe
if (typeof window !== "undefined" && (!window.crypto || !window.crypto.randomUUID)) {
  if (!window.crypto) window.crypto = {};
  window.crypto.randomUUID = function () {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}

const Emoji = ({ symbol, label }) => (
  <span role="img" aria-label={label || ""} style={{ marginRight: 6 }}>
    {symbol}
  </span>
);

const AdjuntosPreview = ({ archivos, onRemove }) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {archivos &&
      archivos.map((archivo, idx) => {
        // Adaptar: si archivo es string, se convierte a objeto {url}
        const url = typeof archivo === "string" ? archivo : archivo.url;
        const name = archivo.name || `Archivo ${idx + 1}`;
        const type = archivo.type || "";
        const isImage =
          type.startsWith("image/") ||
          /\.(jpe?g|png|gif|bmp|webp)$/i.test(url);

        return (
          <div key={idx} style={{ position: "relative", width: 70, textAlign: "center" }}>
            {onRemove && (
              <button
                onClick={() => onRemove(idx)}
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: 20,
                  height: 20,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                }}
                title="Eliminar archivo"
              >
                ×
              </button>
            )}
            {isImage ? (
              <img
                src={url}
                alt={name}
                style={{
                  width: 70,
                  height: 70,
                  objectFit: "cover",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                }}
              />
            ) : (
              <div
                style={{
                  width: 70,
                  height: 70,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f0f0f0",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  fontSize: 28,
                  color: "#666",
                }}
              >
                📄
              </div>
            )}
            <a
              href={url}
              download={name}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                fontSize: 11,
                marginTop: 4,
                color: "#0366d6",
                textDecoration: "none",
                wordBreak: "break-word",
              }}
            >
              {name.length > 15 ? name.slice(0, 12) + "..." : name}
            </a>
          </div>
        );
      })}
  </div>
);

function DescargoGestionComponent() {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      descripcion: "",
      fecha: new Date(),
      esfuerzo: [],
      monto: "",
      horas: "",
      materiales: "",
      observaciones: "",
      archivos: [],
    },
  });

  const [mensaje, setMensaje] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [archivosPreview, setArchivosPreview] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [errorRegistros, setErrorRegistros] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editRow, setEditRow] = useState({});

  const esfuerzosDisponibles = [
    { valor: "económico", etiqueta: "💲 Económico" },
    { valor: "participativo", etiqueta: "🤝 Participativo" },
    { valor: "utilitarios", etiqueta: "🛠️ Utilitarios" },
  ];

  const archivos = watch("archivos");

  useEffect(() => {
    if (!archivos || archivos.length === 0) {
      setArchivosPreview([]);
      return;
    }
    const previews = Array.from(archivos).map((file) => ({
      url: URL.createObjectURL(file),
      name: file.name,
      type: file.type,
    }));
    setArchivosPreview(previews);
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line
  }, [archivos]);

  const fetchRegistros = async () => {
    setLoadingRegistros(true);
    setErrorRegistros(null);
    try {
      const { data, error } = await supabase
        .from("descargos_gestion")
        .select("*")
        .order("fecha", { ascending: false });
      if (error) throw error;
      setRegistros(data || []);
    } catch (error) {
      setErrorRegistros(error.message);
    } finally {
      setLoadingRegistros(false);
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, []);

  const handleArchivos = (e) => {
    const files = Array.from(e.target.files);
    setValue("archivos", files, { shouldValidate: true });
  };

  // --- CREAR NUEVO REGISTRO ---
  const onSubmit = async (data) => {
    setMensaje("");
    setSubiendo(true);

    try {
      let archivosUrls = [];
      if (data.archivos && data.archivos.length > 0) {
        for (const file of data.archivos) {
          const ext = file.name.split(".").pop();
          const nombre = `descargo_${Date.now()}_${window.crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("descargos-evidencias")
            .upload(nombre, file, { upsert: false });
          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from("descargos-evidencias")
            .getPublicUrl(nombre);
          archivosUrls.push(urlData.publicUrl); // SOLO URL
        }
      }

      const nuevoRegistro = {
        descripcion: data.descripcion,
        fecha: data.fecha.toISOString(),
        esfuerzo: data.esfuerzo,
        monto: data.monto ? Number(data.monto) : null,
        horas: data.horas ? Number(data.horas) : null,
        materiales: data.materiales || null,
        observaciones: data.observaciones || null,
        archivos: archivosUrls, // SOLO ARRAY DE URLS
      };

      const { error: insertError } = await supabase
        .from("descargos_gestion")
        .insert([nuevoRegistro]);
      if (insertError) throw insertError;

      setMensaje("✅ Descargo registrado exitosamente.");
      reset();
      setArchivosPreview([]);
      fetchRegistros();
    } catch (error) {
      setMensaje(`⚠️ Error: ${error.message}`);
    } finally {
      setSubiendo(false);
    }
  };

  // --- AGREGAR ARCHIVOS AL EDITAR ---
  const handleEditFiles = async (e) => {
    const files = Array.from(e.target.files);
    const nuevosArchivos = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const nombre = `descargo_${Date.now()}_${window.crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("descargos-evidencias")
        .upload(nombre, file, { upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("descargos-evidencias")
        .getPublicUrl(nombre);
      nuevosArchivos.push(urlData.publicUrl); // SOLO URL
    }
    setEditRow((prev) => ({
      ...prev,
      archivos: [...(prev.archivos || []), ...nuevosArchivos], // SOLO URLS
    }));
  };

  // --- ELIMINAR ARCHIVO EN EDICIÓN ---
  const handleRemoveFile = (index) => {
    setEditRow((prev) => ({
      ...prev,
      archivos: prev.archivos.filter((_, i) => i !== index),
    }));
  };

  // --- GUARDAR EDICIÓN ---
  const guardarEdicion = async () => {
    try {
      await supabase
        .from("descargos_gestion")
        .update({
          ...editRow,
          fecha: editRow.fecha.toISOString(),
          archivos: editRow.archivos, // SOLO URLS
        })
        .eq("id", editId);
      fetchRegistros();
      setEditId(null);
    } catch (error) {
      setMensaje(`❌ Error al actualizar: ${error.message}`);
    }
  };

  // --- ADAPTADOR PARA PREVIEW ---
  const archivosPreviewAdapt = (arr) =>
    arr?.map((a) => (typeof a === "string" ? { url: a } : a)) || [];

  // --- MANEJO DE ESFUERZO EN EDICIÓN ---
  const handleEditEsfuerzo = (e) => {
    const { options } = e.target;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) selected.push(options[i].value);
    }
    setEditRow((prev) => ({
      ...prev,
      esfuerzo: selected,
    }));
  };

  return (
    <div
      className="descargo-gestion-container"
      style={{
        background: "var(--surface)",
        color: "var(--text)",
        minHeight: "100vh",
        padding: "2rem"
      }}
    >
      <h2
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontWeight: 700,
          fontSize: "1.6rem",
          marginBottom: 16,
        }}
      >
        <Emoji symbol="📝" /> Descargo de Gestión
      </h2>
      <SemaforoDescargos />

      <form
        onSubmit={handleSubmit(onSubmit)}
        autoComplete="off"
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
        noValidate
      >
        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
            <Emoji symbol="📄" /> Descripción del descargo *
          </label>
          <textarea
            {...register("descripcion", { required: "Campo obligatorio" })}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: errors.descripcion ? "2px solid #dc2626" : "1px solid #94a3b8",
              minHeight: 100,
            }}
            placeholder="Detalle las actividades realizadas..."
          />
          {errors.descripcion && (
            <span style={{ color: "#dc2626", fontSize: 14 }}>
              {errors.descripcion.message}
            </span>
          )}
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
            <Emoji symbol="📅" /> Fecha del descargo *
          </label>
          <Controller
            control={control}
            name="fecha"
            rules={{ required: true }}
            render={({ field }) => (
              <DatePicker
                selected={field.value}
                onChange={(date) => field.onChange(date)}
                dateFormat="dd/MM/yyyy"
                className="custom-datepicker"
                showTimeSelect
              />
            )}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
            <Emoji symbol="💪" /> Tipo de esfuerzo *
          </label>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {esfuerzosDisponibles.map((esfuerzo) => (
              <label key={esfuerzo.valor} style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  value={esfuerzo.valor}
                  {...register("esfuerzo", {
                    validate: (value) =>
                      value.length > 0 || "Seleccione al menos un tipo de esfuerzo",
                  })}
                  style={{ marginRight: 6 }}
                />
                {esfuerzo.etiqueta}
              </label>
            ))}
          </div>
          {errors.esfuerzo && (
            <span style={{ color: "#dc2626", fontSize: 14 }}>
              {errors.esfuerzo.message}
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
              <Emoji symbol="💲" /> Monto económico (opcional)
            </label>
            <input
              type="number"
              {...register("monto")}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #94a3b8",
              }}
              placeholder="Ingrese el monto en USD"
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
              <Emoji symbol="⏳" /> Horas invertidas (opcional)
            </label>
            <input
              type="number"
              {...register("horas")}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #94a3b8",
              }}
              placeholder="Horas totales"
            />
          </div>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
            <Emoji symbol="🛠️" /> Materiales utilizados (opcional)
          </label>
          <input
            type="text"
            {...register("materiales")}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #94a3b8",
            }}
            placeholder="Liste los materiales separados por comas"
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
            <Emoji symbol="📋" /> Observaciones adicionales (opcional)
          </label>
          <textarea
            {...register("observaciones")}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #94a3b8",
              minHeight: 80,
            }}
            placeholder="Agregue cualquier comentario adicional..."
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
            <Emoji symbol="📎" /> Adjuntar evidencias (opcional)
          </label>
          <input
            type="file"
            multiple
            onChange={handleArchivos}
            accept="image/*,audio/*"
            style={{ marginBottom: 12 }}
          />
          <AdjuntosPreview archivos={archivosPreview} />
        </div>

        <button
          type="submit"
          className="btn-modern"
          disabled={isSubmitting || subiendo}
          style={{
            backgroundColor: "#4338ca",
            color: "white",
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            fontSize: 16,
            cursor: isSubmitting || subiendo ? "not-allowed" : "pointer",
            opacity: isSubmitting || subiendo ? 0.6 : 1,
            transition: "background-color 0.3s",
          }}
        >
          {subiendo ? "Enviando..." : "Registrar Descargo"}
        </button>
        {mensaje && (
          <div
            style={{
              marginTop: 8,
              color: mensaje.startsWith("✅") ? "#16a34a" : "#b91c1c",
              fontWeight: 500,
            }}
          >
            {mensaje}
          </div>
        )}
      </form>

      <div style={{ marginTop: 48, overflowX: "auto" }}>
        <h3 style={{ fontSize: "1.3rem", marginBottom: 16 }}>
          <Emoji symbol="📋" /> Registros existentes
        </h3>

        {loadingRegistros ? (
          <div>Cargando registros...</div>
        ) : errorRegistros ? (
          <div style={{ color: "#dc2626" }}>Error: {errorRegistros}</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ backgroundColor: "#e0e7ff" }}>
                <th style={{ padding: 12 }}>Fecha</th>
                <th style={{ padding: 12 }}>Descripción</th>
                <th style={{ padding: 12 }}>Esfuerzo</th>
                <th style={{ padding: 12 }}>Monto</th>
                <th style={{ padding: 12 }}>Archivos</th>
                <th style={{ padding: 12 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((reg) =>
                editId === reg.id ? (
                  <tr key={reg.id} style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <td style={{ padding: 12 }}>
                      <DatePicker
                        selected={editRow.fecha}
                        onChange={(date) => setEditRow((prev) => ({ ...prev, fecha: date }))}
                        dateFormat="dd/MM/yyyy"
                        showTimeSelect
                      />
                    </td>
                    <td style={{ padding: 12 }}>
                      <input
                        name="descripcion"
                        value={editRow.descripcion}
                        onChange={e => setEditRow(prev => ({ ...prev, descripcion: e.target.value }))}
                        style={{ width: "100%" }}
                      />
                    </td>
                    <td style={{ padding: 12 }}>
                      <select
                        name="esfuerzo"
                        value={editRow.esfuerzo}
                        onChange={handleEditEsfuerzo}
                        multiple
                        style={{ width: "100%" }}
                      >
                        {esfuerzosDisponibles.map((esf) => (
                          <option key={esf.valor} value={esf.valor}>
                            {esf.etiqueta}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
        {/* NUEVO: Columna monto */}
        {reg.monto !== undefined && reg.monto !== null
          ? `$${Number(reg.monto).toLocaleString()}`
          : ""}
      </td>
                    <td style={{ padding: 12 }}>
                      <input
                        type="file"
                        multiple
                        onChange={handleEditFiles}
                        style={{ marginBottom: 8 }}
                      />
                      <AdjuntosPreview archivos={archivosPreviewAdapt(editRow.archivos)} onRemove={handleRemoveFile} />
                    </td>
                    <td style={{ padding: 12 }}>
                      <button
                        onClick={guardarEdicion}
                        style={{ marginRight: 8, background: "none", border: "none", cursor: "pointer" }}
                        title="Guardar"
                      >
                        💾
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                        title="Cancelar"
                      >
                        ❌
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={reg.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: 12 }}>{dayjs(reg.fecha).format("DD/MM/YYYY HH:mm")}</td>
                    <td style={{ padding: 12 }}>{reg.descripcion}</td>
                    <td style={{ padding: 12 }}>
                      {reg.esfuerzo?.map(
                        (e) => esfuerzosDisponibles.find((esf) => esf.valor === e)?.etiqueta
                      ).join(", ")}
                    </td>
                     <td>${Number(reg.monto).toLocaleString()}</td>
                    <td style={{ padding: 12 }}>
                      <AdjuntosPreview archivos={archivosPreviewAdapt(reg.archivos)} />
                    </td>
                    <td style={{ padding: 12 }}>
                      <button
                        onClick={() => setEditId(reg.id) || setEditRow({ ...reg, fecha: new Date(reg.fecha) })}
                        style={{ marginRight: 8, background: "none", border: "none", cursor: "pointer" }}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleEliminar(reg.id)}
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Exportar el componente envuelto en ErrorBoundary
export default function DescargoGestion() {
  return (
    <ErrorBoundary>
      <DescargoGestionComponent />
    </ErrorBoundary>
  );
}
