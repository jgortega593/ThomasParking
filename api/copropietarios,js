// src/services/copropietarios.js
export async function fetchCopropietariosSeguro() {
  try {
    const response = await fetch('/api/cors-proxy/copropietarios');
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error HTTP ${response.status}: ${text}`);
    }
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error("Respuesta no es JSON: " + text);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error cargando copropietarios:", error.message);
    throw error;
  }
}
