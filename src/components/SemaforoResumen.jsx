import React from "react";
import Emoji from "./Emoji";

export default function SemaforoResumen({ registros = [] }) {
  const resumen = registros.reduce(
    (acc, reg) => {
      // Cálculo de compensados (monto=0 y fecha_gratis no nula)
      if (reg.monto === 0 && reg.fecha_gratis) {
        const tipo = (reg.tipo_vehiculo || "").toLowerCase();
        acc.compensadoValor += tipo === "moto" ? 0.5 : 1; // 1 por carro, 0.5 por moto
        acc.compensadoCount += 1; // Contador de registros
      }
      
      // Resto de cálculos
      if (reg.gratis) acc.gratis++;
      else if (reg.recaudado) acc.recaudado += Number(reg.monto || 0);
      else acc.pendiente += Number(reg.monto || 0);
      acc.total += Number(reg.monto || 0);
      acc.cantidad++;
      return acc;
    },
    { 
      recaudado: 0, 
      pendiente: 0, 
      gratis: 0, 
      compensadoValor: 0,
      compensadoCount: 0,
      total: 0, 
      cantidad: 0 
    }
  );

  const porcentajeRecaudado = resumen.total > 0 
    ? ((resumen.recaudado / resumen.total) * 100).toFixed(1) 
    : 0;

  const cards = [
    {
      emoji: "💰",
      label: "Recaudado",
      value: `$${resumen.recaudado.toFixed(2)}`,
      bg: "rgba(16, 185, 129, 0.15)",
      color: "#10b981",
    },
    {
      emoji: "⏳",
      label: "Pendiente",
      value: `$${resumen.pendiente.toFixed(2)}`,
      bg: "rgba(234, 179, 8, 0.15)",
      color: "#eab308",
    },
    {
      emoji: "🤝",
      label: "Compensado",
      value: `$${resumen.compensadoValor.toFixed(2)} (${resumen.compensadoCount})`,
      bg: "rgba(99, 102, 241, 0.15)",
      color: "#6366f1",
    },
    {
      emoji: "🆓",
      label: "Gratis",
      value: resumen.gratis,
      bg: "rgba(59, 130, 246, 0.15)",
      color: "#3b82f6",
    },
    {
      emoji: "📋",
      label: "Total",
      value: `$${resumen.total.toFixed(2)}`,
      bg: "rgba(139, 92, 246, 0.15)",
      color: "#8b5cf6",
    },
    {
      emoji: "🧾",
      label: "Registros",
      value: resumen.cantidad,
      bg: "rgba(156, 163, 175, 0.15)",
      color: "#4b5563",
    }
  ];

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        borderRadius: "16px",
        padding: "6px 4px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        margin: "8px 0",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Barra de progreso */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "2px",
          background: "linear-gradient(90deg, #10b981 0%, #3b82f6 100%)",
          width: `${porcentajeRecaudado}%`,
          transition: "width 0.5s ease",
        }}
      />

      {/* Tarjetas en fila horizontal */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          overflowX: "auto",
          paddingBottom: "2px",
          scrollbarWidth: "thin",
        }}
      >
        {cards.map((card, idx) => (
          <div
            key={idx}
            style={{
              flex: "0 0 auto",
              minWidth: "80px",
              background: card.bg,
              borderRadius: "8px",
              padding: "4px 6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "2px", marginBottom: "1px" }}>
              <Emoji symbol={card.emoji} />
              <span style={{ fontSize: "1rem", fontWeight: 700, color: card.color }}>
                {card.value}
              </span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", textAlign: "center", whiteSpace: "nowrap" }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", color: "#475569", fontSize: "0.7rem", marginTop: "4px" }}>
        ← Desliza para ver más →
      </div>
    </div>
  );
}
