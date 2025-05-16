export default async (req) => {
  const SUPA_URL = "https://rzukcljmurnjkmjjfrbc.supabase.co";
  const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6dWtjbGptdXJuamttampmcmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyNTIzMzAsImV4cCI6MjA2MDgyODMzMH0.aYRf0kIdeTtCGSUjsijAmIuxqcGOCX4gQKRae0zxAac";

  // 1. Manejar preflight OPTIONS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "apikey, authorization, content-type",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  // 2. Construir URL de Supabase
  const url = new URL(req.url);
  const supabasePath = url.pathname.replace("/api/cors-proxy/", "/rest/v1/");
  const targetUrl = new URL(supabasePath + url.search, SUPA_URL);

  // 3. Clonar headers y agregar autenticación
  const headers = new Headers(req.headers);
  headers.delete("origin");
  headers.delete("referer");
  headers.set("apikey", SUPA_KEY);
  headers.set("Authorization", `Bearer ${SUPA_KEY}`);

  try {
    // 4. Realizar solicitud a Supabase
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.body
    });

    // 5. Validar respuesta
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Supabase error: ${errorData.message}`);
    }

    // 6. Devolver respuesta con headers CORS
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        ...Object.fromEntries(response.headers)
      }
    });

  } catch (error) {
    // 7. Manejar errores correctamente
    return new Response(JSON.stringify({
      error: error.message,
      code: error.code || "UNKNOWN_ERROR"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
