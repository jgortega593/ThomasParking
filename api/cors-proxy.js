// api/cors-proxy.js
export default async (req) => {
  const SUPA_URL = "https://rzukcljmurnjkmjjfrbc.supabase.co";
  const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6dWtjbGptdXJuamttampmcmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyNTIzMzAsImV4cCI6MjA2MDgyODMzMH0.aYRf0kIdeTtCGSUjsijAmIuxqcGOCX4gQKRae0zxAac";

  const allowedOrigins = [
    "https://thomas-parking.vercel.app",
    "http://localhost:5173"
  ];

  const origin = req.headers.get("origin") || "";
  const isAllowedOrigin = allowedOrigins.includes(origin);

  // Manejar preflight (OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": isAllowedOrigin ? origin : allowedOrigins[0],
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": req.headers.get("Access-Control-Request-Headers") || "apikey, authorization, content-type",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  try {
    // Construir URL de destino en Supabase
    const url = new URL(req.url);
    const supabasePath = url.pathname.replace("/api/cors-proxy/", "/rest/v1/");
    const targetUrl = new URL(supabasePath + url.search, SUPA_URL);

    // Clonar headers y agregar credenciales
    const headers = new Headers(req.headers);
    headers.delete("origin");
    headers.delete("referer");
    headers.set("apikey", SUPA_KEY);
    headers.set("Authorization", `Bearer ${SUPA_KEY}`);

    // Clonar la solicitud
    const requestOptions = {
      method: req.method,
      headers: headers,
      body: req.body
    };

    const response = await fetch(targetUrl, requestOptions);
    const data = await response.json();

    // Clonar respuesta para modificar headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", isAllowedOrigin ? origin : allowedOrigins[0]);
    responseHeaders.set("Vary", "Origin");

    return new Response(JSON.stringify(data), {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(JSON.stringify({
      error: error.message,
      code: error.code
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowedOrigins[0]
      }
    });
  }
};
